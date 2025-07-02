import { 
  TokenPair, 
  TokenInfo, 
  TokenStatus, 
  TokenManagerEvents, 
  TokenEventCallback, 
  TokenManagerOptions 
} from '../types/auth';

/**
 * JWT Token 管理器
 * 负责统一管理所有Token相关操作，包括存储、刷新、监控等
 */
export class TokenManager {
  private static instance: TokenManager | null = null;
  
  // 配置选项
  private options: Required<TokenManagerOptions>;
  
  // Token状态
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private lastRefresh: number | null = null;
  
  // 定时器
  private refreshTimer: number | null = null;
  private monitorTimer: number | null = null;
  
  // 事件监听器
  private eventListeners: Map<keyof TokenManagerEvents, TokenEventCallback[]> = new Map();
  
  // 刷新状态
  private isRefreshing = false;
  private refreshPromise: Promise<TokenPair> | null = null;
  
  private constructor(options: TokenManagerOptions = {}) {
    this.options = {
      autoRefresh: true,
      refreshThreshold: 5 * 60 * 1000, // 5分钟
      maxRetries: 3,
      storage: localStorage,
      apiBaseUrl: 'http://localhost:3002/api',
      ...options
    };
    
    // 初始化加载Token
    this.loadTokensFromStorage();
    
    // 启动监控
    if (this.options.autoRefresh) {
      this.startMonitoring();
    }
  }
  
