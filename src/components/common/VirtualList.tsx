import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useResponsive } from '../../utils/responsiveUtils';

// 虚拟化配置接口
export interface VirtualListConfig {
  itemHeight: number | ((index: number) => number); // 项目高度，支持动态高度
  containerHeight: number; // 容器高度
  overscan: number; // 预渲染的额外项目数量
  threshold: number; // 滚动阈值
  enableMomentum: boolean; // 是否启用惯性滚动
}

// 虚拟化项目接口
export interface VirtualItem {
  index: number;
  start: number;
  end: number;
  height: number;
}

// 组件Props
export interface VirtualListProps<T> {
  items: T[];
  itemHeight: number | ((index: number, item: T) => number);
  containerHeight?: number;
  overscan?: number;
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  onScroll?: (scrollTop: number, scrollDirection: 'up' | 'down') => void;
  onEndReached?: () => void;
  endReachedThreshold?: number;
  loading?: boolean;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

// 默认配置 (保留作为参考)
// const DEFAULT_CONFIG: Partial<VirtualListConfig> = {
//   overscan: 5,
//   threshold: 100,
//   enableMomentum: true
// };

// 虚拟滚动Hook
const useVirtualization = <T,>(
  items: T[],
  config: VirtualListConfig
) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('down');
  const lastScrollTop = useRef(0);
  const heights = useRef<number[]>([]);

  // 计算项目高度
  const getItemHeight = useCallback((index: number): number => {
    if (typeof config.itemHeight === 'function') {
      return config.itemHeight(index);
    }
    return config.itemHeight;
  }, [config.itemHeight]);

  // 更新高度缓存
  const updateHeight = useCallback((index: number, height: number) => {
    heights.current[index] = height;
  }, []);

  // 计算可见范围
  const visibleRange = useMemo(() => {
    if (items.length === 0) {
      return { start: 0, end: 0, offsetY: 0 };
    }

    let start = 0;
    let end = 0;
    let offsetY = 0;
    let accumulatedHeight = 0;

    // 找到起始索引
    for (let i = 0; i < items.length; i++) {
      const itemHeight = heights.current[i] || getItemHeight(i);
      
      if (accumulatedHeight + itemHeight > scrollTop) {
        start = Math.max(0, i - config.overscan);
        offsetY = accumulatedHeight;
        break;
      }
      
      accumulatedHeight += itemHeight;
    }

    // 找到结束索引
    let visibleHeight = 0;
    for (let i = start; i < items.length; i++) {
      const itemHeight = heights.current[i] || getItemHeight(i);
      visibleHeight += itemHeight;
      
      if (visibleHeight > config.containerHeight + config.overscan * itemHeight) {
        end = Math.min(items.length - 1, i + config.overscan);
        break;
      }
      
      end = i;
    }

    return { start, end, offsetY };
  }, [items.length, scrollTop, config, getItemHeight]);

  // 计算总高度
  const totalHeight = useMemo(() => {
    if (items.length === 0) return 0;
    
    let total = 0;
    for (let i = 0; i < items.length; i++) {
      total += heights.current[i] || getItemHeight(i);
    }
    return total;
  }, [items.length, getItemHeight]);

  // 获取可见项目
  const visibleItems = useMemo(() => {
    const result: VirtualItem[] = [];
    let currentOffset = visibleRange.offsetY;

    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      if (i >= items.length) break;
      
      const height = heights.current[i] || getItemHeight(i);
      result.push({
        index: i,
        start: currentOffset,
        end: currentOffset + height,
        height
      });
      
      currentOffset += height;
    }

    return result;
  }, [visibleRange, items.length, getItemHeight]);

  // 处理滚动
  const handleScroll = useCallback((newScrollTop: number) => {
    const direction = newScrollTop > lastScrollTop.current ? 'down' : 'up';
    setScrollDirection(direction);
    setScrollTop(newScrollTop);
    lastScrollTop.current = newScrollTop;
  }, []);

  return {
    visibleItems,
    totalHeight,
    scrollTop,
    scrollDirection,
    handleScroll,
    updateHeight
  };
};

