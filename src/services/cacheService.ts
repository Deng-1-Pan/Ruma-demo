import { demoApiClient } from '../utils/demoApiClient';

const apiClient = demoApiClient;

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
}

export interface ClearCacheResult {
  success: boolean;
  message: string;
  data?: {
    deletedCount: number;
    cacheType: string;
  };
  error?: string;
}

export interface ClearAllCacheResult {
  success: boolean;
  message: string;
  data?: {
    totalDeleted: number;
    breakdown: {
      ai_responses: number;
      chat_history: number;
      emotion_analysis: number;
    };
  };
  error?: string;
}

/**
 * 前端缓存管理服务
 */
export class CacheManagementService {
  /**
   * 清理AI回复缓存
   */
  async clearAIResponseCache(): Promise<ClearCacheResult> {
    try {
      console.log('🗑️ Clearing AI response cache...');
      
      const response = await apiClient.post<ClearCacheResult>('/chat/clear-ai-cache');
      
      if (response.success) {
        console.log('✅ AI response cache cleared:', response.data);
        return response.data || { success: true, message: 'Cache cleared successfully' };
      } else {
        throw new Error(response.error || 'Failed to clear AI cache');
      }
    } catch (error: any) {
      console.error('❌ Failed to clear AI response cache:', error);
      return {
        success: false,
        message: 'Failed to clear AI response cache',
        error: error?.message || 'Unknown error'
      };
    }
  }

  /**
   * 清理所有聊天相关缓存 (仅开发环境)
   */
  async clearAllChatCache(): Promise<ClearAllCacheResult> {
    try {
      console.log('🧹 Clearing all chat cache...');
      
      const response = await apiClient.post<ClearAllCacheResult>('/chat/clear-all-cache');
      
      if (response.success) {
        console.log('✅ All chat cache cleared:', response.data);
        return response.data || { success: true, message: 'All cache cleared successfully' };
      } else {
        throw new Error(response.error || 'Failed to clear all cache');
      }
    } catch (error: any) {
      console.error('❌ Failed to clear all chat cache:', error);
      return {
        success: false,
        message: 'Failed to clear all chat cache',
        error: error?.message || 'Unknown error'
      };
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStats(): Promise<{ stats: CacheStats; info: any } | null> {
    try {
      const response = await apiClient.get<{ stats: CacheStats; info: any }>('/cache/stats');
      
      if (response.success) {
        return response.data || null;
      } else {
        throw new Error(response.error || 'Failed to get cache stats');
      }
    } catch (error: any) {
      console.error('❌ Failed to get cache stats:', error);
      return null;
    }
  }

  /**
   * 清理历史记录缓存
   */
  async clearHistoryCache(): Promise<boolean> {
    try {
      console.log('🗑️ Clearing history cache...');
      
      const response = await apiClient.post('/history/clear-cache');
      
      if (response.success) {
        console.log('✅ History cache cleared');
        return true;
      } else {
        throw new Error(response.error || 'Failed to clear history cache');
      }
    } catch (error: any) {
      console.error('❌ Failed to clear history cache:', error);
      return false;
    }
  }
}

// 导出单例实例
export const cacheManager = new CacheManagementService(); 