  /**
   * 获取TokenManager单例实例
   */
  public static getInstance(options?: TokenManagerOptions): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager(options);
    }
    return TokenManager.instance;
  }
  
  /**
   * 重置单例实例（主要用于测试）
   */
  public static resetInstance(): void {
    if (TokenManager.instance) {
      TokenManager.instance.destroy();
      TokenManager.instance = null;
    }
  }
  
  /**
   * 从存储中加载Token
   */
  private loadTokensFromStorage(): void {
    try {
      this.accessToken = this.options.storage.getItem('accessToken');
      this.refreshToken = this.options.storage.getItem('refreshToken');
      const lastRefreshStr = this.options.storage.getItem('lastTokenRefresh');
      this.lastRefresh = lastRefreshStr ? parseInt(lastRefreshStr) : null;
      
      console.log('🔧 TokenManager: Loaded tokens from storage', {
        hasAccessToken: !!this.accessToken,
        hasRefreshToken: !!this.refreshToken,
        lastRefresh: this.lastRefresh ? new Date(this.lastRefresh).toISOString() : null
      });
    } catch (error) {
      console.error('❌ TokenManager: Failed to load tokens from storage', error);
      this.clearTokens();
    }
  }
  
  /**
   * 保存Token到存储
   */
  private saveTokensToStorage(): void {
    try {
      if (this.accessToken) {
        this.options.storage.setItem('accessToken', this.accessToken);
      } else {
        this.options.storage.removeItem('accessToken');
      }
      
      if (this.refreshToken) {
        this.options.storage.setItem('refreshToken', this.refreshToken);
      } else {
        this.options.storage.removeItem('refreshToken');
      }
      
      if (this.lastRefresh) {
        this.options.storage.setItem('lastTokenRefresh', this.lastRefresh.toString());
      } else {
        this.options.storage.removeItem('lastTokenRefresh');
      }
      
      console.log('💾 TokenManager: Saved tokens to storage');
    } catch (error) {
      console.error('❌ TokenManager: Failed to save tokens to storage', error);
    }
  }
  
  /**
   * 解析JWT Token获取信息
   */
  private parseTokenInfo(token: string): TokenInfo | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiresAt = payload.exp * 1000; // JWT exp是秒，转为毫秒
      const now = Date.now();
      const willExpireSoon = (expiresAt - now) <= this.options.refreshThreshold;
      
      return {
        token,
        expiresAt,
        isExpired: now >= expiresAt,
        willExpireSoon
      };
    } catch (error) {
      console.error('❌ TokenManager: Failed to parse token', error);
      return null;
    }
  }
  
  /**
   * 设置Token对
   */
  public setTokens(tokens: TokenPair): void {
    console.log('🔧 TokenManager: Setting new tokens');
    
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    this.lastRefresh = Date.now();
    
    this.saveTokensToStorage();
    this.scheduleRefresh();
    
    // 触发事件
    this.emit('token-refreshed', { tokens });
  }
  
  /**
   * 获取当前访问Token
   */
  public getAccessToken(): string | null {
    return this.accessToken;
  }
  
  /**
   * 获取当前刷新Token
   */
  public getRefreshToken(): string | null {
    return this.refreshToken;
  }
  
  /**
   * 获取Token状态
   */
  public getTokenStatus(): TokenStatus {
    const accessTokenInfo = this.accessToken ? this.parseTokenInfo(this.accessToken) : null;
    const refreshTokenInfo = this.refreshToken ? this.parseTokenInfo(this.refreshToken) : null;
    
    const isAuthenticated = !!(this.accessToken && this.refreshToken && 
      accessTokenInfo && !accessTokenInfo.isExpired &&
      refreshTokenInfo && !refreshTokenInfo.isExpired);
    
    const needsRefresh = !!(accessTokenInfo && 
      (accessTokenInfo.willExpireSoon || accessTokenInfo.isExpired) &&
      refreshTokenInfo && !refreshTokenInfo.isExpired);
    
    return {
      isAuthenticated,
      accessToken: accessTokenInfo,
      refreshToken: refreshTokenInfo,
      lastRefresh: this.lastRefresh,
      needsRefresh
    };
  }
  
  /**
   * 检查是否需要刷新Token
   */
  public needsRefresh(): boolean {
    const status = this.getTokenStatus();
    return status.needsRefresh;
  }
  
  /**
   * 刷新Token
   */
  public async refreshTokens(): Promise<TokenPair> {
    // 防止并发刷新
    if (this.isRefreshing && this.refreshPromise) {
      console.log('🔄 TokenManager: Token refresh already in progress, waiting...');
      return this.refreshPromise;
    }
    
    if (!this.refreshToken) {
      const error = 'No refresh token available';
      this.emit('authentication-lost', { reason: error });
      throw new Error(error);
    }
    
    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh();
    
    try {
      const tokens = await this.refreshPromise;
      this.setTokens(tokens);
      console.log('✅ TokenManager: Token refresh successful');
      return tokens;
    } catch (error) {
      console.error('❌ TokenManager: Token refresh failed', error);
      this.emit('refresh-failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      this.clearTokens();
      throw error;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }
  
  /**
   * 执行Token刷新请求
   */
  private async performTokenRefresh(): Promise<TokenPair> {
    const response = await fetch(`${this.options.apiBaseUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Token refresh failed');
    }
    
    if (!data.success || !data.data) {
      throw new Error('Invalid refresh response');
    }
    
    return data.data;
  }
  
  /**
   * 清除所有Token
   */
  public clearTokens(): void {
    console.log('🧹 TokenManager: Clearing all tokens');
    
    this.accessToken = null;
    this.refreshToken = null;
    this.lastRefresh = null;
    
    // 清除存储
    this.options.storage.removeItem('accessToken');
    this.options.storage.removeItem('refreshToken');
    this.options.storage.removeItem('lastTokenRefresh');
    
    // 清除定时器
    this.clearTimers();
    
    // 触发事件
    this.emit('authentication-lost', { reason: 'Tokens cleared' });
  }
  
  /**
   * 安排下次Token刷新
   */
  private scheduleRefresh(): void {
    if (!this.options.autoRefresh || !this.accessToken) {
      return;
    }
    
    const tokenInfo = this.parseTokenInfo(this.accessToken);
    if (!tokenInfo) {
      return;
    }
    
    const now = Date.now();
    const refreshTime = tokenInfo.expiresAt - this.options.refreshThreshold;
    const delay = Math.max(0, refreshTime - now);
    
    // 清除旧的定时器
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    
    this.refreshTimer = setTimeout(() => {
      console.log('⏰ TokenManager: Scheduled token refresh triggered');
      this.refreshTokens().catch(error => {
        console.error('❌ TokenManager: Scheduled refresh failed', error);
      });
    }, delay) as any;
    
    console.log(`⏰ TokenManager: Scheduled token refresh in ${Math.round(delay / 1000)}s`);
  }
  
  /**
   * 启动Token监控
   */
  private startMonitoring(): void {
    // 每分钟检查一次Token状态
    this.monitorTimer = setInterval(() => {
      const status = this.getTokenStatus();
      
      if (status.accessToken?.willExpireSoon && !status.accessToken.isExpired) {
        this.emit('token-will-expire', { token: status.accessToken });
      }
      
      if (status.accessToken?.isExpired) {
        this.emit('token-expired', { reason: 'Access token expired' });
      }
      
      if (status.needsRefresh && this.options.autoRefresh && !this.isRefreshing) {
        console.log('🔄 TokenManager: Monitor detected need for refresh');
        this.refreshTokens().catch(error => {
          console.error('❌ TokenManager: Monitor refresh failed', error);
        });
      }
    }, 60000) as any; // Check every minute
    
    console.log('👁️ TokenManager: Started token monitoring');
  }
  
  /**
   * 清除所有定时器
   */
  private clearTimers(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }
  }
  
  /**
   * 添加事件监听器
   */
  public on<K extends keyof TokenManagerEvents>(
    event: K, 
    callback: TokenEventCallback<TokenManagerEvents[K]>
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }
  
  /**
   * 移除事件监听器
   */
  public off<K extends keyof TokenManagerEvents>(
    event: K, 
    callback: TokenEventCallback<TokenManagerEvents[K]>
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
  
  /**
   * 触发事件
   */
  private emit<K extends keyof TokenManagerEvents>(
    event: K, 
    data: TokenManagerEvents[K]
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ TokenManager: Event listener error for ${event}`, error);
        }
      });
    }
  }
  
  /**
   * 销毁TokenManager实例
   */
  public destroy(): void {
    console.log('🗑️ TokenManager: Destroying instance');
    
    this.clearTimers();
    this.eventListeners.clear();
    this.isRefreshing = false;
    this.refreshPromise = null;
  }
}

// 导出单例实例
export const tokenManager = TokenManager.getInstance(); 