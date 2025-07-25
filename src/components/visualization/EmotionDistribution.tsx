import React, { useMemo, useCallback, useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, Typography, Row, Col, Statistic, Select, Space } from 'antd';
import { EMOTION_COLORS, EMOTION_EMOJIS, EMOTION_CATEGORY_MAP, EMOTION_CHINESE_MAP, useEmotionAnalysisStore } from '../../stores/emotionAnalysisStore';

const { Title } = Typography;
const { Option } = Select;

interface EmotionDistributionProps {
  data: Record<string, number>;
  // 如果需要基于原始数据进行时间过滤，可以传入原始数据
  rawData?: Array<{
    date: string;
    emotion: string;
    timestamp: Date;
    [key: string]: any;
  }>;
  title?: string;
  height?: number;
  showStats?: boolean;
  timeRange?: 'week' | 'month' | 'quarter' | 'year';
  onTimeRangeChange?: (range: 'week' | 'month' | 'quarter' | 'year') => void;
  showControls?: boolean;
  // 新增：是否使用OSS原始数据进行时间过滤
  useOSSData?: boolean;
  // 新增：是否显示图例
  showLegend?: boolean;
}

const EmotionDistribution: React.FC<EmotionDistributionProps> = ({
  data = {},
  rawData,
  title = '情绪分布',
  height = 400,
  showStats = true,
  timeRange = 'week',
  onTimeRangeChange,
  showControls = true,
  useOSSData = false,
  showLegend = true
}) => {
  // 响应式检测
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    // 初始检测
    checkMobile();
    
    // 监听窗口大小变化
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  // 🎯 修复：使用统一的情绪配置系统
  const getEmotionConfig = (emotion: string) => {
    const category = EMOTION_CATEGORY_MAP[emotion] || 'neutral';
    
    return {
      name: getEmotionChinese(emotion),
      color: EMOTION_COLORS[emotion] || EMOTION_COLORS['neutral'],
      emoji: EMOTION_EMOJIS[emotion] || EMOTION_EMOJIS['neutral'],
      category
    };
  };

  // 使用完整的情绪中文名称映射
  const getEmotionChinese = (emotion: string): string => {
    return EMOTION_CHINESE_MAP[emotion] || emotion;
  };

  // 获取emotion store来访问原始数据
  const emotionStore = useEmotionAnalysisStore();

  // 🎯 根据时间范围过滤数据并计算分布
  const distributionData = useMemo(() => {
    let finalData: Record<string, number> = {};
    
    // 如果使用OSS数据模式，直接从store获取原始summaryData
    if (useOSSData) {
      console.log('🎯 EmotionDistribution: 使用OSS原始数据模式');
      console.log('🎯 EmotionDistribution: emotionStore状态', {
        summaryData: emotionStore.summaryData?.length || 0,
        isLoading: emotionStore.isLoading,
        error: emotionStore.error,
        analysisResult: !!emotionStore.analysisResult
      });
      
      if (!emotionStore.summaryData || emotionStore.summaryData.length === 0) {
        console.log('🎯 EmotionDistribution: OSS数据为空，使用fallback data');
        finalData = data;
      } else {
        console.log('🎯 EmotionDistribution: OSS数据总数', emotionStore.summaryData.length);
        console.log('🎯 EmotionDistribution: OSS数据结构样本', emotionStore.summaryData.slice(0, 1));
        
        // 🎯 使用与emotionAnalysisStore中相同的日期范围计算逻辑
        const now = new Date();
        let startDate: Date;
        let endDate: Date;
        
                 switch (timeRange) {
           case 'week':
             startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
             endDate = new Date(now);
             break;
           case 'month':
             // 近一月：从30天前开始到今天
             startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
             endDate = new Date(now);
             break;
           case 'quarter':
             // 近三月：从90天前开始到今天
             startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
             endDate = new Date(now);
             break;
           case 'year':
             // 近一年：从365天前开始到今天
             startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
             endDate = new Date(now);
             break;
           default:
             // 默认近一月
             startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
             endDate = new Date(now);
         }

        console.log(`🎯 EmotionDistribution: 时间过滤范围 ${timeRange}`, {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });
        
        let totalEmotionRecords = 0;
        emotionStore.summaryData.forEach((summary, index) => {
          // 🎯 正确解析OSS数据的timestamp格式
          // OSS数据格式: "2025-04-16 23:29:32"
          let summaryDate: Date;
          try {
            if (typeof summary.timestamp === 'string') {
              // 将 "2025-04-16 23:29:32" 格式转换为ISO格式
              const isoTimestamp = summary.timestamp.replace(' ', 'T') + '.000Z';
              summaryDate = new Date(isoTimestamp);
            } else {
              summaryDate = new Date(summary.timestamp);
            }
            
            // 🚀 修复：验证日期是否有效，防止Invalid Date导致toISOString()报错
            if (isNaN(summaryDate.getTime())) {
              console.warn(`🎯 EmotionDistribution: timestamp ${summary.timestamp} 解析为无效日期，跳过`);
              return;
            }
          } catch (error) {
            console.warn(`🎯 EmotionDistribution: 无法解析timestamp ${summary.timestamp}，跳过`);
            return;
          }
          
          // 🚀 修复：只有在日期有效时才调用toISOString()
          console.log(`🎯 EmotionDistribution: 处理summary ${index}`, {
            original_timestamp: summary.timestamp,
            parsed_date: summaryDate.toISOString(), // 现在安全了
            in_range: summaryDate >= startDate && summaryDate <= now,
            detected_emotions_count: summary.detected_emotions?.length || 0
          });
          
          // 🎯 检查是否在时间范围内
          if (summaryDate >= startDate && summaryDate <= endDate) {
            if (summary.detected_emotions && Array.isArray(summary.detected_emotions)) {
              summary.detected_emotions.forEach(emotion => {
                console.log(`🎯 EmotionDistribution: 添加emotion ${emotion.emotion}`);
                finalData[emotion.emotion] = (finalData[emotion.emotion] || 0) + 1;
                totalEmotionRecords++;
              });
            }
          }
        });

        console.log(`🎯 EmotionDistribution: 时间过滤结果 - 总数据=${emotionStore.summaryData.length}, 时间范围内=${totalEmotionRecords}条`);
        console.log('🎯 EmotionDistribution: 最终情绪分布', finalData);
      }
    } else if (rawData && rawData.length > 0) {
      // 使用传入的rawData进行时间过滤 - 使用统一的日期计算逻辑
      const now = new Date();
      let startDate: Date;
      let endDate: Date;
      
              switch (timeRange) {
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            endDate = new Date(now);
            break;
          case 'month':
            // 近一月：从30天前开始到今天
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            endDate = new Date(now);
            break;
          case 'quarter':
            // 近三月：从90天前开始到今天
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            endDate = new Date(now);
            break;
          case 'year':
            // 近一年：从365天前开始到今天
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            endDate = new Date(now);
            break;
          default:
            // 默认近一月
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            endDate = new Date(now);
        }

      // 过滤数据并重新计算分布
      const filteredData = rawData.filter(item => {
        const itemDate = new Date(item.timestamp);
        // 🚀 修复：验证日期是否有效
        if (isNaN(itemDate.getTime())) {
          console.warn(`🎯 EmotionDistribution: rawData中的timestamp ${item.timestamp} 解析为无效日期，跳过`);
          return false;
        }
        return itemDate >= startDate && itemDate <= endDate;
      });

      console.log(`🎯 EmotionDistribution: 时间范围=${timeRange}, 原始数据=${rawData.length}条, 过滤后=${filteredData.length}条`);
      console.log('🎯 EmotionDistribution: 原始数据样本', rawData.slice(0, 3));
      console.log('🎯 EmotionDistribution: 过滤后数据样本', filteredData.slice(0, 3));

      // 重新计算情绪分布
      filteredData.forEach(item => {
        finalData[item.emotion] = (finalData[item.emotion] || 0) + 1;
      });
      
      console.log('🎯 EmotionDistribution: 重新计算的情绪分布', finalData);
    } else {
      // 没有原始数据时使用传入的分布数据
      console.log('🎯 EmotionDistribution: 使用传入的分布数据', data);
      finalData = data;
    }
    
    const total = Object.values(finalData).reduce((sum, count) => sum + count, 0);
    console.log('🎯 EmotionDistribution: finalData总数', total);
    
    if (total === 0) return [];

    return Object.entries(finalData)
      .map(([emotion, count]) => ({
        emotion,
        count,
        percentage: (count / total) * 100,
        config: getEmotionConfig(emotion)
      }))
      .sort((a, b) => b.count - a.count);
  }, [data, rawData, timeRange, useOSSData, emotionStore.summaryData]);

  // 提前计算这些变量，供chartOption使用
  const dominantEmotion = distributionData[0];
  const totalCount = distributionData.reduce((sum, item) => sum + item.count, 0);

  const chartOption = useMemo(() => {
    const pieData = distributionData.map(item => ({
      name: item.config.name,
      value: item.count,
      itemStyle: {
        color: item.config.color
      },
      emoji: item.config.emoji
    }));

    return {
      title: {
        text: title,
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'normal'
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const percentage = params.percent.toFixed(1);
          const item = distributionData.find(d => d.config.name === params.name);
          const emoji = item?.config.emoji || '';
          return `${emoji} ${params.name}<br/>数量: ${params.value}次<br/>占比: ${percentage}%`;
        },
        backgroundColor: '#fff',
        borderColor: '#d9d9d9',
        borderWidth: 1,
        textStyle: {
          fontSize: 14,
          color: '#333'
        }
      },
      legend: showLegend ? {
        orient: 'vertical',
        left: 'left',
        top: 'middle',
        formatter: (name: string) => {
          const item = distributionData.find(d => d.config.name === name);
          return `${item?.config.emoji || ''} ${name}`;
        },
        textStyle: {
          fontSize: 13
        },
        itemWidth: 14,
        itemHeight: 14
      } : {
        show: false
      },
              series: [
        {
          type: 'pie',
          radius: isMobile ? ['35%', '65%'] : ['40%', '70%'],
          center: showLegend ? ['60%', '50%'] : (isMobile ? ['50%', '45%'] : ['50%', '50%']),  // 移动端饼图上移
          avoidLabelOverlap: false,
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 18,
              fontWeight: 'bold',
              formatter: (params: any) => {
                const item = distributionData.find(d => d.config.name === params.name);
                const emoji = item?.config.emoji || '';
                return `${emoji}\n${params.name}\n${params.percent.toFixed(1)}%`;
              }
            }
          },
          labelLine: {
            show: false
          },
          data: pieData
        }
      ]
    };
  }, [distributionData, title, totalCount, dominantEmotion]);

  const handleTimeRangeChange = useCallback((value: string) => {
    const newTimeRange = value as 'week' | 'month' | 'quarter' | 'year';
    if (newTimeRange !== timeRange) {
      console.log('🎯 EmotionDistribution: 时间范围变化', newTimeRange);
      onTimeRangeChange?.(newTimeRange);
    }
  }, [onTimeRangeChange, timeRange]);

  // 🎯 修改显示逻辑：即使没有数据也显示时间选择器
  return (
    <Card
      title={showControls ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{title}</span>
          <Space>
            <Select
              value={timeRange} 
              onChange={handleTimeRangeChange}
              style={{ width: 100 }}
              size="small"
            >
              <Option value="week">近一周</Option>
              <Option value="month">近一月</Option>
              <Option value="quarter">近三月</Option>
              <Option value="year">近一年</Option>
            </Select>
          </Space>
        </div>
      ) : title}
      style={{ width: '100%' }}
    >
      <div style={{ width: '100%' }}>
        {totalCount === 0 ? (
          // 🎯 没有数据时的显示：保持时间选择器可见
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: isMobile ? '250px' : '300px',
            flexDirection: 'column',
            color: 'var(--text-secondary)'
          }}>
            <Title level={5} type="secondary">暂无情绪数据</Title>
            <p>当前时间范围内没有情绪记录</p>
          </div>
        ) : (
          // 🎯 有数据时的正常显示
          <>
            {showStats && (
              <Row gutter={16} style={{ marginBottom: isMobile ? '12px' : '16px' }}>
                <Col span={8}>
                  <Statistic 
                    title="总记录数" 
                    value={totalCount}
                    valueStyle={{ fontSize: isMobile ? '16px' : '18px', color: '#1890ff' }}
                    suffix="条"
                  />
                </Col>
                <Col span={8}>
                  <Statistic 
                    title="主要情绪" 
                    value={dominantEmotion?.config.name || '无'}
                    valueStyle={{ 
                      fontSize: isMobile ? '14px' : '16px', 
                      color: dominantEmotion?.config.color || '#666',
                      fontWeight: 'bold'
                    }}
                    prefix={<span style={{ fontSize: isMobile ? '18px' : '20px' }}>{dominantEmotion?.config.emoji}</span>}
                  />
                </Col>
                <Col span={8}>
                  <Statistic 
                    title="占比" 
                    value={dominantEmotion?.percentage.toFixed(1) || '0'}
                    suffix="%"
                    valueStyle={{ 
                      fontSize: isMobile ? '16px' : '18px',
                      color: dominantEmotion?.config.color || '#666'
                    }}
                  />
                </Col>
              </Row>
            )}
            
            {/* 图表区域 - 移除右边的情绪详情，饼图占满整个区域 */}
            <div style={{ height: isMobile ? '350px' : '400px', width: '100%' }}>
              <ReactECharts 
                option={chartOption} 
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'svg' }}
              />
            </div>
            
            {/* 情绪分布详情列表 */}
            {distributionData.length > 1 && (
              <div style={{ 
                marginTop: isMobile ? '20px' : '16px',
                paddingBottom: isMobile ? '20px' : '10px',
                zIndex: 1 // 确保详情列表在正确的层级
              }}>
                <Title level={5} style={{ 
                  marginBottom: isMobile ? '12px' : '12px', 
                  color: '#666',
                  fontSize: isMobile ? '16px' : '18px'
                }}>
                  📋 详细分布
                </Title>
                <div style={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  maxHeight: isMobile ? '300px' : '150px', // 使用最大高度，允许内容自适应
                  overflowY: 'auto',
                  marginBottom: isMobile ? '16px' : '0px',
                  border: isMobile ? '1px solid #f0f0f0' : 'none',
                  borderRadius: isMobile ? '6px' : '0px',
                  padding: isMobile ? '8px' : '0px',
                  position: 'relative', // 确保定位正确
                  zIndex: 1 // 确保列表在正确的层级
                }}>
                  {distributionData.map((item) => (
                    <div 
                      key={item.emotion}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: isMobile ? '8px 12px' : '6px 12px',
                        backgroundColor: '#fafafa',
                        borderRadius: '6px',
                        borderLeft: `4px solid ${item.config.color}`,
                        fontSize: isMobile ? '14px' : '13px',
                        minHeight: isMobile ? '44px' : '36px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        <span style={{ 
                          fontSize: isMobile ? '18px' : '16px', 
                          marginRight: isMobile ? '12px' : '8px',
                          flexShrink: 0
                        }}>
                          {item.config.emoji}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ 
                            fontWeight: 'bold', 
                            color: item.config.color,
                            fontSize: isMobile ? '15px' : '13px',
                            lineHeight: '1.2',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {item.config.name}
                          </div>
                          <div style={{ 
                            color: '#666',
                            fontSize: isMobile ? '12px' : '11px',
                            lineHeight: '1.2',
                            marginTop: '2px'
                          }}>
                            {item.count}次
                          </div>
                        </div>
                      </div>
                      <div style={{ 
                        fontWeight: 'bold',
                        color: item.config.color,
                        fontSize: isMobile ? '16px' : '14px',
                        minWidth: isMobile ? '50px' : '45px',
                        textAlign: 'right',
                        flexShrink: 0
                      }}>
                        {item.percentage.toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
};

export default EmotionDistribution; 