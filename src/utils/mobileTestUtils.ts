import { useEffect, useState, useCallback } from 'react';

// 移动端测试配置
export interface MobileTestConfig {
  simulateDevices: boolean;
  showBreakpoints: boolean;
  enableTouch: boolean;
  logInteractions: boolean;
}

// 常见设备尺寸
export const DEVICE_SIZES = {
  mobile: {
    iPhone_SE: { width: 375, height: 667, name: 'iPhone SE' },
    iPhone_12: { width: 390, height: 844, name: 'iPhone 12' },
    iPhone_12_Pro_Max: { width: 428, height: 926, name: 'iPhone 12 Pro Max' },
    Samsung_Galaxy_S21: { width: 384, height: 854, name: 'Samsung Galaxy S21' },
    Samsung_Galaxy_Note20: { width: 412, height: 915, name: 'Samsung Galaxy Note20' }
  },
  tablet: {
    iPad: { width: 768, height: 1024, name: 'iPad' },
    iPad_Pro_11: { width: 834, height: 1194, name: 'iPad Pro 11"' },
    iPad_Pro_12_9: { width: 1024, height: 1366, name: 'iPad Pro 12.9"' },
    Surface_Pro: { width: 912, height: 1368, name: 'Surface Pro' }
  },
  desktop: {
    Laptop: { width: 1366, height: 768, name: 'Laptop (1366x768)' },
    Desktop_HD: { width: 1920, height: 1080, name: 'Desktop HD (1920x1080)' },
    Desktop_4K: { width: 3840, height: 2160, name: 'Desktop 4K (3840x2160)' }
  }
};

// 移动端测试Hook
export const useMobileTest = (config: Partial<MobileTestConfig> = {}) => {
  const [currentDevice, setCurrentDevice] = useState<string | null>(null);
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 });
  const [touchSupported, setTouchSupported] = useState(false);
  const [orientationSupported, setOrientationSupported] = useState(false);

  const testConfig: MobileTestConfig = {
    simulateDevices: false,
    showBreakpoints: false,
    enableTouch: false,
    logInteractions: false,
    ...config
  };

  // 检测设备信息
  useEffect(() => {
    const updateScreenSize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    const detectDevice = () => {
      const width = window.innerWidth;
      
      // 检测当前设备类型
      for (const [category, devices] of Object.entries(DEVICE_SIZES)) {
        for (const [deviceKey, device] of Object.entries(devices)) {
          if (Math.abs(width - device.width) <= 50) { // 允许50px误差
            setCurrentDevice(`${category}:${deviceKey}`);
            return;
          }
        }
      }
      
      // 基于断点判断设备类型
      if (width < 768) {
        setCurrentDevice('mobile:unknown');
      } else if (width < 1024) {
        setCurrentDevice('tablet:unknown');
      } else {
        setCurrentDevice('desktop:unknown');
      }
    };

    const detectCapabilities = () => {
      // 检测触摸支持
      setTouchSupported('ontouchstart' in window || navigator.maxTouchPoints > 0);
      
      // 检测屏幕方向支持
      setOrientationSupported('orientation' in window || 'screen' in window);
    };

    updateScreenSize();
    detectDevice();
    detectCapabilities();

    window.addEventListener('resize', updateScreenSize);
    window.addEventListener('resize', detectDevice);

    return () => {
      window.removeEventListener('resize', updateScreenSize);
      window.removeEventListener('resize', detectDevice);
    };
  }, []);

  // 模拟设备尺寸
  const simulateDevice = useCallback((devicePath: string) => {
    const [category, deviceKey] = devicePath.split(':');
    const device = (DEVICE_SIZES as any)[category]?.[deviceKey];
    
    if (device && testConfig.simulateDevices) {
      // 模拟设备尺寸（仅在开发环境）
      if (process.env.NODE_ENV === 'development') {
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
          viewport.setAttribute('content', `width=${device.width}, initial-scale=1.0`);
        }
        
        // 触发resize事件
        window.dispatchEvent(new Event('resize'));
        
        console.log(`[Mobile Test] Simulating device: ${device.name} (${device.width}x${device.height})`);
      }
    }
  }, [testConfig.simulateDevices]);

  // 测试触摸事件
  const testTouch = useCallback((element: HTMLElement, eventType: 'tap' | 'swipe' | 'pinch') => {
    if (!testConfig.enableTouch) return;

    const simulateTouch = (type: string) => {
      const touchEvent = new TouchEvent(type, {
        bubbles: true,
        cancelable: true,
        touches: [new Touch({
          identifier: 0,
          target: element,
          clientX: element.offsetLeft + element.offsetWidth / 2,
          clientY: element.offsetTop + element.offsetHeight / 2
        })]
      });
      
      element.dispatchEvent(touchEvent);
      
      if (testConfig.logInteractions) {
        console.log(`[Mobile Test] Touch event: ${type} on`, element);
      }
    };

    switch (eventType) {
      case 'tap':
        simulateTouch('touchstart');
        setTimeout(() => simulateTouch('touchend'), 100);
        break;
      case 'swipe':
        simulateTouch('touchstart');
        setTimeout(() => simulateTouch('touchmove'), 50);
        setTimeout(() => simulateTouch('touchend'), 200);
        break;
      case 'pinch':
        // 简化的缩放模拟
        simulateTouch('touchstart');
        setTimeout(() => simulateTouch('touchend'), 300);
        break;
    }
  }, [testConfig.enableTouch, testConfig.logInteractions]);

  // 性能测试
  const testPerformance = useCallback((testName: string) => {
    const startTime = performance.now();
    
    return {
      end: () => {
        const duration = performance.now() - startTime;
        console.log(`[Mobile Test] Performance: ${testName} took ${duration.toFixed(2)}ms`);
        return duration;
      }
    };
  }, []);

  // 获取断点信息
  const getBreakpointInfo = useCallback(() => {
    const width = screenSize.width;
    
    if (width < 768) {
      return { name: 'mobile', range: '< 768px', category: 'mobile' };
    } else if (width < 1024) {
      return { name: 'tablet', range: '768px - 1024px', category: 'tablet' };
    } else if (width < 1440) {
      return { name: 'desktop', range: '1024px - 1440px', category: 'desktop' };
    } else {
      return { name: 'large', range: '> 1440px', category: 'desktop' };
    }
  }, [screenSize.width]);

  return {
    // 设备信息
    currentDevice,
    screenSize,
    touchSupported,
    orientationSupported,
    
    // 测试方法
    simulateDevice,
    testTouch,
    testPerformance,
    getBreakpointInfo,
    
    // 设备数据
    availableDevices: DEVICE_SIZES,
    
    // 配置
    config: testConfig
  };
};

