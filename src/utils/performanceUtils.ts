import { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import type { EmotionAnalysisResult, EmotionAggregation, CalendarEmotionData } from '../types/emotion';

// 缓存键生成器
export const generateCacheKey = (prefix: string, params: Record<string, any>): string => {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${JSON.stringify(params[key])}`)
    .join('|');
  return `${prefix}:${sortedParams}`;
};

// 内存缓存配置
export interface MemoryCacheConfig {
  maxSize: number;
  ttl: number; // Time to live in milliseconds
  cleanupInterval: number;
}

// 默认缓存配置
export const DEFAULT_CACHE_CONFIG: MemoryCacheConfig = {
  maxSize: 50, // 最多缓存50个项目
  ttl: 5 * 60 * 1000, // 5分钟过期
  cleanupInterval: 60 * 1000 // 每分钟清理一次过期项目
};

// 缓存项接口
interface CacheItem<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

// 内存缓存类
export class MemoryCache<T> {
  private cache = new Map<string, CacheItem<T>>();
  private config: MemoryCacheConfig;
  private cleanupTimer?: NodeJS.Timeout;
  private hitCount = 0;
  private missCount = 0;

  constructor(config: Partial<MemoryCacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.startCleanupTimer();
  }

  // 获取缓存项
  get(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.missCount++;
      return null;
    }

    // 检查是否过期
    if (Date.now() - item.timestamp > this.config.ttl) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }

    // 更新访问统计
    item.accessCount++;
    item.lastAccessed = Date.now();
    this.hitCount++;
    
    return item.data;
  }

  // 设置缓存项
  set(key: string, data: T): void {
    // 如果缓存已满，清理最少使用的项目
    if (this.cache.size >= this.config.maxSize) {
      this.evictLeastUsed();
    }

    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      accessCount: 1,
      lastAccessed: now
    });
  }

  // 删除缓存项
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  // 清空缓存
  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  // 获取缓存统计
  getStats() {
    const total = this.hitCount + this.missCount;
    return {
      size: this.cache.size,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: total > 0 ? (this.hitCount / total) * 100 : 0,
      maxSize: this.config.maxSize
    };
  }

  // 驱逐最少使用的项目
  private evictLeastUsed(): void {
    let leastUsedKey = '';
    let leastUsedItem: CacheItem<T> | null = null;

    for (const [key, item] of this.cache.entries()) {
      if (!leastUsedItem || 
          item.accessCount < leastUsedItem.accessCount ||
          (item.accessCount === leastUsedItem.accessCount && item.lastAccessed < leastUsedItem.lastAccessed)) {
        leastUsedKey = key;
        leastUsedItem = item;
      }
    }

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
    }
  }

  // 清理过期项目
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > this.config.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
  }

  // 启动清理定时器
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  // 停止清理定时器
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }
}

// 全局缓存实例
export const emotionAnalysisCache = new MemoryCache<EmotionAnalysisResult>();
export const emotionAggregationCache = new MemoryCache<EmotionAggregation[]>();
export const calendarDataCache = new MemoryCache<CalendarEmotionData[]>();

// 缓存Hook
export const useMemoryCache = <T>(
  key: string,
  fetcher: () => Promise<T> | T,
  cache: MemoryCache<T>,
  dependencies: any[] = []
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    // 先检查缓存
    const cachedData = cache.get(key);
    if (cachedData) {
      setData(cachedData);
      setLoading(false);
      return;
    }

    // 缓存未命中，获取数据
    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      cache.set(key, result);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, cache]);

  useEffect(() => {
    fetchData();
  }, [fetchData, ...dependencies]);

  const invalidate = useCallback(() => {
    cache.delete(key);
    fetchData();
  }, [key, cache, fetchData]);

  return { data, loading, error, invalidate };
};

// 防抖Hook (增强版)
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// 节流Hook
export const useThrottle = <T>(value: T, interval: number): T => {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastExecuted = useRef<number>(Date.now());

  useEffect(() => {
    if (Date.now() >= lastExecuted.current + interval) {
      lastExecuted.current = Date.now();
      setThrottledValue(value);
    } else {
      const timer = setTimeout(() => {
        lastExecuted.current = Date.now();
        setThrottledValue(value);
      }, interval - (Date.now() - lastExecuted.current));

      return () => clearTimeout(timer);
    }
  }, [value, interval]);

  return throttledValue;
};

// 异步操作缓存Hook
export const useAsyncMemo = <T>(
  factory: () => Promise<T>,
  dependencies: any[],
  initialValue?: T
) => {
  const [data, setData] = useState<T | undefined>(initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const memoizedFactory = useCallback(factory, dependencies);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    memoizedFactory()
      .then(result => {
        if (!cancelled) {
          setData(result);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [memoizedFactory]);

  return { data, loading, error };
};

// 虚拟化配置
export interface VirtualizationConfig {
  itemHeight: number;
  containerHeight: number;
  overscan: number; // 预渲染的额外项目数量
}

// 虚拟化Hook (用于大列表优化)
export const useVirtualization = (
  itemCount: number,
  config: VirtualizationConfig,
  scrollTop: number = 0
) => {
  return useMemo(() => {
    const { itemHeight, containerHeight, overscan } = config;
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      itemCount - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight)
    );

    const visibleStartIndex = Math.max(0, startIndex - overscan);
    const visibleEndIndex = Math.min(itemCount - 1, endIndex + overscan);

    return {
      startIndex: visibleStartIndex,
      endIndex: visibleEndIndex,
      visibleItems: visibleEndIndex - visibleStartIndex + 1,
      totalHeight: itemCount * itemHeight,
      offsetY: visibleStartIndex * itemHeight
    };
  }, [itemCount, config, scrollTop]);
};

// 资源预加载Hook
export const usePreload = (resources: string[]) => {
  const [loadedResources, setLoadedResources] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadResource = (url: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (url.endsWith('.js')) {
          const script = document.createElement('script');
          script.src = url;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
          document.head.appendChild(script);
        } else if (url.endsWith('.css')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = url;
          link.onload = () => resolve();
          link.onerror = () => reject(new Error(`Failed to load stylesheet: ${url}`));
          document.head.appendChild(link);
        } else {
          // 预加载图片或其他资源
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => reject(new Error(`Failed to load resource: ${url}`));
          img.src = url;
        }
      });
    };

    Promise.allSettled(
      resources.map(url => 
        loadResource(url).then(() => {
          setLoadedResources(prev => new Set([...prev, url]));
        })
      )
    );
  }, [resources]);

  return {
    loadedResources,
    isResourceLoaded: (url: string) => loadedResources.has(url),
    loadedCount: loadedResources.size,
    totalCount: resources.length,
    isAllLoaded: loadedResources.size === resources.length
  };
};

// 性能监控Hook
export const usePerformanceMonitor = (componentName: string) => {
  const renderCount = useRef(0);
  const startTime = useRef<number>(Date.now());

  useEffect(() => {
    renderCount.current++;
  });

  const measureRender = useCallback((label: string) => {
    const now = Date.now();
    const renderTime = now - startTime.current;
    
    console.log(`[Performance] ${componentName}:${label}`, {
      renderCount: renderCount.current,
      renderTime: `${renderTime}ms`,
      timestamp: new Date().toISOString()
    });
    
    startTime.current = now;
  }, [componentName]);

  const trackInteraction = useCallback((action: string, duration?: number) => {
    console.log(`[Performance] ${componentName}:${action}`, {
      duration: duration ? `${duration}ms` : 'immediate',
      timestamp: new Date().toISOString()
    });
  }, [componentName]);

  return { measureRender, trackInteraction, renderCount: renderCount.current };
};

// 内存使用监控
export const useMemoryMonitor = (interval: number = 10000) => {
  const [memoryInfo, setMemoryInfo] = useState<any>(null);

  useEffect(() => {
    const checkMemory = () => {
      if ('memory' in performance) {
        setMemoryInfo({
          usedJSMemory: Math.round((performance as any).memory.usedJSMemory / 1024 / 1024),
          totalJSMemory: Math.round((performance as any).memory.totalJSMemory / 1024 / 1024),
          jsMemoryLimit: Math.round((performance as any).memory.jsMemoryLimit / 1024 / 1024),
          timestamp: Date.now()
        });
      }
    };

    checkMemory();
    const timer = setInterval(checkMemory, interval);

    return () => clearInterval(timer);
  }, [interval]);

  return memoryInfo;
};

// 批处理Hook (用于批量更新操作)
export const useBatchProcessor = <T>(
  processor: (items: T[]) => Promise<void>,
  batchSize: number = 10,
  delay: number = 100
) => {
  const queue = useRef<T[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const processBatch = useCallback(async () => {
    if (queue.current.length === 0) return;

    const batch = queue.current.splice(0, batchSize);
    try {
      await processor(batch);
    } catch (error) {
      console.error('Batch processing error:', error);
    }

    // 如果还有待处理项目，继续处理
    if (queue.current.length > 0) {
      timeoutRef.current = setTimeout(processBatch, delay);
    }
  }, [processor, batchSize, delay]);

  const addToBatch = useCallback((item: T) => {
    queue.current.push(item);

    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 如果队列达到批处理大小或者是第一个项目，立即处理
    if (queue.current.length >= batchSize || queue.current.length === 1) {
      timeoutRef.current = setTimeout(processBatch, delay);
    }
  }, [batchSize, delay, processBatch]);

  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    processBatch();
  }, [processBatch]);

  return { addToBatch, flush, queueSize: queue.current.length };
};

// 清理所有缓存 (用于开发和调试)
export const clearAllCaches = () => {
  emotionAnalysisCache.clear();
  emotionAggregationCache.clear();
  calendarDataCache.clear();
};

// 获取所有缓存统计信息
export const getAllCacheStats = () => {
  return {
    emotionAnalysis: emotionAnalysisCache.getStats(),
    emotionAggregation: emotionAggregationCache.getStats(),
    calendarData: calendarDataCache.getStats()
  };
}; 