// 项目测量组件
const VirtualListItem: React.FC<{
  children: React.ReactNode;
  index: number;
  onHeightChange: (index: number, height: number) => void;
  style: React.CSSProperties;
}> = ({ children, index, onHeightChange, style }) => {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (elementRef.current) {
      const height = elementRef.current.offsetHeight;
      onHeightChange(index, height);
    }
  }, [index, onHeightChange]);

  return (
    <div ref={elementRef} style={style}>
      {children}
    </div>
  );
};

// 加载指示器
const LoadingIndicator: React.FC<{ isMobile?: boolean }> = ({ isMobile }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: isMobile ? '60px' : '80px',
    color: '#8c8c8c',
    fontSize: isMobile ? '14px' : '16px'
  }}>
    <div style={{
      width: isMobile ? '20px' : '24px',
      height: isMobile ? '20px' : '24px',
      border: '2px solid #f3f3f3',
      borderTop: '2px solid #1890ff',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }} />
    <span style={{ marginLeft: '8px' }}>加载中...</span>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

// 空状态组件
const EmptyState: React.FC<{ isMobile?: boolean }> = ({ isMobile }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '200px',
    color: '#8c8c8c',
    fontSize: isMobile ? '14px' : '16px'
  }}>
    <div style={{
      fontSize: isMobile ? '32px' : '48px',
      marginBottom: '16px',
      opacity: 0.5
    }}>
      📝
    </div>
    <div>暂无数据</div>
  </div>
);

// 主组件
function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5,
  renderItem,
  onScroll,
  onEndReached,
  endReachedThreshold = 100,
  loading = false,
  loadingComponent,
  emptyComponent,
  className,
  style
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const { isMobile } = useResponsive();
  
  // 动态计算容器高度
  const actualContainerHeight = containerHeight || (isMobile ? window.innerHeight - 100 : 400);
  
  // 虚拟化配置
  const config: VirtualListConfig = {
    itemHeight: typeof itemHeight === 'function' 
      ? (index: number) => itemHeight(index, items[index])
      : itemHeight,
    containerHeight: actualContainerHeight,
    overscan,
    threshold: 100,
    enableMomentum: true
  };

  const {
    visibleItems,
    totalHeight,
    scrollDirection,
    handleScroll,
    updateHeight
  } = useVirtualization(items, config);

  // 滚动事件处理
  const handleScrollEvent = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const newScrollTop = target.scrollTop;
    
    handleScroll(newScrollTop);
    onScroll?.(newScrollTop, scrollDirection);

    // 检查是否接近底部
    const scrollHeight = target.scrollHeight;
    const clientHeight = target.clientHeight;
    const remainingHeight = scrollHeight - (newScrollTop + clientHeight);
    
    if (remainingHeight <= endReachedThreshold && !loading) {
      onEndReached?.();
    }
  }, [handleScroll, onScroll, scrollDirection, endReachedThreshold, loading, onEndReached]);

  // 渲染空状态
  if (items.length === 0 && !loading) {
    return (
      <div 
        className={className}
        style={{
          height: actualContainerHeight,
          ...style
        }}
      >
        {emptyComponent || <EmptyState isMobile={isMobile} />}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        height: actualContainerHeight,
        overflow: 'auto',
        position: 'relative',
        ...style
      }}
      onScroll={handleScrollEvent}
    >
      {/* 虚拟滚动容器 */}
      <div
        ref={scrollElementRef}
        style={{
          height: totalHeight,
          position: 'relative'
        }}
      >
        {/* 渲染可见项目 */}
        {visibleItems.map((virtualItem) => {
          const item = items[virtualItem.index];
          return (
            <VirtualListItem
              key={virtualItem.index}
              index={virtualItem.index}
              onHeightChange={updateHeight}
              style={{
                position: 'absolute',
                top: virtualItem.start,
                left: 0,
                right: 0,
                height: virtualItem.height
              }}
            >
              {renderItem(item, virtualItem.index, {
                height: virtualItem.height
              })}
            </VirtualListItem>
          );
        })}
        
        {/* 加载指示器 */}
        {loading && items.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: totalHeight,
              left: 0,
              right: 0
            }}
          >
            {loadingComponent || <LoadingIndicator isMobile={isMobile} />}
          </div>
        )}
      </div>
    </div>
  );
}

export default VirtualList; 