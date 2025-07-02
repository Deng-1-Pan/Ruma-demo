import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Typography, Progress, Space, Button, Drawer, Badge } from 'antd';
import { MonitorOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { useResponsive } from '../../utils/responsiveUtils';
import { usePerformanceMonitor, useMemoryMonitor } from '../../utils/performanceUtils';

const { Text, Title } = Typography;

// 性能指标接口
interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  loadTime: number;
  renderTime: number;
  interactionLatency: number;
  cacheHitRate: number;
}

// 性能警告级别
type WarningLevel = 'good' | 'warning' | 'critical';

// 性能建议接口
interface PerformanceSuggestion {
  type: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  action?: () => void;
}

// 移动端性能监控配置
interface MobilePerformanceConfig {
  autoOptimize: boolean;
  showFPS: boolean;
  showMemory: boolean;
  maxSamples: number;
  updateInterval: number;
}

// 默认配置
const DEFAULT_CONFIG: MobilePerformanceConfig = {
  autoOptimize: true,
  showFPS: true,
  showMemory: true,
  maxSamples: 100,
  updateInterval: 1000
};

// 性能监控Hook
const usePerformanceMetrics = (config: MobilePerformanceConfig) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memoryUsage: 0,
    loadTime: 0,
    renderTime: 0,
    interactionLatency: 0,
    cacheHitRate: 100
  });
  
  const [samples, setSamples] = useState<PerformanceMetrics[]>([]);
  const [isActive, setIsActive] = useState(false);
  
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const rafId = useRef<number>();
  
  // FPS计算
  const calculateFPS = useCallback(() => {
    const now = performance.now();
    frameCount.current++;
    
    if (now - lastTime.current >= 1000) {
      const fps = Math.round((frameCount.current * 1000) / (now - lastTime.current));
      frameCount.current = 0;
      lastTime.current = now;
      
      setMetrics(prev => ({ ...prev, fps: Math.min(fps, 60) }));
    }
    
    if (isActive) {
      rafId.current = requestAnimationFrame(calculateFPS);
    }
  }, [isActive]);

  // 内存使用情况
  const { memoryInfo } = useMemoryMonitor(config.updateInterval);
  
  // 性能数据收集
  const performanceData = usePerformanceMonitor('MobileApp');

  // 更新性能指标
  useEffect(() => {
    if (!isActive) return;
    
    const timer = setInterval(() => {
      const newMetrics: PerformanceMetrics = {
        ...metrics,
        memoryUsage: memoryInfo?.percentage || 0,
        loadTime: performance.now(), // 简化的加载时间
        renderTime: Math.random() * 20, // 模拟渲染时间
        interactionLatency: Math.random() * 50, // 模拟交互延迟
        cacheHitRate: 85 + Math.random() * 15 // 模拟缓存命中率
      };
      
      setMetrics(newMetrics);
      
      // 保存样本数据
      setSamples(prev => {
        const newSamples = [...prev, newMetrics];
        return newSamples.slice(-config.maxSamples);
      });
    }, config.updateInterval);

    return () => clearInterval(timer);
  }, [isActive, config, memoryInfo, performanceData, metrics]);

  // 启动/停止监控
  const toggleMonitoring = useCallback(() => {
    setIsActive(prev => !prev);
  }, []);

  // FPS监控
  useEffect(() => {
    if (isActive && config.showFPS) {
      rafId.current = requestAnimationFrame(calculateFPS);
    }
    
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [isActive, config.showFPS, calculateFPS]);

  return {
    metrics,
    samples,
    isActive,
    toggleMonitoring,
    clearSamples: () => setSamples([])
  };
};

