import React, { useMemo } from 'react';
import { Card, Row, Col, Statistic, Progress, Tag, Empty } from 'antd';
import { SmileOutlined, FrownOutlined, MehOutlined, ThunderboltOutlined } from '@ant-design/icons';

interface EmotionStatsProps {
  emotionData: Array<{
    date: string;
    emotions: { [key: string]: number };
  }>;
  loading?: boolean;
  className?: string;
}

interface EmotionSummary {
  emotionType: string;
  average: number;
  total: number;
  percentage: number;
  color: string;
  icon: React.ReactNode;
}

const EmotionStats: React.FC<EmotionStatsProps> = ({
  emotionData,
  loading = false,
  className
}) => {
  const stats = useMemo(() => {
    if (!emotionData || emotionData.length === 0) return null;

    // 情绪配置
    const emotionConfig: { [key: string]: { color: string; icon: React.ReactNode } } = {
      'happiness': { color: '#52c41a', icon: <SmileOutlined /> },
      'gratitude': { color: '#1890ff', icon: <SmileOutlined /> },
      'anxiety': { color: '#ff4d4f', icon: <FrownOutlined /> },
      'sadness': { color: '#722ed1', icon: <FrownOutlined /> },
      'anger': { color: '#fa541c', icon: <ThunderboltOutlined /> },
      'stress': { color: '#fa8c16', icon: <ThunderboltOutlined /> },
      'confusion': { color: '#faad14', icon: <MehOutlined /> },
      'neutral': { color: '#8c8c8c', icon: <MehOutlined /> }
    };

    // 计算总体统计
    const emotionTotals: { [key: string]: number } = {};
    const emotionCounts: { [key: string]: number } = {};
    
    emotionData.forEach(item => {
      Object.entries(item.emotions).forEach(([emotion, value]) => {
        emotionTotals[emotion] = (emotionTotals[emotion] || 0) + value;
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      });
    });

    // 计算总分
    const totalScore = Object.values(emotionTotals).reduce((sum, value) => sum + value, 0);

    // 生成情绪汇总
    const emotionSummaries: EmotionSummary[] = Object.entries(emotionTotals)
      .map(([emotion, total]) => ({
        emotionType: emotion,
        average: total / (emotionCounts[emotion] || 1),
        total,
        percentage: totalScore > 0 ? (total / totalScore) * 100 : 0,
        color: emotionConfig[emotion]?.color || '#1890ff',
        icon: emotionConfig[emotion]?.icon || <MehOutlined />
      }))
      .sort((a, b) => b.average - a.average);

    // 计算主要情绪类型
    const dominantEmotion = emotionSummaries[0];
    
    // 情绪趋势（最近vs早期）
    const midPoint = Math.floor(emotionData.length / 2);
    const recentData = emotionData.slice(midPoint);
    const earlierData = emotionData.slice(0, midPoint);
    
    const getAverageEmotion = (data: typeof emotionData) => {
      const totals: { [key: string]: number } = {};
      const counts: { [key: string]: number } = {};
      
      data.forEach(item => {
        Object.entries(item.emotions).forEach(([emotion, value]) => {
          totals[emotion] = (totals[emotion] || 0) + value;
          counts[emotion] = (counts[emotion] || 0) + 1;
        });
      });
      
      return Object.entries(totals).reduce((acc, [emotion, total]) => {
        acc[emotion] = total / (counts[emotion] || 1);
        return acc;
      }, {} as { [key: string]: number });
    };

    const recentAvg = getAverageEmotion(recentData);
    const earlierAvg = getAverageEmotion(earlierData);

    return {
      totalRecords: emotionData.length,
      dominantEmotion,
      emotionSummaries,
      recentAvg,
      earlierAvg,
      totalEmotionTypes: emotionSummaries.length
    };
  }, [emotionData]);

  if (loading) {
    return (
      <Card className={className} loading={true}>
        <div style={{ height: '200px' }} />
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className={className}>
        <Empty 
          description="暂无统计数据"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  const { totalRecords, dominantEmotion, emotionSummaries, totalEmotionTypes } = stats;

  return (
    <div className={className}>
      {/* 总体统计 */}
      <Card title="总体统计" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={12} sm={6}>
            <Statistic
              title="历史记录"
              value={totalRecords}
              suffix="条"
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="情绪类型"
              value={totalEmotionTypes}
              suffix="种"
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="主要情绪"
              value={dominantEmotion.emotionType}
              valueStyle={{ color: dominantEmotion.color }}
              prefix={dominantEmotion.icon}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="平均强度"
              value={dominantEmotion.average}
              precision={1}
              suffix="%"
              valueStyle={{ color: dominantEmotion.color }}
            />
          </Col>
        </Row>
      </Card>

      {/* 情绪分布 */}
      <Card title="情绪分布">
        <Row gutter={[16, 16]}>
          {emotionSummaries.slice(0, 6).map((emotion) => (
            <Col xs={24} sm={12} key={emotion.emotionType}>
              <div style={{ marginBottom: 8 }}>
                <span style={{ marginRight: 8 }}>
                  {emotion.icon}
                </span>
                <span style={{ textTransform: 'capitalize', marginRight: 8 }}>
                  {emotion.emotionType}
                </span>
                <Tag color={emotion.color}>
                  {emotion.average.toFixed(1)}%
                </Tag>
              </div>
              <Progress
                percent={emotion.percentage}
                strokeColor={emotion.color}
                showInfo={false}
                size="small"
              />
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
};

export default EmotionStats; 