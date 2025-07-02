import { demoApiClient as apiClient } from '../utils/demoApiClient';
import {
  ChatHistoryData,
  EmotionReportData,
  HistoryResponse,
  HistoryBatchResponse,
  EmotionTimelineResponse,
  HistoryStatsResponse,
  HistoryQueryParams
} from '../types/history';

/**
 * 前端历史记录服务
 * 负责与后端API进行交互，提供历史记录相关功能
 */
export class HistoryService {
  private cache = new Map<string, ChatHistoryData | EmotionReportData>();
  private readonly maxCacheSize = 100;

  /**
   * 获取历史记录元数据列表
   */
  async getHistoryMetadata(params: HistoryQueryParams = {}): Promise<HistoryResponse> {
    try {
      console.log('Loading history metadata with params:', params);
      
      const queryParams = new URLSearchParams();
      queryParams.append('page', String(params.page || 1));
      queryParams.append('limit', String(params.limit || 20));
      queryParams.append('type', params.type || 'all');
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);
      if (params.threadId) queryParams.append('threadId', params.threadId);
      
      const response = await apiClient.get<HistoryResponse>(`/history/metadata?${queryParams.toString()}`);

      // 详细的响应验证
      if (!response) {
        console.error('No response received from history metadata API');
        throw new Error('No response received from server');
      }

      if (!response.success) {
        console.error('History metadata API returned failure:', response);
        throw new Error(response.error || 'API returned failure status');
      }

      if (!response.data) {
        console.error('History metadata response missing data field:', response);
        throw new Error('Response missing data field');
      }

      // 验证数据结构
      const historyData = response.data;
      
      // 检查是否是直接的数组结构 (后端直接返回数组)
      if (Array.isArray(historyData)) {
        console.log('✅ History metadata received as direct array, using as-is');
        return { 
          success: true, 
          data: historyData,
          pagination: (response as any).pagination,
          warning: (response as any).warning
        };
      }
      
      // 检查是否是嵌套的数据结构
      if (!historyData.data || !Array.isArray(historyData.data)) {
        console.error('❌ History metadata response data is not an array:', historyData);
        throw new Error('Response data is not a valid array');
      }

      if (historyData.warning) {
        console.warn('History metadata warning:', historyData.warning);
      }

      console.log(`Successfully loaded ${historyData.data.length} history metadata items`);
      return historyData;
      
    } catch (error: any) {
      console.error('Failed to load history metadata:', error);
      
      // 提供更详细的错误信息
      let errorMessage = 'Failed to load history metadata';
      if (error?.response?.status) {
        errorMessage += ` (HTTP ${error.response.status})`;
      }
      if (error?.message) {
        errorMessage += `: ${error.message}`;
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * 获取单个历史记录的详细内容
   */
  async getHistoryItem(key: string): Promise<ChatHistoryData | EmotionReportData | null> {
    try {
      // 验证key参数
      if (!key || typeof key !== 'string') {
        throw new Error('Invalid key provided for history item');
      }

      // 检查缓存
      if (this.cache.has(key)) {
        console.log(`Cache hit for history item: ${key}`);
        return this.cache.get(key)!;
      }

      console.log(`Loading history item: ${key}`);
      
      // 使用POST请求发送key（避免URL编码问题）
      const response = await apiClient.post<ChatHistoryData | EmotionReportData>('/history/item', { key });

      // 详细的响应验证
      if (!response) {
        console.error('No response received from history item API');
        throw new Error('No response received from server');
      }

      if (!response.success) {
        console.error('History item API returned failure:', response);
        throw new Error(response.error || 'API returned failure status');
      }

      if (!response.data) {
        console.warn(`History item not found or empty: ${key}`);
        return null;
      }

      // response.data 就是实际的历史数据对象
      const data = response.data;
      
      // 验证数据结构
      if (typeof data !== 'object' || data === null) {
        console.error('History item data is not a valid object:', data);
        throw new Error('Invalid data format received from server');
      }

      // 检查是否是有效的聊天记录或情绪报告
      const isChatData = this.isChatHistory(data);
      const isReportData = this.isEmotionReport(data);
      
      if (!isChatData && !isReportData) {
        console.warn('History item data format is not recognized, but proceeding:', data);
      }
      
      // 添加到缓存
      this.addToCache(key, data);
      
      console.log(`Successfully loaded and cached history item: ${key}`);
      return data;
      
    } catch (error: any) {
      if (error?.response?.status === 404) {
        console.warn(`History item not found: ${key}`);
        return null;
      }
      
      console.error(`Failed to load history item ${key}:`, error);
      
      // 提供更详细的错误信息
      let errorMessage = `Failed to load history item`;
      if (error?.response?.status) {
        errorMessage += ` (HTTP ${error.response.status})`;
      }
      if (error?.message) {
        errorMessage += `: ${error.message}`;
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * 批量获取历史记录内容
   */
  async getHistoryBatch(keys: string[]): Promise<{ [key: string]: ChatHistoryData | EmotionReportData }> {
    try {
      if (!keys || keys.length === 0) {
        return {};
      }

      // 检查缓存，过滤出需要从服务器加载的keys
      const result: { [key: string]: ChatHistoryData | EmotionReportData } = {};
      const keysToLoad: string[] = [];

      for (const key of keys) {
        if (this.cache.has(key)) {
          result[key] = this.cache.get(key)!;
        } else {
          keysToLoad.push(key);
        }
      }

      if (keysToLoad.length === 0) {
        console.log(`All ${keys.length} items found in cache`);
        return result;
      }

      console.log(`Loading ${keysToLoad.length}/${keys.length} history items from server`);

      const response = await apiClient.post<HistoryBatchResponse>('/history/batch', {
        keys: keysToLoad
      });

      if (response.success && response.data && response.data.success) {
        // 合并服务器数据到结果
        Object.assign(result, response.data.data);
        
        // 添加到缓存
        for (const [key, data] of Object.entries(response.data.data)) {
          this.addToCache(key, data);
        }

        console.log(`Batch load completed: ${response.data.loadedCount}/${response.data.requestedCount} from server`);
      }

      return result;
    } catch (error: any) {
      console.error('Failed to batch load history items:', error);
      const errorMessage = error?.message || 'Failed to batch load history items';
      throw new Error(errorMessage);
    }
  }

  /**
   * 获取情绪摘要数据 (用于情绪分析页面)
   */
  async getEmotionSummaries(params: {
    timeRange?: 'week' | 'month' | 'quarter' | 'year';
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}): Promise<{
    success: boolean;
    data: any[];
    message?: string;
  }> {
    try {
      console.log('Loading emotion summaries with params:', params);
      
      const queryParams = new URLSearchParams();
      if (params.timeRange) queryParams.append('timeRange', params.timeRange);
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);
      if (params.limit) queryParams.append('limit', params.limit.toString());
      
      const endpoint = `/history/emotion-summaries?${queryParams.toString()}`;
      
      // The backend returns an ApiResponse where data is any[] and there's a custom userMapping field.
      const response = await apiClient.get<any[]>(endpoint);

      // 🎯 修复：正确处理API响应结构并进行类型断言以访问自定义字段
      if (!response || !response.success || !Array.isArray(response.data)) {
        console.error('Invalid API response structure for emotion summaries:', response);
        throw new Error('Failed to load emotion summaries from API or invalid data format');
      }
      
      // 类型断言以安全访问 userMapping
      const responseWithMapping = response as typeof response & { userMapping?: { webUserId: string; ossUserId: string } };

      // 输出调试信息
      if (responseWithMapping.userMapping) {
        console.log(`User mapping: ${responseWithMapping.userMapping.webUserId} -> ${responseWithMapping.userMapping.ossUserId}`);
      }

      console.log(`Found ${response.data.length} emotion summaries from API`);
      
      return {
        success: response.success,
        data: response.data,
        message: response.message
      };

    } catch (error: any) {
      console.error('Failed to load emotion summaries:', error);
      return {
        success: false,
        data: [],
        message: error.message || 'Failed to load emotion summaries'
      };
    }
  }

  /**
   * 获取情绪时间轴数据
   */
  async getEmotionTimeline(): Promise<EmotionTimelineResponse> {
    try {
      console.log('Loading emotion timeline data');
      
      const response = await apiClient.get<EmotionTimelineResponse>('/history/emotion-timeline');

      if (!response.success || !response.data) {
        throw new Error('Failed to load emotion timeline');
      }

      if (response.data.success) {
        const stats = response.data.statistics;
        if (stats) {
          console.log(`Emotion timeline loaded: ${stats.totalEmotions} emotions from ${stats.reportCount} reports`);
        } else {
          console.log('No emotion timeline data found');
        }
      }

      return response.data;
    } catch (error: any) {
      console.error('Failed to load emotion timeline:', error);
      const errorMessage = error?.message || 'Failed to load emotion timeline';
      throw new Error(errorMessage);
    }
  }

  /**
   * 获取历史记录统计信息
   */
  async getHistoryStats(): Promise<HistoryStatsResponse> {
    try {
      console.log('Loading history statistics');
      
      const response = await apiClient.get<HistoryStatsResponse>('/history/stats');

      if (!response.success || !response.data) {
        throw new Error('Failed to load history statistics');
      }

      if (response.data.warning) {
        console.warn('History stats warning:', response.data.warning);
      }

      console.log('History stats loaded:', response.data.data);
      return response.data;
    } catch (error: any) {
      console.error('Failed to load history statistics:', error);
      const errorMessage = error?.message || 'Failed to load history statistics';
      throw new Error(errorMessage);
    }
  }

  /**
   * 清理服务器端缓存
   */
  async clearServerCache(): Promise<void> {
    try {
      console.log('Clearing server-side history cache');
      
      await apiClient.post('/history/clear-cache');
      
      console.log('Server-side history cache cleared');
    } catch (error: any) {
      console.error('Failed to clear server cache:', error);
      const errorMessage = error?.message || 'Failed to clear server cache';
      throw new Error(errorMessage);
    }
  }

  /**
   * 添加项到本地缓存
   */
  private addToCache(key: string, data: ChatHistoryData | EmotionReportData): void {
    // 如果缓存已满，删除最旧的项
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, data);
  }

  /**
   * 清理本地缓存
   */
  clearLocalCache(): void {
    this.cache.clear();
    console.log('Local history cache cleared');
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate?: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize
    };
  }

  /**
   * 检查是否为聊天历史数据
   */
  isChatHistory(data: ChatHistoryData | EmotionReportData): data is ChatHistoryData {
    return 'messages' in data;
  }

  /**
   * 检查是否为情绪报告数据
   */
  isEmotionReport(data: ChatHistoryData | EmotionReportData): data is EmotionReportData {
    return 'emotions' in data || 'detected_emotions' in data;
  }

  /**
   * 格式化文件大小显示
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 格式化时间戳显示
   */
  formatTimestamp(timestamp: string | Date): string {
    try {
      const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      
      if (days === 0) return '今天';
      if (days === 1) return '昨天';
      if (days < 7) return `${days}天前`;
      
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return '未知时间';
    }
  }

  /**
   * 根据情绪名称获取颜色
   */
  getEmotionColor(emotion: string): string {
    const colorMap: Record<string, string> = {
      '愤怒': '#e74c3c',
      '生气': '#e74c3c',
      'anger': '#e74c3c',
      '恐惧': '#8e44ad',
      '害怕': '#8e44ad',
      'fear': '#8e44ad',
      '悲伤': '#3498db',
      'sadness': '#3498db',
      '厌恶': '#2ecc71',
      'disgust': '#2ecc71',
      '惊喜': '#f39c12',
      '惊讶': '#f39c12',
      'surprise': '#f39c12',
      '喜悦': '#1abc9c',
      '开心': '#1abc9c',
      'happiness': '#1abc9c',
      'joy': '#1abc9c',
      '满意': '#16a085',
      'satisfaction': '#16a085',
      '感激': '#27ae60',
      'gratitude': '#27ae60',
      '信任': '#2980b9',
      'trust': '#2980b9',
      '期待': '#f1c40f',
      'anticipation': '#f1c40f',
      '焦虑': '#95a5a6',
      'anxiety': '#95a5a6'
    };
    
    return colorMap[emotion.toLowerCase()] || '#7f8c8d';
  }
}

// 创建并导出单例实例
export const historyService = new HistoryService();
export default historyService; 