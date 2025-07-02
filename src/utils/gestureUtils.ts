import { useEffect, useRef, useCallback, useState } from 'react';

// 手势类型定义
export type GestureType = 'tap' | 'longpress' | 'swipe' | 'pinch' | 'pan' | 'rotate';

// 手势方向
export type SwipeDirection = 'up' | 'down' | 'left' | 'right';

// 手势事件接口
export interface GestureEvent {
  type: GestureType;
  direction?: SwipeDirection;
  distance?: number;
  scale?: number;
  rotation?: number;
  deltaX?: number;
  deltaY?: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  duration: number;
  touches: Touch[];
  originalEvent: TouchEvent;
}

// 手势配置
export interface GestureConfig {
  // 滑动配置
  swipeThreshold: number; // 滑动最小距离
  swipeVelocityThreshold: number; // 滑动最小速度
  
  // 长按配置
  longPressThreshold: number; // 长按时间阈值(ms)
  longPressMoveThreshold: number; // 长按允许的移动距离
  
  // 缩放配置
  pinchThreshold: number; // 缩放最小变化量
  
  // 通用配置
  preventDefaults: boolean; // 是否阻止默认行为
  enableHapticFeedback: boolean; // 是否启用触觉反馈
}

// 默认配置
const DEFAULT_GESTURE_CONFIG: GestureConfig = {
  swipeThreshold: 50,
  swipeVelocityThreshold: 0.3,
  longPressThreshold: 500,
  longPressMoveThreshold: 10,
  pinchThreshold: 0.1,
  preventDefaults: true,
  enableHapticFeedback: true
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

// 手势识别类
class GestureRecognizer {
  private element: HTMLElement;
  private config: GestureConfig;
  private startTime: number = 0;
  private startTouches: TouchList | null = null;
  private currentTouches: TouchList | null = null;
  private longPressTimer: NodeJS.Timeout | null = null;
  private initialDistance: number = 0;
  // private initialAngle: number = 0;
  private callbacks: Map<GestureType, (event: GestureEvent) => void> = new Map();

  constructor(element: HTMLElement, config: Partial<GestureConfig> = {}) {
    this.element = element;
    this.config = { ...DEFAULT_GESTURE_CONFIG, ...config };
    this.bindEvents();
  }

  // 绑定事件
  private bindEvents() {
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    this.element.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false });
  }

  // 解绑事件
  public destroy() {
    this.element.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.element.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    this.element.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    this.element.removeEventListener('touchcancel', this.handleTouchCancel.bind(this));
    this.clearLongPressTimer();
  }

  // 注册手势回调
  public on(gestureType: GestureType, callback: (event: GestureEvent) => void) {
    this.callbacks.set(gestureType, callback);
  }

  // 移除手势回调
  public off(gestureType: GestureType) {
    this.callbacks.delete(gestureType);
  }

  // 触摸开始
  private handleTouchStart(event: TouchEvent) {
    if (this.config.preventDefaults) {
      event.preventDefault();
    }

    this.startTime = Date.now();
    this.startTouches = event.touches;
    this.currentTouches = event.touches;

    // 设置长按定时器
    this.setLongPressTimer();

    // 记录多点触摸的初始状态
    if (event.touches.length === 2) {
      this.initialDistance = this.getDistance(event.touches[0], event.touches[1]);
      // this.initialAngle = this.getAngle(event.touches[0], event.touches[1]);
    }
  }

  // 触摸移动
  private handleTouchMove(event: TouchEvent) {
    if (this.config.preventDefaults) {
      event.preventDefault();
    }

    if (!this.startTouches) return;

    this.currentTouches = event.touches;

    // 检查是否超出长按移动阈值
    const moveDistance = this.getDistance(
      this.startTouches[0],
      event.touches[0]
    );

    if (moveDistance > this.config.longPressMoveThreshold) {
      this.clearLongPressTimer();
    }

    // 处理缩放手势
    if (event.touches.length === 2 && this.startTouches.length === 2) {
      this.handlePinch(event);
    }

    // 处理平移手势
    if (event.touches.length === 1) {
      this.handlePan(event);
    }
  }

  // 触摸结束
  private handleTouchEnd(event: TouchEvent) {
    if (this.config.preventDefaults) {
      event.preventDefault();
    }

    if (!this.startTouches) return;

    this.clearLongPressTimer();

    const duration = Date.now() - this.startTime;
    const touch = this.startTouches[0];
    const endTouch = this.currentTouches?.[0] || event.changedTouches[0];

    // 检查是否为点击
    const distance = this.getDistance(touch, endTouch);
    if (distance < this.config.longPressMoveThreshold && duration < this.config.longPressThreshold) {
      this.triggerGesture('tap', {
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: endTouch.clientX,
        currentY: endTouch.clientY,
        duration,
        touches: Array.from(event.changedTouches),
        originalEvent: event
      });

      if (this.config.enableHapticFeedback) {
        hapticFeedback('light');
      }
    }

    // 检查是否为滑动
    if (distance > this.config.swipeThreshold) {
      const velocity = distance / duration;
      if (velocity > this.config.swipeVelocityThreshold) {
        this.handleSwipe(touch, endTouch, duration, event);
      }
    }

    this.reset();
  }

  // 触摸取消
  private handleTouchCancel(_event: TouchEvent) {
    this.clearLongPressTimer();
    this.reset();
  }

  // 处理滑动
  private handleSwipe(startTouch: Touch, endTouch: Touch, duration: number, event: TouchEvent) {
    const deltaX = endTouch.clientX - startTouch.clientX;
    const deltaY = endTouch.clientY - startTouch.clientY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    let direction: SwipeDirection;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      direction = deltaY > 0 ? 'down' : 'up';
    }

    this.triggerGesture('swipe', {
      direction,
      distance,
      deltaX,
      deltaY,
      startX: startTouch.clientX,
      startY: startTouch.clientY,
      currentX: endTouch.clientX,
      currentY: endTouch.clientY,
      duration,
      touches: Array.from(event.changedTouches),
      originalEvent: event
    });

    if (this.config.enableHapticFeedback) {
      hapticFeedback('medium');
    }
  }

  // 处理缩放
  private handlePinch(event: TouchEvent) {
    const currentDistance = this.getDistance(event.touches[0], event.touches[1]);
    const scale = currentDistance / this.initialDistance;

    if (Math.abs(scale - 1) > this.config.pinchThreshold) {
      this.triggerGesture('pinch', {
        scale,
        startX: this.startTouches![0].clientX,
        startY: this.startTouches![0].clientY,
        currentX: event.touches[0].clientX,
        currentY: event.touches[0].clientY,
        duration: Date.now() - this.startTime,
        touches: Array.from(event.touches),
        originalEvent: event
      });
    }
  }

  // 处理平移
  private handlePan(event: TouchEvent) {
    if (!this.startTouches) return;

    const deltaX = event.touches[0].clientX - this.startTouches[0].clientX;
    const deltaY = event.touches[0].clientY - this.startTouches[0].clientY;

    this.triggerGesture('pan', {
      deltaX,
      deltaY,
      startX: this.startTouches[0].clientX,
      startY: this.startTouches[0].clientY,
      currentX: event.touches[0].clientX,
      currentY: event.touches[0].clientY,
      duration: Date.now() - this.startTime,
      touches: Array.from(event.touches),
      originalEvent: event
    });
  }

  // 设置长按定时器
  private setLongPressTimer() {
    this.clearLongPressTimer();
    this.longPressTimer = setTimeout(() => {
      if (this.startTouches) {
        this.triggerGesture('longpress', {
          startX: this.startTouches[0].clientX,
          startY: this.startTouches[0].clientY,
          currentX: this.startTouches[0].clientX,
          currentY: this.startTouches[0].clientY,
          duration: this.config.longPressThreshold,
          touches: Array.from(this.startTouches),
          originalEvent: new TouchEvent('touchstart')
        });

        if (this.config.enableHapticFeedback) {
          hapticFeedback('heavy');
        }
      }
    }, this.config.longPressThreshold);
  }

  // 清除长按定时器
  private clearLongPressTimer() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  // 触发手势事件
  private triggerGesture(type: GestureType, partial: Partial<GestureEvent>) {
    const callback = this.callbacks.get(type);
    if (callback) {
      const gestureEvent: GestureEvent = {
        type,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        duration: 0,
        touches: [],
        originalEvent: new TouchEvent('touchstart'),
        ...partial
      };
      callback(gestureEvent);
    }
  }

  // 计算两点距离
  private getDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // 计算两点角度 (保留作为未来功能)
  // private getAngle(touch1: Touch, touch2: Touch): number {
  //   return Math.atan2(touch2.clientY - touch1.clientY, touch2.clientX - touch1.clientX);
  // }

  // 重置状态
  private reset() {
    this.startTouches = null;
    this.currentTouches = null;
    this.startTime = 0;
    this.initialDistance = 0;
    // this.initialAngle = 0;
  }
}

