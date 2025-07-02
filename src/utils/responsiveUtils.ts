import { useEffect, useState } from 'react';

// 响应式断点配置 (基于创意设计)
export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1440,
  large: 1920
} as const;

// 设备类型
export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'large';

// 响应式配置接口
export interface ResponsiveConfig {
  mobile: {
    tabPosition: 'top' | 'bottom';
    showAllCharts: boolean;
    calendarSize: 'small' | 'medium' | 'large';
    chartContainerCols: { span: number };
    cardPadding: string;
    fontSize: {
      title: string;
      body: string;
      caption: string;
    };
    spacing: {
      cardMargin: string;
      componentGap: string;
      sectionPadding: string;
    };
    knowledgeGraph: {
      width: number;
      height: number;
      nodeSize: number;
    };
  };
  tablet: {
    tabPosition: 'top' | 'bottom';
    showAllCharts: boolean;
    calendarSize: 'small' | 'medium' | 'large';
    chartContainerCols: { span: number };
    cardPadding: string;
    fontSize: {
      title: string;
      body: string;
      caption: string;
    };
    spacing: {
      cardMargin: string;
      componentGap: string;
      sectionPadding: string;
    };
    knowledgeGraph: {
      width: number;
      height: number;
      nodeSize: number;
    };
  };
  desktop: {
    tabPosition: 'top' | 'bottom';
    showAllCharts: boolean;
    calendarSize: 'small' | 'medium' | 'large';
    chartContainerCols: { span: number };
    cardPadding: string;
    fontSize: {
      title: string;
      body: string;
      caption: string;
    };
    spacing: {
      cardMargin: string;
      componentGap: string;
      sectionPadding: string;
    };
    knowledgeGraph: {
      width: number;
      height: number;
      nodeSize: number;
    };
  };
  large: {
    tabPosition: 'top' | 'bottom';
    showAllCharts: boolean;
    calendarSize: 'small' | 'medium' | 'large';
    chartContainerCols: { span: number };
    cardPadding: string;
    fontSize: {
      title: string;
      body: string;
      caption: string;
    };
    spacing: {
      cardMargin: string;
      componentGap: string;
      sectionPadding: string;
    };
    knowledgeGraph: {
      width: number;
      height: number;
      nodeSize: number;
    };
  };
}

// 默认响应式配置
export const DEFAULT_RESPONSIVE_CONFIG: ResponsiveConfig = {
  mobile: {
    tabPosition: 'top',
    showAllCharts: false, // 移动端只显示核心图表
    calendarSize: 'small',
    chartContainerCols: { span: 24 },
    cardPadding: '12px',
    fontSize: {
      title: '18px',
      body: '14px',
      caption: '12px'
    },
    spacing: {
      cardMargin: '8px',
      componentGap: '12px',
      sectionPadding: '12px'
    },
    knowledgeGraph: {
      width: 320,
      height: 400,
      nodeSize: 16
    }
  },
  tablet: {
    tabPosition: 'top',
    showAllCharts: true,
    calendarSize: 'medium',
    chartContainerCols: { span: 24 },
    cardPadding: '16px',
    fontSize: {
      title: '20px',
      body: '14px',
      caption: '12px'
    },
    spacing: {
      cardMargin: '12px',
      componentGap: '16px',
      sectionPadding: '16px'
    },
    knowledgeGraph: {
      width: 600,
      height: 500,
      nodeSize: 20
    }
  },
  desktop: {
    tabPosition: 'top',
    showAllCharts: true,
    calendarSize: 'large',
    chartContainerCols: { span: 12 },
    cardPadding: '20px',
    fontSize: {
      title: '24px',
      body: '14px',
      caption: '12px'
    },
    spacing: {
      cardMargin: '16px',
      componentGap: '20px',
      sectionPadding: '20px'
    },
    knowledgeGraph: {
      width: 800,
      height: 600,
      nodeSize: 24
    }
  },
  large: {
    tabPosition: 'top',
    showAllCharts: true,
    calendarSize: 'large',
    chartContainerCols: { span: 12 },
    cardPadding: '24px',
    fontSize: {
      title: '28px',
      body: '16px',
      caption: '14px'
    },
    spacing: {
      cardMargin: '20px',
      componentGap: '24px',
      sectionPadding: '24px'
    },
    knowledgeGraph: {
      width: 1000,
      height: 700,
      nodeSize: 28
    }
  }
};

// 获取当前设备类型
export const getDeviceType = (width: number): DeviceType => {
  if (width < BREAKPOINTS.mobile) return 'mobile';
  if (width < BREAKPOINTS.tablet) return 'tablet';
  if (width < BREAKPOINTS.desktop) return 'desktop';
  if (width < BREAKPOINTS.large) return 'large';
  return 'large';
};

// 获取当前屏幕宽度
export const getScreenWidth = (): number => {
  if (typeof window !== 'undefined') {
    return window.innerWidth;
  }
  return BREAKPOINTS.desktop; // 服务端渲染默认值
};

// 响应式Hook
export const useResponsive = () => {
  const [screenWidth, setScreenWidth] = useState(getScreenWidth);
  const [deviceType, setDeviceType] = useState<DeviceType>(() => 
    getDeviceType(getScreenWidth())
  );

  useEffect(() => {
    const handleResize = () => {
      const width = getScreenWidth();
      setScreenWidth(width);
      setDeviceType(getDeviceType(width));
    };

    window.addEventListener('resize', handleResize);
    
    // 初始化时调用一次
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    screenWidth,
    deviceType,
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
    isLarge: deviceType === 'large',
    config: DEFAULT_RESPONSIVE_CONFIG[deviceType]
  };
};

// 媒体查询Hook
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const media = window.matchMedia(query);
      setMatches(media.matches);

      const listener = (e: MediaQueryListEvent) => {
        setMatches(e.matches);
      };

      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, [query]);

  return matches;
};

