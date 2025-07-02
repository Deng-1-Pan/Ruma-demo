import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useResponsive } from '../../utils/responsiveUtils';

// 刷新状态
export type RefreshStatus = 'idle' | 'pulling' | 'canRefresh' | 'refreshing' | 'success' | 'error';

// 下拉刷新配置
export interface PullToRefreshConfig {
  threshold: number; // 触发刷新的最小距离
  maxPullDistance: number; // 最大下拉距离
  refreshDuration: number; // 刷新动画持续时间
  successDuration: number; // 成功状态持续时间
  errorDuration: number; // 错误状态持续时间
  enableHapticFeedback: boolean; // 是否启用触觉反馈
  enableAnimation: boolean; // 是否启用动画
}

// 组件Props
export interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  config?: Partial<PullToRefreshConfig>;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  customIndicator?: (status: RefreshStatus, pullDistance: number) => React.ReactNode;
}

// 默认配置
const DEFAULT_CONFIG: PullToRefreshConfig = {
  threshold: 80,
  maxPullDistance: 120,
  refreshDuration: 1000,
  successDuration: 800,
  errorDuration: 1200,
  enableHapticFeedback: true,
  enableAnimation: true
};

// 刷新指示器
const RefreshIndicator: React.FC<{
  status: RefreshStatus;
  pullDistance: number;
  config: PullToRefreshConfig;
  isMobile: boolean;
}> = ({ status, pullDistance, config, isMobile }) => {
  const progress = Math.min(pullDistance / config.threshold, 1);
  const rotation = progress * 360;
  
  const iconSize = isMobile ? 20 : 24;
  const containerSize = isMobile ? 40 : 48;

  const getStatusIcon = () => {
    switch (status) {
      case 'pulling':
        return '⬇️';
      case 'canRefresh':
        return '🔄';
      case 'refreshing':
        return '⭕';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '⬇️';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'pulling':
        return '下拉刷新';
      case 'canRefresh':
        return '松开刷新';
      case 'refreshing':
        return '正在刷新...';
      case 'success':
        return '刷新成功';
      case 'error':
        return '刷新失败';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'pulling':
        return '#8c8c8c';
      case 'canRefresh':
        return '#1890ff';
      case 'refreshing':
        return '#1890ff';
      case 'success':
        return '#52c41a';
      case 'error':
        return '#ff4d4f';
      default:
        return '#8c8c8c';
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: Math.max(pullDistance, 0),
        background: 'linear-gradient(to bottom, #f5f5f5, #ffffff)',
        transition: config.enableAnimation ? 'all 0.3s ease' : 'none',
        color: getStatusColor(),
        fontSize: isMobile ? '12px' : '14px'
      }}
    >
      {/* 图标 */}
      <div
        style={{
          width: containerSize,
          height: containerSize,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          backgroundColor: '#ffffff',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          fontSize: iconSize,
          transform: status === 'refreshing' 
            ? 'rotate(360deg)' 
            : `rotate(${rotation}deg)`,
          transition: status === 'refreshing' 
            ? 'transform 1s linear infinite' 
            : config.enableAnimation ? 'transform 0.2s ease' : 'none',
          marginBottom: '4px'
        }}
      >
        {getStatusIcon()}
      </div>
      
      {/* 状态文字 */}
      <div style={{
        opacity: pullDistance > 20 ? 1 : 0,
        transition: config.enableAnimation ? 'opacity 0.2s ease' : 'none',
        fontWeight: 500
      }}>
        {getStatusText()}
      </div>
      
      {/* 进度条 */}
      {status === 'pulling' && (
        <div
          style={{
            width: isMobile ? '60px' : '80px',
            height: '2px',
            backgroundColor: '#f0f0f0',
            borderRadius: '1px',
            marginTop: '4px',
            overflow: 'hidden',
            opacity: pullDistance > 30 ? 1 : 0,
            transition: config.enableAnimation ? 'opacity 0.2s ease' : 'none'
          }}
        >
          <div
            style={{
              width: `${progress * 100}%`,
              height: '100%',
              backgroundColor: '#1890ff',
              borderRadius: '1px',
              transition: config.enableAnimation ? 'width 0.1s ease' : 'none'
            }}
          />
        </div>
      )}
    </div>
  );
};

// 触觉反馈
const hapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30]
    };
    navigator.vibrate(patterns[type]);
  }
};