// 移动端适配检查器
export const checkMobileCompatibility = (componentName: string) => {
  const issues: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // 检查视口配置
  const viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) {
    issues.push('Missing viewport meta tag');
  } else {
    const content = viewport.getAttribute('content') || '';
    if (!content.includes('width=device-width')) {
      warnings.push('Viewport should include width=device-width');
    }
    if (!content.includes('initial-scale=1')) {
      warnings.push('Viewport should include initial-scale=1');
    }
  }

  // 检查触摸友好性
  const elements = document.querySelectorAll('button, [role="button"], a, input, select, textarea');
  elements.forEach(element => {
    const rect = element.getBoundingClientRect();
    const minTouchSize = 44; // Apple HIG建议最小44px
    
    if (rect.width < minTouchSize || rect.height < minTouchSize) {
      warnings.push(`Element too small for touch: ${element.tagName} (${rect.width}x${rect.height}px)`);
    }
  });

  // 检查可滚动区域
  const scrollableElements = document.querySelectorAll('[style*="overflow"]');
  if (scrollableElements.length === 0) {
    suggestions.push('Consider adding scrollable containers for long content');
  }

  // 检查字体大小
  const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6');
  let smallTextCount = 0;
  textElements.forEach(element => {
    const styles = window.getComputedStyle(element);
    const fontSize = parseInt(styles.fontSize);
    if (fontSize < 16) {
      smallTextCount++;
    }
  });
  
  if (smallTextCount > textElements.length * 0.3) {
    warnings.push('Many text elements have font size < 16px (recommended minimum for mobile)');
  }

  // 检查横向滚动
  if (document.body.scrollWidth > window.innerWidth) {
    issues.push('Content wider than viewport causing horizontal scroll');
  }

  // 检查固定定位元素
  const fixedElements = document.querySelectorAll('[style*="position: fixed"], [style*="position:fixed"]');
  fixedElements.forEach(element => {
    const rect = element.getBoundingClientRect();
    if (rect.top < 0 || rect.left < 0 || rect.right > window.innerWidth || rect.bottom > window.innerHeight) {
      warnings.push('Fixed positioned element extends outside viewport');
    }
  });

  const report = {
    componentName,
    timestamp: new Date().toISOString(),
    issues,
    warnings,
    suggestions,
    score: Math.max(0, 100 - issues.length * 20 - warnings.length * 10 - suggestions.length * 5),
    status: issues.length === 0 ? (warnings.length === 0 ? 'excellent' : 'good') : 'needs-improvement'
  };

  console.log(`[Mobile Compatibility] ${componentName}:`, report);
  return report;
};

