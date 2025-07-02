// API客户端配置和工具类
import { tokenManager } from '../services/tokenManager';
import { TokenPair, AuthUser } from '../types/auth';

const API_BASE_URL = 'http://localhost:3002/api';

// API响应类型
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 认证响应类型
interface AuthResponse {
  user: AuthUser;
  tokens: TokenPair;
}

// 聊天消息API类型
interface ChatMessageRequest {
  content: string;
  metadata?: any;
}

interface ChatMessageResponse {
  userMessage: {
    id: string;
    content: string;
    role: 'USER';
    timestamp: string;
    metadata?: any;
  };
  assistantMessage: {
    id: string;
    content: string;
    role: 'ASSISTANT';
    timestamp: string;
    metadata?: any;
  };
  aiMetadata?: {
    emotionKeywords: string[];
    supportLevel: string;
  };
}

// 聊天线程类型
interface ChatThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

class ApiClient {
  private static instance: ApiClient | null = null;
  private baseUrl: string;

  private constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    
    // 监听TokenManager事件
    this.setupTokenManagerListeners();
  }

  /**
   * 获取ApiClient单例实例
   */
  public static getInstance(baseUrl?: string): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient(baseUrl);
    }
    return ApiClient.instance;
  }

  /**
   * 设置TokenManager事件监听器
   */
  private setupTokenManagerListeners(): void {
    // 监听认证丢失事件
    tokenManager.on('authentication-lost', () => {
      console.log('🔄 ApiClient: Authentication lost, clearing local state');
    });

    // 监听Token刷新事件
    tokenManager.on('token-refreshed', () => {
      console.log('🔄 ApiClient: Tokens refreshed');
    });

    // 监听刷新失败事件
    tokenManager.on('refresh-failed', ({ error }) => {
      console.error('❌ ApiClient: Token refresh failed:', error);
    });
  }

  /**
   * 通用请求方法
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryOnAuthFailure: boolean = true
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // 从TokenManager获取当前访问Token
    const accessToken = tokenManager.getAccessToken();
    
    if (accessToken) {
      defaultHeaders.Authorization = `Bearer ${accessToken}`;
      console.log('✅ ApiClient: Authorization header added');
    } else {
      console.log('❌ ApiClient: No token available for authorization');
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      console.log(`ApiClient: Making request to: ${url}`);

      const response = await fetch(url, config);
      const data = await response.json();

      console.log('ApiClient: Response received:', data);

      if (!response.ok) {
        // 如果是401错误且有refresh token，尝试刷新
        if (response.status === 401 && tokenManager.getRefreshToken() && retryOnAuthFailure) {
          console.warn('ApiClient: Access token expired, attempting to refresh...');
          
          try {
            await tokenManager.refreshTokens();
            console.log('ApiClient: Token refreshed successfully, retrying request...');
            // 递归调用，但不再重试认证失败
            return this.request<T>(endpoint, options, false);
          } catch (refreshError) {
            console.error('ApiClient: Token refresh failed:', refreshError);
            throw new Error('认证已过期，请重新登录');
          }
        }
        
        // 只有401认证失败才清除Token, 403是权限拒绝不是认证问题
        if (response.status === 401) {
          console.warn('ApiClient: Authentication failed, clearing tokens');
          tokenManager.clearTokens();
        } else if (response.status === 403) {
          console.warn('ApiClient: Access forbidden, but authentication is still valid');
        }
        
        throw new Error(data.error || `${data.message || 'Unknown error'} - ${endpoint}`);
      }

      return data;
    } catch (error) {
      console.error('ApiClient: Request failed:', error);
      
      // 如果是网络错误，提供更友好的错误信息
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('网络连接失败，请检查服务器状态');
      }
      
      throw error;
    }
  }

  // ===== 认证相关API =====

  /**
   * 用户登录
   */
  async login(username: string, password: string): Promise<ApiResponse<AuthResponse>> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    // 如果登录成功，将Token交给TokenManager管理
    if (response.success && response.data?.tokens) {
      tokenManager.setTokens(response.data.tokens);
    }

    return response;
  }

  /**
   * 用户注册
   */
  async register(email: string, password: string, displayName?: string): Promise<ApiResponse<AuthResponse>> {
    const response = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    });

    // 如果注册成功，将Token交给TokenManager管理
    if (response.success && response.data?.tokens) {
      tokenManager.setTokens(response.data.tokens);
    }

    return response;
  }

  /**
   * 用户注销
   */
  async logout(): Promise<ApiResponse> {
    try {
      const response = await this.request('/auth/logout', {
        method: 'POST',
      });
      
      // 无论服务器响应如何，都清除本地Token
      tokenManager.clearTokens();
      
      return response;
    } catch (error) {
      // 即使服务器错误，也要清除本地Token
      tokenManager.clearTokens();
      throw error;
    }
  }

  /**
   * 检查是否已登录
   */
  isAuthenticated(): boolean {
    const status = tokenManager.getTokenStatus();
    return status.isAuthenticated;
  }

  // ===== 系统相关API =====

  /**
   * 健康检查
   */
  async healthCheck(): Promise<ApiResponse> {
    return this.request('/health');
  }

  /**
   * 健康检查（别名方法，提供更详细的响应信息）
   */
  async checkHealth(): Promise<ApiResponse> {
    return this.request('/health');
  }

  // ===== 聊天相关API =====

  /**
   * 创建聊天线程
   */
  async createChatThread(title?: string): Promise<ApiResponse<ChatThread>> {
    return this.request<ChatThread>('/chat/threads', {
      method: 'POST',
      body: JSON.stringify({ title: title || '新对话' }),
    });
  }

  /**
   * 获取聊天线程列表
   */
  async getChatThreads(): Promise<ApiResponse<ChatThread[]>> {
    return this.request<ChatThread[]>('/chat/threads');
  }

  /**
   * 发送聊天消息
   */
  async sendChatMessage(
    threadId: string,
    content: string,
    metadata?: any
  ): Promise<ApiResponse<ChatMessageResponse>> {
    const requestData: ChatMessageRequest = {
      content,
      metadata,
    };

    return this.request<ChatMessageResponse>(
      `/chat/threads/${threadId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify(requestData),
      }
    );
  }

  /**
   * 获取线程消息
   */
  async getThreadMessages(threadId: string): Promise<ApiResponse<any>> {
    return this.request(`/chat/threads/${threadId}`);
  }

  /**
   * 清空聊天线程的所有消息
   */
  async clearThreadMessages(threadId: string): Promise<ApiResponse<{
    deletedMessagesCount: number;
    thread: ChatThread;
  }>> {
    return this.request<{
      deletedMessagesCount: number;
      thread: ChatThread;
    }>(`/chat/threads/${threadId}/messages`, {
      method: 'DELETE',
    });
  }

  // ===== 报告生成相关API =====

  /**
   * 生成聊天报告
   */
  async generateChatReport(
    messages: Array<{ content: string; role: string; timestamp?: string }>,
    threadId?: string
  ): Promise<ApiResponse<{
    report: any; // EmotionAnalysisResult类型
    metadata: {
      userId: string;
      threadId?: string;
      timestamp: string;
      reportFileName: string;
      chatHistoryFileName: string;
      messagesCount: number;
      userMessagesCount: number;
      assistantMessagesCount: number;
    };
  }>> {
    console.log(`🎯 ApiClient: Generating chat report for ${messages.length} messages`);
    
    return this.request<{
      report: any;
      metadata: any;
    }>('/chat/generate-report', {
      method: 'POST',
      body: JSON.stringify({
        messages,
        threadId
      }),
    });
  }

  /**
   * 上传聊天历史记录
   */
  async uploadChatHistory(
    messages: Array<{ content: string; role: string; timestamp?: string }>,
    fileName: string,
    threadId?: string
  ): Promise<ApiResponse<{
    fileName: string;
    uploadPath: string;
    fileSize: number;
    messagesCount: number;
  }>> {
    console.log(`📁 ApiClient: Uploading chat history: ${fileName}`);
    
    return this.request<{
      fileName: string;
      uploadPath: string;
      fileSize: number;
      messagesCount: number;
    }>('/chat/upload-history', {
      method: 'POST',
      body: JSON.stringify({
        messages,
        fileName,
        threadId
      }),
    });
  }

  /**
   * 上传报告
   */
  async uploadReport(
    report: any, // EmotionAnalysisResult类型
    fileName: string,
    threadId?: string
  ): Promise<ApiResponse<{
    fileName: string;
    uploadPath: string;
    fileSize: number;
    emotionsDetected: number;
  }>> {
    console.log(`📊 ApiClient: Uploading report: ${fileName}`);
    
    return this.request<{
      fileName: string;
      uploadPath: string;
      fileSize: number;
      emotionsDetected: number;
    }>('/chat/upload-report', {
      method: 'POST',
      body: JSON.stringify({
        report,
        fileName,
        threadId
      }),
    });
  }

  // ===== Token管理相关方法 =====

  /**
   * 设置认证Token (兼容性方法)
   */
  setTokens(accessToken: string, refreshToken: string): void {
    console.warn('ApiClient.setTokens is deprecated, use TokenManager directly');
    tokenManager.setTokens({ accessToken, refreshToken });
  }

  // ===== 向后兼容方法 =====

  /**
   * 清除Token（向后兼容）
   * @deprecated 使用 tokenManager.clearTokens() 替代
   */
  clearTokens(): void {
    console.warn('ApiClient.clearTokens() is deprecated, use tokenManager.clearTokens() instead');
    tokenManager.clearTokens();
  }

  /**
   * 设置认证Token（向后兼容）
   * @deprecated 使用 tokenManager.setTokens() 替代
   */
  setAuthToken(token: string): void {
    console.warn('ApiClient.setAuthToken() is deprecated, use tokenManager.setTokens() instead');
    // 这里只能设置访问Token，刷新Token留空（不推荐使用这种方式）
    tokenManager.setTokens({ accessToken: token, refreshToken: '' });
  }

  /**
   * 清除认证Token（向后兼容）
   * @deprecated 使用 tokenManager.clearTokens() 替代
   */
  clearAuthToken(): void {
    this.clearTokens();
  }

  // ===== 通用HTTP方法 =====

  /**
   * GET请求
   */
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'GET',
    });
  }

  /**
   * POST请求
   */
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT请求
   */
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE请求
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

// 创建并导出单例实例
const apiClient = ApiClient.getInstance();

export default apiClient;
export { ApiClient };
export type { ApiResponse, ChatMessageRequest, ChatMessageResponse, ChatThread }; 