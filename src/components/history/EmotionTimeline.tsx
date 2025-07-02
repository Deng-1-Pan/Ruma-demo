import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { Card, Empty, Spin } from 'antd';

interface EmotionTimelineProps {
  emotionData: Array<{
    date: string;
    emotions: { [key: string]: number };
  }>;
  loading?: boolean;
  className?: string;
}

const EmotionTimeline: React.FC<EmotionTimelineProps> = ({
  emotionData,
  loading = false,
  className
}) => {
  const plotData = useMemo(() => {
    if (!emotionData || emotionData.length === 0) return [];

    // 获取所有可能的情绪类型
    const emotionTypes = new Set<string>();
    emotionData.forEach(item => {
      Object.keys(item.emotions).forEach(emotion => {
        emotionTypes.add(emotion);
      });
    });

    // 情绪类型到颜色的映射
    const emotionColors: { [key: string]: string } = {
      'anxiety': '#ff4d4f',      // 焦虑 - 红色
      'sadness': '#722ed1',      // 悲伤 - 紫色
      'anger': '#fa541c',        // 愤怒 - 橙红色
      'stress': '#fa8c16',       // 压力 - 橙色
      'happiness': '#52c41a',    // 快乐 - 绿色
      'gratitude': '#1890ff',    // 感激 - 蓝色
      'confusion': '#faad14',    // 困惑 - 黄色
      'neutral': '#8c8c8c'       // 中性 - 灰色
    };

    // 为每种情绪创建一条线
    return Array.from(emotionTypes).map(emotionType => ({
      x: emotionData.map(item => item.date),
      y: emotionData.map(item => item.emotions[emotionType] || 0),
      type: 'scatter' as const,
      mode: 'lines+markers' as const,
      name: emotionType.charAt(0).toUpperCase() + emotionType.slice(1),
      line: {
        color: emotionColors[emotionType] || '#1890ff',
        width: 2
      },
      marker: {
        size: 6,
        color: emotionColors[emotionType] || '#1890ff'
      }
    }));
  }, [emotionData]);

  const layout = {
    title: {
      text: '情绪变化时间轴',
      font: { size: 16, color: '#262626' }
    },
    xaxis: {
      title: { text: '日期' },
      type: 'date' as const,
      tickformat: '%Y-%m-%d'
    },
    yaxis: {
      title: { text: '情绪强度' },
      range: [0, 1],
      tickformat: '.1%'
    },
    showlegend: true,
    legend: {
      x: 0,
      y: 1,
      bgcolor: 'rgba(255,255,255,0.8)',
      bordercolor: '#e8e8e8',
      borderwidth: 1
    },
    margin: { t: 50, r: 20, b: 50, l: 60 },
    hovermode: 'x unified' as const,
    plot_bgcolor: '#fafafa',
    paper_bgcolor: 'white'
  };

  const config = {
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['pan2d', 'select2d', 'lasso2d', 'resetScale2d'] as any,
    toImageButtonOptions: {
      format: 'png' as const,
      filename: 'emotion_timeline',
      height: 500,
      width: 800,
      scale: 1
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <p style={{ marginTop: 16, color: '#8c8c8c' }}>加载情绪时间轴数据...</p>
        </div>
      </Card>
    );
  }

  if (!emotionData || emotionData.length === 0) {
    return (
      <Card className={className}>
        <Empty 
          description="暂无情绪数据"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  return (
    <Card 
      className={className}
      bodyStyle={{ padding: '16px' }}
    >
      <Plot
        data={plotData}
        layout={layout}
        config={config}
        style={{ width: '100%', height: '400px' }}
        useResizeHandler={true}
      />
    </Card>
  );
};

export default EmotionTimeline; 