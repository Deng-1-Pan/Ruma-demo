// 演示版API客户端 - 使用静态数据替代真实API调用
import { demoUser, demoTokens, demoAuthResponse } from '../demo-data/userData';
import { demoChatThreads, demoMessages, demoAIResponses, demoChatReport } from '../demo-data/chatData';
import { demoEmotionAnalysis, demoHistoryData } from '../demo-data/emotionData';

// API响应类型（从原apiClient复制）
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 认证响应类型
interface AuthResponse {
  user: any;
  tokens: any;
}

// 聊天消息响应类型
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

class DemoApiClient {
  private static instance: DemoApiClient | null = null;
  private isLoggedIn: boolean = false;
  private currentThreadId: string = 'thread_001';

  private constructor() {
    // 模拟已登录状态
    this.isLoggedIn = true;
  }

  /**
   * 获取DemoApiClient单例实例
   */
  public static getInstance(): DemoApiClient {
    if (!DemoApiClient.instance) {
      DemoApiClient.instance = new DemoApiClient();
    }
    return DemoApiClient.instance;
  }

  /**
   * 模拟延迟
   */
  private async delay(ms: number = 500): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 生成随机ID
   */
  private generateId(): string {
    return 'demo_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  // ===== 认证相关API =====

  /**
   * 用户登录
   */
  async login(username: string, password: string): Promise<ApiResponse<AuthResponse>> {
    await this.delay(800);
    
    // 模拟登录验证
    if (username === 'demo' && password === 'demo') {
      this.isLoggedIn = true;
      return {
        success: true,
        data: demoAuthResponse,
        message: '登录成功'
      };
    } else {
      return {
        success: false,
        error: '用户名或密码错误'
      };
    }
  }

  /**
   * 用户注册
   */
  async register(email: string, _password: string, displayName?: string): Promise<ApiResponse<AuthResponse>> {
    await this.delay(1000);
    
    // 模拟注册成功
    const newUser = {
      ...demoUser,
      id: this.generateId(),
      email,
      displayName: displayName || '新用户',
      createdAt: new Date().toISOString()
    };

    this.isLoggedIn = true;
    return {
      success: true,
      data: {
        user: newUser,
        tokens: demoTokens
      },
      message: '注册成功'
    };
  }

  /**
   * 用户登出
   */
  async logout(): Promise<ApiResponse> {
    await this.delay(300);
    this.isLoggedIn = false;
    return {
      success: true,
      message: '登出成功'
    };
  }

  /**
   * 检查认证状态
   */
  isAuthenticated(): boolean {
    return this.isLoggedIn;
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<ApiResponse> {
    await this.delay(200);
    return {
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0-demo'
      }
    };
  }

  /**
   * 检查系统健康状态
   */
  async checkHealth(): Promise<ApiResponse> {
    return this.healthCheck();
  }

  // ===== 聊天相关API =====

  /**
   * 创建聊天线程
   */
  async createChatThread(title?: string): Promise<ApiResponse<ChatThread>> {
    await this.delay(300);
    
    const newThread: ChatThread = {
      id: this.generateId(),
      title: title || '新对话',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.currentThreadId = newThread.id;
    return {
      success: true,
      data: newThread
    };
  }

  /**
   * 获取聊天线程列表
   */
  async getChatThreads(): Promise<ApiResponse<ChatThread[]>> {
    await this.delay(400);
    return {
      success: true,
      data: demoChatThreads
    };
  }

  /**
   * 发送聊天消息
   */
  async sendChatMessage(
    _threadId: string,
    content: string,
    metadata?: any
  ): Promise<ApiResponse<ChatMessageResponse>> {
    await this.delay(1200); // 模拟AI思考时间

    const userMessage = {
      id: this.generateId(),
      content,
      role: 'USER' as const,
      timestamp: new Date().toISOString(),
      metadata
    };

    // 随机选择AI回复
    const randomResponse = demoAIResponses[Math.floor(Math.random() * demoAIResponses.length)];
    
    const assistantMessage = {
      id: this.generateId(),
      content: randomResponse,
      role: 'ASSISTANT' as const,
      timestamp: new Date().toISOString(),
      metadata: {
        emotionDetected: ['supportive', 'understanding'],
        supportLevel: 'high'
      }
    };

    return {
      success: true,
      data: {
        userMessage,
        assistantMessage,
        aiMetadata: {
          emotionKeywords: ['理解', '支持', '帮助'],
          supportLevel: 'high'
        }
      }
    };
  }

  /**
   * 获取线程消息
   */
  async getThreadMessages(threadId: string): Promise<ApiResponse<any>> {
    await this.delay(300);
    return {
      success: true,
      data: {
        messages: demoMessages,
        threadId
      }
    };
  }

  /**
   * 清空线程消息
   */
  async clearThreadMessages(_threadId: string): Promise<ApiResponse<{
    deletedMessagesCount: number;
    thread: ChatThread;
  }>> {
    await this.delay(400);
    return {
      success: true,
      data: {
        deletedMessagesCount: 4,
        thread: demoChatThreads[0]
      }
    };
  }

  /**
   * 生成聊天报告
   */
  async generateChatReport(
    messages: Array<{ content: string; role: string; timestamp?: string }>,
    threadId?: string
  ): Promise<ApiResponse<{
    report: any;
    metadata: any;
  }>> {
    await this.delay(2000); // 模拟AI分析时间

    return {
      success: true,
      data: {
        report: demoChatReport,
        metadata: {
          userId: demoUser.id,
          threadId: threadId || this.currentThreadId,
          timestamp: new Date().toISOString(),
          reportFileName: `demo_report_${Date.now()}.json`,
          chatHistoryFileName: `demo_chat_${Date.now()}.json`,
          messagesCount: messages.length,
          userMessagesCount: messages.filter(m => m.role === 'user').length,
          assistantMessagesCount: messages.filter(m => m.role === 'assistant').length
        }
      }
    };
  }

  /**
   * 上传聊天历史
   */
  async uploadChatHistory(
    messages: Array<{ content: string; role: string; timestamp?: string }>,
    fileName: string,
    _threadId?: string
  ): Promise<ApiResponse<{
    fileName: string;
    uploadPath: string;
    fileSize: number;
    messagesCount: number;
  }>> {
    await this.delay(800);

    return {
      success: true,
      data: {
        fileName,
        uploadPath: `/demo-storage/${fileName}`,
        fileSize: JSON.stringify(messages).length,
        messagesCount: messages.length
      }
    };
  }

  /**
   * 上传报告
   */
  async uploadReport(
    report: any,
    fileName: string,
    _threadId?: string
  ): Promise<ApiResponse<{
    fileName: string;
    uploadPath: string;
    fileSize: number;
    emotionsDetected: number;
  }>> {
    await this.delay(600);

    return {
      success: true,
      data: {
        fileName,
        uploadPath: `/demo-storage/${fileName}`,
        fileSize: JSON.stringify(report).length,
        emotionsDetected: 3
      }
    };
  }

  // ===== Token管理方法 =====
  setTokens(_accessToken: string, _refreshToken: string): void {
    // 演示版不需要实际存储token
    console.log('Demo: Tokens set');
  }

  clearTokens(): void {
    // 演示版不需要实际清除token
    console.log('Demo: Tokens cleared');
  }

  setAuthToken(_token: string): void {
    console.log('Demo: Auth token set');
  }

  clearAuthToken(): void {
    console.log('Demo: Auth token cleared');
  }

  // ===== 通用请求方法 =====
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    await this.delay();
    
    // 特殊处理emotion-summaries端点
    if (endpoint.includes('/history/emotion-summaries')) {
      try {
        // 动态导入7月份的模拟数据
        const { generateMonthlyData } = await import('../demo-data/monthlyEmotionData');
        const emotionSummaryData = generateMonthlyData();
        
        console.log(`📊 DemoApiClient: 返回 ${emotionSummaryData.length} 条情绪摘要数据`);
        
        return { 
          success: true, 
          data: emotionSummaryData as T,
          message: 'Demo emotion summaries loaded successfully'
        };
      } catch (error) {
        console.error('Failed to load demo emotion summaries:', error);
        return { 
          success: false, 
          data: [] as T,
          error: 'Failed to load demo data'
        };
      }
    }
    
    // 根据endpoint返回对应的演示数据
    if (endpoint.includes('/emotions/analysis')) {
      return { success: true, data: demoEmotionAnalysis as T };
    } else if (endpoint.includes('/history')) {
      return { success: true, data: demoHistoryData as T };
    }
    
    return { success: true, data: {} as T };
  }

  async post<T>(_endpoint: string, _data?: any): Promise<ApiResponse<T>> {
    await this.delay();
    return { success: true, data: {} as T };
  }

  async put<T>(_endpoint: string, _data?: any): Promise<ApiResponse<T>> {
    await this.delay();
    return { success: true, data: {} as T };
  }

  async delete<T>(_endpoint: string): Promise<ApiResponse<T>> {
    await this.delay();
    return { success: true, data: {} as T };
  }
}

// 导出单例实例
export const demoApiClient = DemoApiClient.getInstance(); 