// 手势Hook
export const useGesture = (
  config: Partial<GestureConfig> = {}
) => {
  const elementRef = useRef<HTMLElement>(null);
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const [isGestureActive, setIsGestureActive] = useState(false);

  // 初始化手势识别器
  useEffect(() => {
    if (elementRef.current) {
      recognizerRef.current = new GestureRecognizer(elementRef.current, config);
      
      return () => {
        recognizerRef.current?.destroy();
      };
    }
  }, [config]);

  // 注册手势监听器
  const onGesture = useCallback((type: GestureType, callback: (event: GestureEvent) => void) => {
    if (recognizerRef.current) {
      recognizerRef.current.on(type, (event) => {
        setIsGestureActive(true);
        callback(event);
        // 手势结束后重置状态
        setTimeout(() => setIsGestureActive(false), 100);
      });
    }
  }, []);

  // 移除手势监听器
  const offGesture = useCallback((type: GestureType) => {
    recognizerRef.current?.off(type);
  }, []);

  return {
    elementRef,
    onGesture,
    offGesture,
    isGestureActive
  };
};

// 滑动刷新Hook
export const useSwipeRefresh = (onRefresh: () => void | Promise<void>) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const { elementRef, onGesture } = useGesture({
    swipeThreshold: 80,
    enableHapticFeedback: true
  });

  useEffect(() => {
    onGesture('swipe', async (event) => {
      if (event.direction === 'down' && event.distance && event.distance > 80) {
        setIsRefreshing(true);
        hapticFeedback('medium');
        
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      }
    });

    onGesture('pan', (event) => {
      if (event.deltaY! > 0) {
        setPullDistance(Math.min(event.deltaY!, 100));
      }
    });
  }, [onGesture, onRefresh]);

  return {
    elementRef,
    isRefreshing,
    pullDistance
  };
};

// 长按菜单Hook
export const useLongPressMenu = (menuItems: Array<{ label: string; action: () => void }>) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const { elementRef, onGesture } = useGesture({
    longPressThreshold: 800,
    enableHapticFeedback: true
  });

  useEffect(() => {
    onGesture('longpress', (event) => {
      setMenuPosition({ x: event.currentX, y: event.currentY });
      setShowMenu(true);
      hapticFeedback('heavy');
    });

    onGesture('tap', () => {
      setShowMenu(false);
    });
  }, [onGesture]);

  const closeMenu = useCallback(() => {
    setShowMenu(false);
  }, []);

  return {
    elementRef,
    showMenu,
    menuPosition,
    menuItems,
    closeMenu
  };
};

export default GestureRecognizer; 