// 预定义的媒体查询
export const useBreakpoint = () => {
  const isMobile = useMediaQuery(`(max-width: ${BREAKPOINTS.mobile - 1}px)`);
  const isTablet = useMediaQuery(`(min-width: ${BREAKPOINTS.mobile}px) and (max-width: ${BREAKPOINTS.tablet - 1}px)`);
  const isDesktop = useMediaQuery(`(min-width: ${BREAKPOINTS.tablet}px) and (max-width: ${BREAKPOINTS.desktop - 1}px)`);
  const isLarge = useMediaQuery(`(min-width: ${BREAKPOINTS.desktop}px)`);

  return {
    isMobile,
    isTablet,
    isDesktop,
    isLarge,
    current: isMobile ? 'mobile' : isTablet ? 'tablet' : isDesktop ? 'desktop' : 'large'
  };
};

// 获取响应式样式配置
export const getResponsiveStyles = (deviceType: DeviceType) => {
  const config = DEFAULT_RESPONSIVE_CONFIG[deviceType];
  
  return {
    // 卡片样式
    cardStyle: {
      padding: config.cardPadding,
      marginBottom: config.spacing.cardMargin,
      borderRadius: deviceType === 'mobile' ? '8px' : '12px'
    },
    
    // 标题样式
    titleStyle: {
      fontSize: config.fontSize.title,
      marginBottom: config.spacing.componentGap,
      fontWeight: 600
    },
    
    // 正文样式
    bodyStyle: {
      fontSize: config.fontSize.body,
      lineHeight: 1.6
    },
    
    // 说明文字样式
    captionStyle: {
      fontSize: config.fontSize.caption,
      color: '#666',
      lineHeight: 1.4
    },
    
    // 间距样式
    spacingStyle: {
      sectionPadding: config.spacing.sectionPadding,
      componentGap: config.spacing.componentGap
    },
    
    // 容器样式
    containerStyle: {
      padding: `0 ${config.spacing.sectionPadding}`,
      width: '100%',
      minHeight: '100vh'
    }
  };
};

// 获取组件响应式配置
export const getComponentResponsiveConfig = (deviceType: DeviceType) => {
  const config = DEFAULT_RESPONSIVE_CONFIG[deviceType];
  
  return {
    // 日历组件配置
    calendar: {
      size: config.calendarSize,
      cellSize: deviceType === 'mobile' ? 28 : deviceType === 'tablet' ? 32 : 36,
      monthsPerRow: deviceType === 'mobile' ? 1 : 3
    },
    
    // 图表组件配置
    chart: {
      height: deviceType === 'mobile' ? 300 : deviceType === 'tablet' ? 400 : 500,
      containerCols: config.chartContainerCols,
      showLegend: deviceType !== 'mobile',
      fontSize: deviceType === 'mobile' ? 10 : 12
    },
    
    // 知识图谱配置
    knowledgeGraph: {
      width: config.knowledgeGraph.width,
      height: config.knowledgeGraph.height,
      nodeSize: config.knowledgeGraph.nodeSize,
      showLabels: deviceType !== 'mobile',
      enableDrag: deviceType !== 'mobile'
    },
    
    // 表格配置
    table: {
      scroll: deviceType === 'mobile' ? { x: 600 } : undefined,
      size: deviceType === 'mobile' ? 'small' : 'middle',
      pagination: deviceType === 'mobile' ? { pageSize: 5 } : { pageSize: 10 }
    },
    
    // 模态框配置
    modal: {
      width: deviceType === 'mobile' ? '95%' : deviceType === 'tablet' ? '80%' : 680,
      top: deviceType === 'mobile' ? 20 : 50,
      centered: deviceType === 'mobile'
    }
  };
};

// 响应式Grid配置
export const getResponsiveGridConfig = (deviceType: DeviceType) => {
  switch (deviceType) {
    case 'mobile':
      return {
        xs: 24,
        sm: 24,
        md: 24,
        lg: 24,
        xl: 24,
        xxl: 24
      };
    case 'tablet':
      return {
        xs: 24,
        sm: 24,
        md: 24,
        lg: 24,
        xl: 24,
        xxl: 24
      };
    case 'desktop':
      return {
        xs: 24,
        sm: 24,
        md: 12,
        lg: 12,
        xl: 12,
        xxl: 12
      };
    case 'large':
      return {
        xs: 24,
        sm: 24,
        md: 8,
        lg: 8,
        xl: 8,
        xxl: 8
      };
    default:
      return {
        xs: 24,
        sm: 24,
        md: 12,
        lg: 12,
        xl: 12,
        xxl: 12
      };
  }
};

// 性能优化：防抖Hook
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

// 响应式文字大小计算
export const getResponsiveFontSize = (
  baseFontSize: number, 
  deviceType: DeviceType
): number => {
  const scaleFactor = {
    mobile: 0.875,    // 14px -> 12px
    tablet: 1,        // 14px -> 14px  
    desktop: 1,       // 14px -> 14px
    large: 1.125      // 14px -> 16px
  };
  
  return Math.round(baseFontSize * scaleFactor[deviceType]);
};

// 响应式间距计算
export const getResponsiveSpacing = (
  baseSpacing: number,
  deviceType: DeviceType
): number => {
  const scaleFactor = {
    mobile: 0.75,     // 16px -> 12px
    tablet: 0.875,    // 16px -> 14px
    desktop: 1,       // 16px -> 16px
    large: 1.25       // 16px -> 20px
  };
  
  return Math.round(baseSpacing * scaleFactor[deviceType]);
}; 