// 性能分析和建议
const usePerformanceAnalysis = (metrics: PerformanceMetrics) => {
  return {
    getWarningLevel: (metric: keyof PerformanceMetrics): WarningLevel => {
      const value = metrics[metric];
      
      switch (metric) {
        case 'fps':
          if (value >= 50) return 'good';
          if (value >= 30) return 'warning';
          return 'critical';
          
        case 'memoryUsage':
          if (value <= 60) return 'good';
          if (value <= 80) return 'warning';
          return 'critical';
          
        case 'renderTime':
          if (value <= 16) return 'good';
          if (value <= 33) return 'warning';
          return 'critical';
          
        case 'interactionLatency':
          if (value <= 100) return 'good';
          if (value <= 300) return 'warning';
          return 'critical';
          
        default:
          return 'good';
      }
    },
    
    getSuggestions: (): PerformanceSuggestion[] => {
      const suggestions: PerformanceSuggestion[] = [];
      
      if (metrics.fps < 30) {
        suggestions.push({
          type: 'fps',
          message: 'FPS过低，建议关闭动画效果或降低渲染质量',
          priority: 'high'
        });
      }
      
      if (metrics.memoryUsage > 80) {
        suggestions.push({
          type: 'memory',
          message: '内存使用过高，建议清理缓存',
          priority: 'high',
          action: () => {
            // 清理缓存逻辑
            if ('caches' in window) {
              caches.keys().then(names => {
                names.forEach(name => caches.delete(name));
              });
            }
          }
        });
      }
      
      if (metrics.renderTime > 33) {
        suggestions.push({
          type: 'render',
          message: '渲染时间过长，建议优化组件结构',
          priority: 'medium'
        });
      }
      
      return suggestions;
    },
    
    getOverallScore: (): number => {
      const fpsScore = Math.min(metrics.fps / 60 * 100, 100);
      const memoryScore = Math.max(100 - metrics.memoryUsage, 0);
      const renderScore = Math.max(100 - (metrics.renderTime / 33) * 100, 0);
      
      return Math.round((fpsScore + memoryScore + renderScore) / 3);
    }
  };
};

// 主组件
interface MobilePerformanceMonitorProps {
  config?: Partial<MobilePerformanceConfig>;
  onOptimize?: (suggestions: PerformanceSuggestion[]) => void;
}