// 主组件
const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  config = {},
  disabled = false,
  className,
  style,
  customIndicator
}) => {
  const [status, setStatus] = useState<RefreshStatus>('idle');
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startTouchY = useRef<number>(0);
  const currentTouchY = useRef<number>(0);
  const lastTouchY = useRef<number>(0);
  const statusTimer = useRef<NodeJS.Timeout | null>(null);
  
  const { isMobile } = useResponsive();
  const actualConfig = { ...DEFAULT_CONFIG, ...config };

  // 清除定时器
  const clearStatusTimer = useCallback(() => {
    if (statusTimer.current) {
      clearTimeout(statusTimer.current);
      statusTimer.current = null;
    }
  }, []);

  // 重置状态
  const resetState = useCallback(() => {
    setStatus('idle');
    setPullDistance(0);
    setIsRefreshing(false);
    clearStatusTimer();
  }, [clearStatusTimer]);

  // 处理刷新
  const handleRefresh = useCallback(async () => {
    if (disabled || isRefreshing) return;

    setIsRefreshing(true);
    setStatus('refreshing');
    
    if (actualConfig.enableHapticFeedback) {
      hapticFeedback('medium');
    }

    try {
      await onRefresh();
      
      setStatus('success');
      if (actualConfig.enableHapticFeedback) {
        hapticFeedback('light');
      }
      
      statusTimer.current = setTimeout(() => {
        resetState();
      }, actualConfig.successDuration);
      
    } catch (error) {
      setStatus('error');
      if (actualConfig.enableHapticFeedback) {
        hapticFeedback('heavy');
      }
      
      statusTimer.current = setTimeout(() => {
        resetState();
      }, actualConfig.errorDuration);
    }
  }, [disabled, isRefreshing, onRefresh, actualConfig, resetState]);

  // 触摸开始
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    if (disabled || isRefreshing) return;

    const touch = event.touches[0];
    startTouchY.current = touch.clientY;
    currentTouchY.current = touch.clientY;
    lastTouchY.current = touch.clientY;
    
    // 检查是否在容器顶部
    const container = containerRef.current;
    if (container && container.scrollTop === 0) {
      setStatus('pulling');
    }
  }, [disabled, isRefreshing]);

  // 触摸移动
  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    if (disabled || isRefreshing || status === 'idle') return;

    const touch = event.touches[0];
    currentTouchY.current = touch.clientY;
    
    const deltaY = currentTouchY.current - startTouchY.current;
    const container = containerRef.current;
    
    // 只在容器顶部且向下滑动时处理
    if (container && container.scrollTop === 0 && deltaY > 0) {
      event.preventDefault();
      
      // 计算下拉距离，使用阻尼效果
      const damping = 0.5;
      const distance = Math.min(deltaY * damping, actualConfig.maxPullDistance);
      setPullDistance(distance);
      
      // 更新状态
      if (distance >= actualConfig.threshold && status !== 'canRefresh') {
        setStatus('canRefresh');
        if (actualConfig.enableHapticFeedback) {
          hapticFeedback('light');
        }
      } else if (distance < actualConfig.threshold && status !== 'pulling') {
        setStatus('pulling');
      }
    }
  }, [disabled, isRefreshing, status, actualConfig]);

  // 触摸结束
  const handleTouchEnd = useCallback(() => {
    if (disabled || isRefreshing) return;

    if (status === 'canRefresh') {
      handleRefresh();
    } else {
      // 回弹动画
      if (actualConfig.enableAnimation) {
        setPullDistance(0);
        setTimeout(() => {
          setStatus('idle');
        }, 300);
      } else {
        resetState();
      }
    }
  }, [disabled, isRefreshing, status, handleRefresh, actualConfig, resetState]);

  // 滚动处理
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    
    // 如果不在顶部，重置状态
    if (target.scrollTop > 0 && status !== 'idle' && !isRefreshing) {
      resetState();
    }
  }, [status, isRefreshing, resetState]);

  // 清理
  useEffect(() => {
    return () => {
      clearStatusTimer();
    };
  }, [clearStatusTimer]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        height: '100%',
        overflow: 'auto',
        position: 'relative',
        ...style
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onScroll={handleScroll}
    >
      {/* 刷新指示器 */}
      <div
        style={{
          position: 'absolute',
          top: -pullDistance,
          left: 0,
          right: 0,
          zIndex: 1000,
          pointerEvents: 'none'
        }}
      >
        {customIndicator ? 
          customIndicator(status, pullDistance) : 
          <RefreshIndicator 
            status={status} 
            pullDistance={pullDistance} 
            config={actualConfig}
            isMobile={isMobile}
          />
        }
      </div>

      {/* 内容区域 */}
      <div
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : 'none',
          transition: status === 'idle' && actualConfig.enableAnimation ? 'transform 0.3s ease' : 'none',
          minHeight: '100%'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh; 