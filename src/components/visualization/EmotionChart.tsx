import React, { useMemo, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, Typography, Select, Space } from 'antd';
import dayjs from 'dayjs';
import { EMOTION_COLORS, EMOTION_CATEGORY_MAP, EMOTION_CHINESE_MAP } from '../../stores/emotionAnalysisStore';

const { Title } = Typography;
const { Option } = Select;

interface EmotionTrendData {
  date: string;
  emotion: string;
  score: number;
  timestamp: Date;
  // 添加新的数据结构支持
  emotions?: Array<{
    emotion: string;
    intensity: number;
  }>;
}

interface EmotionChartProps {
  data: EmotionTrendData[];
  title?: string;
  height?: number;
  timeRange?: 'week' | 'month' | 'quarter' | 'year';
  onTimeRangeChange?: (range: 'week' | 'month' | 'quarter' | 'year') => void;
  showControls?: boolean;
}

const EmotionChart: React.FC<EmotionChartProps> = ({
  data = [],
  title = '情绪时间轴',
  height = 400,
  timeRange = 'week',
  onTimeRangeChange,
  showControls = true
}) => {

  // 🎯 直接使用传入的数据，信任Store层已经过滤了正确的时间范围
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    console.log(`🎯 EmotionChart: 接收数据 ${timeRange}`, {
      dataLength: data.length,
      dateRange: data.length > 0 ? 
        `${data[0].date} 到 ${data[data.length - 1].date}` : 
        '无数据',
      sampleData: data.slice(0, 3)
    });

    return data;
  }, [data, timeRange]);

  // 🎯 生成基于实际数据范围的完整时间范围
  const fullTimeRange = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      console.log('🎯 EmotionChart: 无数据，返回空时间范围');
      return [];
    }

    // 使用实际数据的日期范围，而不是基于当前时间计算
    const sortedData = [...chartData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const startDate = new Date(sortedData[0].date);
    const endDate = new Date(sortedData[sortedData.length - 1].date);

    const dates = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      dates.push(dayjs(current).format('YYYY-MM-DD'));
      current.setDate(current.getDate() + 1);
    }
    
    console.log(`🎯 EmotionChart: 基于数据的完整时间范围`, {
      timeRange,
      totalDays: dates.length,
      firstDay: dates[0],
      lastDay: dates[dates.length - 1],
      actualDataDays: chartData.length
    });
    
    return dates;
  }, [chartData, timeRange]);

  // 🎯 情绪时间轴数据处理
  const timelineData = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];
    
    // 按日期分组数据
    const groupedData = chartData.reduce((acc, item) => {
      const date = dayjs(item.timestamp).format('YYYY-MM-DD');
      if (!acc[date]) {
        acc[date] = {
          date,
          emotions: [],
          rawData: []
        };
      }
      
      // 如果有详细的emotions数据，使用它；否则从原始数据构造
      if (item.emotions && item.emotions.length > 0) {
        acc[date].emotions.push(...item.emotions);
      } else {
        // 从原始数据构造emotion对象
        acc[date].emotions.push({
          emotion: item.emotion,
          intensity: item.score
        });
      }
      acc[date].rawData.push(item);
      return acc;
    }, {} as Record<string, { 
      date: string; 
      emotions: Array<{emotion: string; intensity: number}>; 
      rawData: EmotionTrendData[] 
    }>);

    // 计算每日的情绪强度值
    return Object.values(groupedData).map(dayData => {
      let activeIntensity = 0;
      let passiveIntensity = 0;
      let maxIntensityEmotion = { emotion: 'neutral', intensity: 0 };
      
      // 计算主动/被动情绪强度
      dayData.emotions.forEach(emotionData => {
        const category = EMOTION_CATEGORY_MAP[emotionData.emotion] || 'neutral';
        const intensity = emotionData.intensity;
        
        // 记录最高强度的情绪（用于颜色）
        if (intensity > maxIntensityEmotion.intensity) {
          maxIntensityEmotion = emotionData;
        }
        
        if (category === 'active') {
          activeIntensity += intensity;
        } else if (category === 'passive') {
          passiveIntensity += intensity;
        }
      });
      
      // 计算净情绪强度：主动为正，被动为负
      const netIntensity = activeIntensity - passiveIntensity;
      
      // 归一化到 -1 到 1 范围，然后乘以100转为百分数
      const totalIntensity = activeIntensity + passiveIntensity;
      let normalizedIntensity = 0;
      
      if (totalIntensity > 0) {
        // 计算相对强度，范围在-1到1之间
        normalizedIntensity = netIntensity / totalIntensity;
        
        // 如果总强度很小，减小影响
        const intensityFactor = Math.min(totalIntensity, 1);
        normalizedIntensity *= intensityFactor;
      }
      
      // 转换为-100到100的百分数
      const finalScore = normalizedIntensity * 100;
      
      return {
        date: dayData.date,
        score: finalScore,
        dominantEmotion: maxIntensityEmotion.emotion,
        dominantColor: EMOTION_COLORS[maxIntensityEmotion.emotion] || EMOTION_COLORS.neutral,
        activeIntensity,
        passiveIntensity,
        totalIntensity,
        timestamp: new Date(dayData.date)
      };
    }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [chartData]);

  // 🎨 图表配置
  const chartOption = useMemo(() => {
    // 🎯 创建数据映射：将timelineData映射到完整时间范围
    const dataMap = new Map(timelineData.map(item => [item.date, item]));
    
    // 创建主要数据点（映射到完整时间范围）
    const pointData = fullTimeRange.map((date, index) => {
      const dayData = dataMap.get(date);
      if (dayData) {
        return {
          value: [index, dayData.score, dayData.dominantEmotion, dayData.dominantColor], // 使用index而不是date
          itemStyle: {
            color: dayData.dominantColor,
            borderWidth: 2,
            borderColor: '#fff'
          }
        };
      } else {
        return null; // 没有数据的日期返回null
      }
    }).filter(item => item !== null); // 过滤掉null值

    // 创建渐变色线段series
    const lineSeries = [];
    for (let i = 0; i < timelineData.length - 1; i++) {
      const currentPoint = timelineData[i];
      const nextPoint = timelineData[i + 1];
      
      // 找到当前点和下一点在完整时间范围中的索引
      const currentIndex = fullTimeRange.indexOf(currentPoint.date);
      const nextIndex = fullTimeRange.indexOf(nextPoint.date);
      
      if (currentIndex !== -1 && nextIndex !== -1) {
        lineSeries.push({
          type: 'line',
          xAxisIndex: 0, // 确保使用同一个x轴
          data: [
            [currentIndex, currentPoint.score], // 使用索引而不是日期
            [nextIndex, nextPoint.score]
          ],
          smooth: true,
          symbol: 'none', // 不显示点
          lineStyle: {
            width: 3,
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                {
                  offset: 0,
                  color: currentPoint.dominantColor
                },
                {
                  offset: 1,
                  color: nextPoint.dominantColor
                }
              ]
            }
          },
          // 隐藏这些系列在图例中的显示
          legendHoverLink: false,
          silent: true // 不响应鼠标事件
        });
      }
    }

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
        trigger: 'axis',
        formatter: (params: any) => {
          // 找到点数据（第一个series）
          const pointParam = params.find((p: any) => p.seriesType === 'line' && p.data.value);
          if (!pointParam) return '';
          
          const [index, score, emotion, color] = pointParam.data.value;
          const date = fullTimeRange[index]; // 🎯 从完整时间范围获取日期
          const emotionCn = EMOTION_CHINESE_MAP[emotion] || emotion;
          const tendency = score > 20 ? '高度主动' : 
                          score > 0 ? '主动' : 
                          score === 0 ? '中性' : 
                          score > -20 ? '被动' : '高度被动';
          
          return `
            <div style="text-align: left;">
              <div><strong>${date}</strong></div>
              <div>主导情绪: <span style="color: ${color}">●</span> ${emotionCn}</div>
              <div>情绪倾向: ${tendency}</div>
              <div>强度值: ${score.toFixed(1)}</div>
            </div>
          `;
        }
      },
      xAxis: {
        type: 'category',
        data: fullTimeRange, // 🎯 使用完整时间范围而不是仅有数据的日期
        axisLabel: {
          formatter: (value: string) => {
            // 🎯 根据时间范围调整标签格式
            switch (timeRange) {
              case 'week':
                return dayjs(value).format('MM/DD');
              case 'month':
                return dayjs(value).format('MM/DD');
              case 'quarter':
                return dayjs(value).format('MM/DD');
              case 'year':
                // 一年数据，只显示月份，减少x轴拥挤
                const day = dayjs(value).date();
                return day === 1 ? dayjs(value).format('MM/DD') : ''; // 只显示每月1号
              default:
                return dayjs(value).format('MM/DD');
            }
          },
          interval: timeRange === 'year' ? 0 : 'auto', // 年份视图强制显示所有标签（已过滤）
          rotate: timeRange === 'year' ? 45 : 0 // 年份视图旋转标签避免重叠
        },
        // 🎯 设置x轴的显示范围，确保显示完整时间段
        min: 0,
        max: fullTimeRange.length - 1
      },
      yAxis: {
        type: 'value',
        min: -100,
        max: 100,
        interval: 50,
        axisLabel: {
          formatter: (value: number) => {
            const labels = {
              '-100': '高度被动',
              '-50': '被动', 
              '0': '中性',
              '50': '主动',
              '100': '高度主动'
            };
            return labels[value.toString() as keyof typeof labels] || value.toString();
          }
        },
        splitLine: {
          lineStyle: {
            type: 'dashed',
            opacity: 0.5
          }
        },
        // 添加零线
        axisLine: {
          show: true,
          onZero: false
        }
      },
      series: [
        // 主要数据点系列
        {
          type: 'line',
          xAxisIndex: 0, // 确保使用同一个x轴
          data: pointData,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: {
            width: 0, // 不显示线
            opacity: 0
          },
          // 为不同区域添加渐变填充
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                {
                  offset: 0,
                  color: 'rgba(82, 196, 26, 0.3)' // 主动情绪区域 - 绿色
                },
                {
                  offset: 0.5,
                  color: 'rgba(140, 140, 140, 0.1)' // 中性区域 - 灰色
                },
                {
                  offset: 1,
                  color: 'rgba(255, 77, 79, 0.3)' // 被动情绪区域 - 红色
                }
              ]
            }
          }
        },
        // 渐变色线段系列
        ...lineSeries
      ],
      grid: {
        left: '15%',
        right: '10%',
        bottom: '15%',
        top: '20%'
      },
      // 添加参考线
      graphic: [
        {
          type: 'line',
          shape: {
            x1: '15%',
            y1: '50%',
            x2: '90%',
            y2: '50%'
          },
          style: {
            stroke: '#666',
            lineWidth: 1,
            lineDash: [4, 4]
          }
        }
      ]
    };
  }, [timelineData, title, fullTimeRange, timeRange]);

  const handleTimeRangeChange = useCallback((value: string) => {
    // 添加防抖处理，避免频繁调用
    const newTimeRange = value as 'week' | 'month' | 'quarter' | 'year';
    if (newTimeRange !== timeRange) {
      onTimeRangeChange?.(newTimeRange);
    }
  }, [onTimeRangeChange, timeRange]);

  if (data.length === 0) {
    return (
      <Card style={{ height }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          flexDirection: 'column',
          color: 'var(--text-secondary)'
        }}>
          <Title level={5} type="secondary">暂无情绪数据</Title>
          <p>开始聊天后将显示情绪时间轴</p>
        </div>
      </Card>
    );
  }

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
      style={{ height }}
      bodyStyle={{ height: showControls ? height - 60 : height - 40 }}
    >
      <ReactECharts 
        option={chartOption} 
        style={{ height: '100%', width: '100%' }}
        opts={{ renderer: 'svg' }}
        notMerge={true} // 强制重新渲染，确保数据更新
        lazyUpdate={true} // 延迟更新，提升性能
      />
    </Card>
  );
};

export default EmotionChart; 