const MobilePerformanceMonitor: React.FC<MobilePerformanceMonitorProps> = ({
  config = {},
  onOptimize
}) => {
  const { isMobile } = useResponsive();
  const [showDrawer, setShowDrawer] = useState(false);
  
  const actualConfig = { ...DEFAULT_CONFIG, ...config };
  const { metrics, samples, isActive, toggleMonitoring, clearSamples } = usePerformanceMetrics(actualConfig);
  const { getWarningLevel, getSuggestions, getOverallScore } = usePerformanceAnalysis(metrics);
  
  const overallScore = getOverallScore();
  const suggestions = getSuggestions();
  
  // 获取性能状态颜色
  const getStatusColor = (level: WarningLevel) => {
    switch (level) {
      case 'good': return '#52c41a';
      case 'warning': return '#faad14';
      case 'critical': return '#ff4d4f';
    }
  };

  // 渲染性能指标卡片
  const renderMetricCard = (
    title: string,
    value: number,
    suffix: string,
    metric: keyof PerformanceMetrics
  ) => {
    const level = getWarningLevel(metric);
    const color = getStatusColor(level);
    
    return (
      <Card size="small" style={{ textAlign: 'center' }}>
        <Text type="secondary" style={{ fontSize: '12px' }}>{title}</Text>
        <div style={{ margin: '4px 0' }}>
          <Text style={{ 
            fontSize: '18px', 
            fontWeight: 'bold', 
            color 
          }}>
            {Math.round(value)}{suffix}
          </Text>
        </div>
        <Progress 
          percent={metric === 'memoryUsage' ? value : (value / (metric === 'fps' ? 60 : 100)) * 100} 
          strokeColor={color}
          showInfo={false}
          size="small"
        />
      </Card>
    );
  };

  // 性能建议列表
  const renderSuggestions = () => (
    <div style={{ marginTop: '16px' }}>
      <Title level={5}>性能建议</Title>
      {suggestions.length === 0 ? (
        <Text type="secondary">性能良好，无需优化</Text>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }}>
          {suggestions.map((suggestion, index) => (
            <Card
              key={index}
              size="small"
              style={{
                borderLeft: `4px solid ${
                  suggestion.priority === 'high' ? '#ff4d4f' :
                  suggestion.priority === 'medium' ? '#faad14' : '#52c41a'
                }`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: '13px' }}>{suggestion.message}</Text>
                {suggestion.action && (
                  <Button size="small" type="link" onClick={suggestion.action}>
                    修复
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </Space>
      )}
    </div>
  );

  // 性能历史图表（简化版）
  const renderPerformanceChart = () => {
    const recentSamples = samples.slice(-20);
    const maxValue = Math.max(...recentSamples.map(s => s.fps));
    
    return (
      <div style={{ marginTop: '16px' }}>
        <Title level={5}>FPS历史</Title>
        <div style={{ 
          display: 'flex', 
          alignItems: 'end', 
          height: '60px',
          gap: '2px',
          marginTop: '8px'
        }}>
          {recentSamples.map((sample, index) => (
            <div
              key={index}
              style={{
                flex: 1,
                height: `${(sample.fps / maxValue) * 100}%`,
                backgroundColor: getStatusColor(getWarningLevel('fps')),
                opacity: 0.7,
                borderRadius: '1px'
              }}
            />
          ))}
        </div>
      </div>
    );
  };

  if (!isMobile) {
    return null; // 仅在移动端显示
  }

  return (
    <>
      {/* 浮动性能监控按钮 */}
      <div
        style={{
          position: 'fixed',
          bottom: '80px',
          right: '16px',
          zIndex: 1000
        }}
      >
        <Badge
          count={suggestions.length}
          offset={[-4, 4]}
          size="small"
        >
          <Button
            type="primary"
            shape="circle"
            icon={<MonitorOutlined />}
            onClick={() => setShowDrawer(true)}
            style={{
              backgroundColor: getStatusColor(
                overallScore >= 80 ? 'good' : 
                overallScore >= 60 ? 'warning' : 'critical'
              ),
              border: 'none',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
            }}
          />
        </Badge>
      </div>

      {/* 性能监控抽屉 */}
      <Drawer
        title="性能监控"
        placement="bottom"
        closable={true}
        onClose={() => setShowDrawer(false)}
        open={showDrawer}
        height="70%"
        extra={
          <Space>
            <Button 
              size="small" 
              onClick={toggleMonitoring}
              type={isActive ? 'default' : 'primary'}
            >
              {isActive ? '停止' : '开始'}
            </Button>
            <Button 
              size="small" 
              icon={<DeleteOutlined />}
              onClick={clearSamples}
            >
              清除
            </Button>
          </Space>
        }
      >
        <div style={{ padding: '0 8px' }}>
          {/* 总体性能评分 */}
          <Card style={{ marginBottom: '16px', textAlign: 'center' }}>
            <Title level={4} style={{ margin: '8px 0' }}>
              性能评分
            </Title>
            <Progress
              type="circle"
              percent={overallScore}
              format={percent => `${percent}分`}
              strokeColor={getStatusColor(
                overallScore >= 80 ? 'good' : 
                overallScore >= 60 ? 'warning' : 'critical'
              )}
              size={80}
            />
          </Card>

          {/* 性能指标 */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '8px',
            marginBottom: '16px'
          }}>
            {renderMetricCard('FPS', metrics.fps, '', 'fps')}
            {renderMetricCard('内存', metrics.memoryUsage, '%', 'memoryUsage')}
            {renderMetricCard('渲染', metrics.renderTime, 'ms', 'renderTime')}
            {renderMetricCard('响应', metrics.interactionLatency, 'ms', 'interactionLatency')}
          </div>

          {/* 性能历史 */}
          {samples.length > 0 && renderPerformanceChart()}

          {/* 性能建议 */}
          {renderSuggestions()}

          {/* 自动优化 */}
          {suggestions.length > 0 && onOptimize && (
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={() => onOptimize(suggestions)}
                block
              >
                自动优化
              </Button>
            </div>
          )}
        </div>
      </Drawer>
    </>
  );
};

export default MobilePerformanceMonitor; 