// 移动端交互测试器
export const testMobileInteractions = async (componentName: string) => {
  const results: Array<{
    test: string;
    passed: boolean;
    duration: number;
    notes?: string;
  }> = [];

  // 测试触摸响应
  const touchTest = () => {
    return new Promise<boolean>((resolve) => {
      const startTime = performance.now();
      let touched = false;

      const button = document.querySelector('button, [role="button"]');
      if (button) {
        button.addEventListener('touchstart', () => {
          touched = true;
          const duration = performance.now() - startTime;
          results.push({
            test: 'Touch Response',
            passed: duration < 100, // 触摸响应应该在100ms内
            duration,
            notes: duration > 100 ? 'Touch response too slow' : undefined
          });
          resolve(touched);
        }, { once: true });

        // 模拟触摸
        button.dispatchEvent(new TouchEvent('touchstart', { bubbles: true }));
        
        // 如果1秒后没有响应，认为失败
        setTimeout(() => {
          if (!touched) {
            results.push({
              test: 'Touch Response',
              passed: false,
              duration: 1000,
              notes: 'No touch response detected'
            });
            resolve(false);
          }
        }, 1000);
      } else {
        results.push({
          test: 'Touch Response',
          passed: false,
          duration: 0,
          notes: 'No interactive elements found'
        });
        resolve(false);
      }
    });
  };

  // 测试滚动性能
  const scrollTest = () => {
    return new Promise<boolean>((resolve) => {
      const startTime = performance.now();
      let scrolled = false;

      const scrollHandler = () => {
        if (!scrolled) {
          scrolled = true;
          const duration = performance.now() - startTime;
          results.push({
            test: 'Scroll Performance',
            passed: duration < 16, // 60fps = 16.67ms per frame
            duration,
            notes: duration > 16 ? 'Scroll not smooth (< 60fps)' : undefined
          });
          resolve(true);
        }
      };

      window.addEventListener('scroll', scrollHandler, { once: true });
      
      // 模拟滚动
      window.scrollBy(0, 100);
      
      setTimeout(() => {
        if (!scrolled) {
          results.push({
            test: 'Scroll Performance',
            passed: false,
            duration: 1000,
            notes: 'No scroll detected'
          });
          resolve(false);
        }
        window.removeEventListener('scroll', scrollHandler);
      }, 1000);
    });
  };

  // 执行测试
  await touchTest();
  await scrollTest();

  const report = {
    componentName,
    timestamp: new Date().toISOString(),
    results,
    passedTests: results.filter(r => r.passed).length,
    totalTests: results.length,
    score: Math.round((results.filter(r => r.passed).length / results.length) * 100),
    status: results.every(r => r.passed) ? 'excellent' : 
            results.some(r => r.passed) ? 'partial' : 'failed'
  };

  console.log(`[Mobile Interactions] ${componentName}:`, report);
  return report;
};

// 获取移动端调试信息
export const getMobileDebugInfo = () => {
  return {
    userAgent: navigator.userAgent,
    screenSize: {
      width: window.screen.width,
      height: window.screen.height,
      availWidth: window.screen.availWidth,
      availHeight: window.screen.availHeight,
      colorDepth: window.screen.colorDepth,
      pixelDepth: window.screen.pixelDepth
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1
    },
    features: {
      touchSupport: 'ontouchstart' in window,
      orientationSupport: 'orientation' in window,
      geolocationSupport: 'geolocation' in navigator,
      localStorageSupport: 'localStorage' in window,
      serviceWorkerSupport: 'serviceWorker' in navigator
    },
    performance: {
      memory: (performance as any).memory ? {
        usedJSMemory: Math.round((performance as any).memory.usedJSMemory / 1024 / 1024),
        totalJSMemory: Math.round((performance as any).memory.totalJSMemory / 1024 / 1024),
        jsMemoryLimit: Math.round((performance as any).memory.jsMemoryLimit / 1024 / 1024)
      } : null,
      timing: performance.timing ? {
        loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart,
        domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
        firstPaint: performance.getEntriesByType ? 
          performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime : null
      } : null
    }
  };
}; 