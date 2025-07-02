import React, { useMemo, useCallback } from 'react';
import { Card, Typography, Row, Col, Statistic, Tag, Progress, Alert, Space, Select } from 'antd';
import { TrophyOutlined, HeartOutlined, ThunderboltOutlined, EyeOutlined } from '@ant-design/icons';
import { useResponsive, getResponsiveStyles, getComponentResponsiveConfig } from '../../utils/responsiveUtils';
import EmotionChart from './EmotionChart';
import EmotionDistribution from './EmotionDistribution';
import { 
  EMOTION_COLORS, 
  EMOTION_EMOJIS, 
  EMOTION_CHINESE_MAP,
  useEmotionAnalysisStore
} from '../../stores/emotionAnalysisStore';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface EmotionTrendData {
  date: string;
  emotion: string;
  score: number;
  timestamp: Date;
}

interface EmotionReportData {
  trends: EmotionTrendData[];
  distribution: Record<string, number>;
  totalSessions: number;
  averageScore: number;
  dominantEmotion: string;
  suggestions: string[];
  insights: {
    moodStability: number;
    positivityRatio: number;
    recentTrend: 'improving' | 'declining' | 'stable';
    weeklyComparison: number;
  };
}

interface EmotionReportProps {
  data: EmotionReportData;
  timeRange?: 'week' | 'month' | 'quarter' | 'year';
  onTimeRangeChange?: (range: 'week' | 'month' | 'quarter' | 'year') => void;
}

const EmotionReport: React.FC<EmotionReportProps> = ({
  data,
  timeRange: _timeRange = 'week', // 外部时间范围参数，现在使用统一状态管理
  onTimeRangeChange: _onTimeRangeChange // 外部回调，现在使用统一状态管理
}) => {
  // 🎯 修复：使用统一的emotion store状态管理，移除独立时间状态
  const emotionStore = useEmotionAnalysisStore();
  
  // 使用store的统一时间范围
  const currentTimeRange = emotionStore.currentTimeRange;
  
  // 🎯 添加详细调试信息：确认核心指标数据是否正确响应时间变化
  React.useEffect(() => {
    console.log('🎯 EmotionReport: 接收数据变化', {
      currentTimeRange,
      totalSessions: data.totalSessions,
      averageScore: data.averageScore,
      dominantEmotion: data.dominantEmotion,
      moodStability: data.insights.moodStability,
      positivityRatio: data.insights.positivityRatio,
      recentTrend: data.insights.recentTrend,
      weeklyComparison: data.insights.weeklyComparison,
      trendsLength: data.trends.length,
      distributionKeys: Object.keys(data.distribution).length,
      suggestionsCount: data.suggestions.length
    });
  }, [currentTimeRange, data]);
  
  // 使用useCallback优化时间范围变化处理 - 统一调用store方法
  const handleTimeRangeChange = useCallback((range: 'week' | 'month' | 'quarter' | 'year') => {
    console.log('🎯 EmotionReport: 时间范围改变，调用store更新', range);
    emotionStore.setTimeRange(range);
  }, [emotionStore]);
  // 响应式设计Hook
  const { deviceType, isMobile } = useResponsive();
  const responsiveStyles = getResponsiveStyles(deviceType);
  const componentConfig = getComponentResponsiveConfig(deviceType);
  
  const reportInsights = useMemo(() => {
    const { insights } = data;
    const stabilityLevel = insights.moodStability > 0.8 ? 'high' : 
                          insights.moodStability > 0.6 ? 'medium' : 'low';
    
    const positivityLevel = insights.positivityRatio > 0.7 ? 'high' :
                           insights.positivityRatio > 0.5 ? 'medium' : 'low';

    return {
      stabilityLevel,
      positivityLevel,
      trendDirection: insights.recentTrend,
      weeklyChange: insights.weeklyComparison
    };
  }, [data.insights]);

  const getInsightColor = (level: string) => {
    switch (level) {
      case 'high': return '#52c41a';
      case 'medium': return '#faad14';
      case 'low': return '#ff4d4f';
      default: return '#8c8c8c';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      case 'stable': return '➡️';
      default: return '➡️';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return '#52c41a';
      case 'declining': return '#ff4d4f';
      case 'stable': return '#1890ff';
      default: return '#8c8c8c';
    }
  };

  const getDominantEmotionConfig = (emotionType: string) => {
    const chineseName = EMOTION_CHINESE_MAP[emotionType] || emotionType;
    const color = EMOTION_COLORS[emotionType as keyof typeof EMOTION_COLORS] || EMOTION_COLORS.neutral;
    const emoji = EMOTION_EMOJIS[emotionType as keyof typeof EMOTION_EMOJIS] || EMOTION_EMOJIS.neutral;
    
    return {
      name: chineseName,
      color,
      icon: emoji
    };
  };

  const dominantEmotionConfig = getDominantEmotionConfig(data.dominantEmotion);

  // ✅ 新增：判断是否有数据的标志
  const hasData = data && data.totalSessions > 0;

  return (
    <div style={{ padding: responsiveStyles.spacingStyle.sectionPadding }}>
      {/* 报告标题 - 始终显示，包含时间选择器 */}
      <Card style={responsiveStyles.cardStyle}>
        <div style={{ 
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'center' : 'flex-end',
          gap: isMobile ? '12px' : '16px',
          padding: isMobile ? '12px 0' : '16px 0'
        }}>
          <div style={{ textAlign: isMobile ? 'center' : 'left', flex: 1 }}>
            <Title 
              level={isMobile ? 4 : 3} 
              style={{ ...responsiveStyles.titleStyle, marginBottom: '8px' }}
            >
              <HeartOutlined style={{ color: '#1890ff', marginRight: '8px' }} />
              {isMobile ? '情绪报告' : '情绪分析报告'}
            </Title>
            <Text type="secondary" style={responsiveStyles.captionStyle}>
              {hasData ? 
                `基于 ${data.totalSessions} 次对话的情绪分析结果` : 
                '选择不同时间范围查看情绪数据'
              }
            </Text>
          </div>
          
          {/* 🎯 关键修复：时间范围选择器始终显示，即使没有数据 */}
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: isMobile ? 'center' : 'flex-end',
            gap: '4px'
          }}>
            <Text type="secondary" style={{ 
              fontSize: isMobile ? '12px' : '13px',
              marginBottom: '4px'
            }}>
              时间范围
            </Text>
            <Select
              value={currentTimeRange}
              onChange={handleTimeRangeChange}
              style={{ 
                width: isMobile ? '140px' : '120px',
                fontSize: isMobile ? '14px' : '13px'
              }}
              size={isMobile ? 'middle' : 'small'}
            >
              <Option value="week">过去一周</Option>
              <Option value="month">过去一月</Option>
              <Option value="quarter">过去三月</Option>
              <Option value="year">过去一年</Option>
            </Select>
          </div>
        </div>
      </Card>

      {/* 🎯 条件渲染：有数据时显示报告内容，没有数据时显示空状态 */}
      {hasData ? (
        <>
          {/* 🫥 隐藏：核心指标 - 使用条件渲染方式隐藏 */}
          {false && (
            <Card 
              title={
                <span>
                  📊 {isMobile ? "指标" : "核心指标"}
                  <Text type="secondary" style={{ 
                    fontSize: isMobile ? '12px' : '13px', 
                    marginLeft: '8px',
                    fontWeight: 'normal'
                  }}>
                    ({currentTimeRange === 'week' ? '过去一周' : 
                      currentTimeRange === 'month' ? '过去一月' : 
                      currentTimeRange === 'quarter' ? '过去三月' : '过去一年'})
                  </Text>
                </span>
              }
              style={responsiveStyles.cardStyle}
            >
              <Row gutter={[isMobile ? 8 : 16, isMobile ? 12 : 16]}>
                <Col xs={12} sm={12} md={6}>
                  <Statistic
                    title={isMobile ? "对话" : "对话次数"}
                    value={data.totalSessions}
                    prefix={!isMobile ? <TrophyOutlined /> : undefined}
                    valueStyle={{ 
                      color: '#1890ff',
                      fontSize: isMobile ? '18px' : '24px'
                    }}
                  />
                </Col>
                <Col xs={12} sm={12} md={6}>
                  <Statistic
                    title={isMobile ? "强度" : "平均情绪强度"}
                    value={`${(data.averageScore * 100).toFixed(1)}%`}
                    valueStyle={{ 
                      color: getInsightColor(reportInsights.positivityLevel),
                      fontSize: isMobile ? '18px' : '24px'
                    }}
                  />
                </Col>
                <Col xs={12} sm={12} md={6}>
                  <div>
                    <Text type="secondary" style={{ fontSize: isMobile ? '12px' : '14px' }}>
                      {isMobile ? "主要" : "主要情绪"}
                    </Text>
                    <div style={{ marginTop: '4px' }}>
                      <Tag 
                        color={dominantEmotionConfig?.color}
                        style={{ 
                          fontSize: isMobile ? '14px' : '16px', 
                          padding: isMobile ? '2px 8px' : '4px 12px' 
                        }}
                      >
                        {dominantEmotionConfig?.icon} {dominantEmotionConfig?.name}
                      </Tag>
                    </div>
                  </div>
                </Col>
                <Col xs={12} sm={12} md={6}>
                  <div>
                    <Text type="secondary" style={{ fontSize: isMobile ? '12px' : '14px' }}>
                      {isMobile ? "趋势" : "情绪趋势"}
                    </Text>
                    <div style={{ marginTop: '4px' }}>
                      <Tag 
                        color={getTrendColor(reportInsights.trendDirection)}
                        style={{ 
                          fontSize: isMobile ? '14px' : '16px', 
                          padding: isMobile ? '2px 8px' : '4px 12px' 
                        }}
                      >
                        {getTrendIcon(reportInsights.trendDirection)} 
                        {reportInsights.trendDirection === 'improving' ? (isMobile ? '改善' : ' 改善中') :
                         reportInsights.trendDirection === 'declining' ? (isMobile ? '下降' : ' 下降中') : 
                         (isMobile ? '稳定' : ' 稳定')}
                      </Tag>
                    </div>
                  </div>
                </Col>
              </Row>
            </Card>
          )}

          {/* 🫥 隐藏：情绪稳定性和积极度 - 使用条件渲染方式隐藏 */}
          {false && (
            <Card 
              title={
                <span>
                  💫 {isMobile ? "健康度" : "情绪健康度"}
                  <Text type="secondary" style={{ 
                    fontSize: isMobile ? '12px' : '13px', 
                    marginLeft: '8px',
                    fontWeight: 'normal'
                  }}>
                    ({currentTimeRange === 'week' ? '过去一周' : 
                      currentTimeRange === 'month' ? '过去一月' : 
                      currentTimeRange === 'quarter' ? '过去三月' : '过去一年'})
                  </Text>
                </span>
              }
              style={responsiveStyles.cardStyle}
            >
              <Row gutter={isMobile ? 8 : 16}>
                <Col xs={24} sm={12}>
                  <div style={{ marginBottom: isMobile ? '12px' : '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <Text strong style={responsiveStyles.bodyStyle}>
                        {isMobile ? '稳定性' : '情绪稳定性'}
                      </Text>
                      <Text style={responsiveStyles.bodyStyle}>
                        {(data.insights.moodStability * 100).toFixed(0)}%
                      </Text>
                    </div>
                    <Progress 
                      percent={data.insights.moodStability * 100}
                      strokeColor={getInsightColor(reportInsights.stabilityLevel)}
                      showInfo={false}
                      size={isMobile ? 'small' : 'default'}
                    />
                    <Text type="secondary" style={responsiveStyles.captionStyle}>
                      {reportInsights.stabilityLevel === 'high' ? 
                        (isMobile ? '心理状态稳定' : '情绪波动较小，心理状态稳定') :
                       reportInsights.stabilityLevel === 'medium' ? 
                        (isMobile ? '总体正常' : '情绪有轻微波动，总体正常') :
                        (isMobile ? '建议关注心理健康' : '情绪波动较大，建议关注心理健康')}
                    </Text>
                  </div>
                </Col>
                <Col xs={24} sm={12}>
                  <div style={{ marginBottom: isMobile ? '12px' : '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <Text strong style={responsiveStyles.bodyStyle}>
                        {isMobile ? '积极占比' : '积极情绪占比'}
                      </Text>
                      <Text style={responsiveStyles.bodyStyle}>
                        {(data.insights.positivityRatio * 100).toFixed(0)}%
                      </Text>
                    </div>
                    <Progress 
                      percent={data.insights.positivityRatio * 100}
                      strokeColor={getInsightColor(reportInsights.positivityLevel)}
                      showInfo={false}
                      size={isMobile ? 'small' : 'default'}
                    />
                    <Text type="secondary" style={responsiveStyles.captionStyle}>
                      {reportInsights.positivityLevel === 'high' ? 
                        (isMobile ? '心态乐观' : '积极情绪占主导，心态乐观') :
                       reportInsights.positivityLevel === 'medium' ? 
                        (isMobile ? '心态平和' : '积极情绪适中，心态平和') :
                        (isMobile ? '建议调节心态' : '消极情绪较多，建议调节心态')}
                    </Text>
                  </div>
                </Col>
              </Row>

              {/* 周变化提示 */}
              {Math.abs(reportInsights.weeklyChange) > 0.1 && (
                <Alert
                  type={reportInsights.weeklyChange > 0 ? 'success' : 'warning'}
                  message={
                    reportInsights.weeklyChange > 0 
                      ? `本周情绪较上周提升了 ${(reportInsights.weeklyChange * 100).toFixed(1)}%` 
                      : `本周情绪较上周下降了 ${(Math.abs(reportInsights.weeklyChange) * 100).toFixed(1)}%`
                  }
                  showIcon
                  style={{ marginTop: '12px' }}
                />
              )}
            </Card>
          )}

          {/* 图表区域 */}
          <div style={{ marginBottom: isMobile ? '48px' : responsiveStyles.cardStyle.marginBottom }}>
            {/* 主要情绪变化趋势 - 全宽显示 */}
            <div style={{ marginBottom: isMobile ? '8px' : '16px' }}>
              <EmotionChart 
                data={data.trends}
                title={isMobile ? "主要趋势" : "主要情绪变化趋势"}
                height={componentConfig.chart.height}
                timeRange={currentTimeRange}
                onTimeRangeChange={handleTimeRangeChange}
              />
            </div>
            
            {/* 情绪分布 - 全宽显示 */}
            <div style={{ marginBottom: isMobile ? '40px' : '0px' }}>
              <EmotionDistribution 
                data={data.distribution}
                title={isMobile ? "分布" : "情绪分布"}
                height={isMobile ? 600 : componentConfig.chart.height}
                timeRange={currentTimeRange}
                onTimeRangeChange={handleTimeRangeChange}
                useOSSData={false}
                showLegend={false}
              />
            </div>
          </div>

          {/* 个性化建议 */}
          <Card 
            title={isMobile ? "💡 建议" : "💡 个性化建议"} 
            style={{
              ...responsiveStyles.cardStyle,
              marginTop: isMobile ? '32px' : '0px',
              paddingTop: isMobile ? '8px' : '0px'
            }}
          >
            <div style={{ 
              background: '#f9f9f9', 
              padding: isMobile ? '12px' : '16px', 
              borderRadius: '8px' 
            }}>
              {data.suggestions.length > 0 ? (
                <Space direction="vertical" style={{ width: '100%' }} size={isMobile ? 8 : 12}>
                  {data.suggestions.slice(0, isMobile ? 3 : 5).map((suggestion, index) => (
                    <div key={index} style={{ 
                      display: 'flex', 
                      alignItems: 'flex-start',
                      gap: isMobile ? '6px' : '8px'
                    }}>
                      <ThunderboltOutlined 
                        style={{ 
                          color: '#1890ff', 
                          marginTop: '4px',
                          flexShrink: 0,
                          fontSize: isMobile ? '12px' : '14px'
                        }} 
                      />
                      <Text style={responsiveStyles.bodyStyle}>{suggestion}</Text>
                    </div>
                  ))}
                  {data.suggestions.length > (isMobile ? 3 : 5) && (
                    <Text type="secondary" style={responsiveStyles.captionStyle}>
                      还有 {data.suggestions.length - (isMobile ? 3 : 5)} 条建议...
                    </Text>
                  )}
                </Space>
              ) : (
                <Text type="secondary" style={responsiveStyles.bodyStyle}>
                  {isMobile ? '继续聊天获取建议' : '暂无个性化建议，继续与AI聊天获取更多洞察'}
                </Text>
              )}
            </div>
          </Card>

          {/* 数据说明 */}
          <Card size="small" style={{ ...responsiveStyles.cardStyle, marginBottom: 0 }}>
            <Text type="secondary" style={responsiveStyles.captionStyle}>
              {isMobile ? 
                '* 此报告仅供参考，如有心理健康问题请寻求专业帮助。' :
                '* 此报告基于您与AI的对话内容进行情绪分析生成，仅供参考。如有严重心理健康问题，请及时寻求专业帮助。'
              }
            </Text>
          </Card>
        </>
      ) : (
        // 🎯 空状态显示：没有数据时的友好提示，但保留时间选择器
        <Card style={responsiveStyles.cardStyle}>
          <div style={{ 
            textAlign: 'center', 
            padding: '48px 16px',
            color: 'var(--text-secondary)'
          }}>
            <EyeOutlined style={{ 
              fontSize: '48px', 
              marginBottom: '16px',
              color: '#d9d9d9'
            }} />
            <Title level={4} type="secondary" style={{ marginBottom: '8px' }}>
              {currentTimeRange === 'week' ? '过去一周无情绪数据' :
               currentTimeRange === 'month' ? '过去一月无情绪数据' :
               currentTimeRange === 'quarter' ? '过去三月无情绪数据' : '过去一年无情绪数据'}
            </Title>
            <Paragraph type="secondary" style={{ marginBottom: '16px' }}>
              尝试切换到其他时间范围，或开始与AI聊天生成新的情绪数据
            </Paragraph>
            
            {/* 🎯 快速切换时间范围的按钮组 */}
            <Space wrap>
              {['week', 'month', 'quarter', 'year'].map((range) => (
                <button
                  key={range}
                  onClick={() => handleTimeRangeChange(range as any)}
                  style={{
                    padding: '6px 12px',
                    border: currentTimeRange === range ? '2px solid #1890ff' : '1px solid #d9d9d9',
                    borderRadius: '6px',
                    background: currentTimeRange === range ? '#f0f9ff' : '#fff',
                    color: currentTimeRange === range ? '#1890ff' : '#666',
                    cursor: 'pointer',
                    fontSize: '13px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (currentTimeRange !== range) {
                      e.currentTarget.style.borderColor = '#40a9ff';
                      e.currentTarget.style.color = '#40a9ff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentTimeRange !== range) {
                      e.currentTarget.style.borderColor = '#d9d9d9';
                      e.currentTarget.style.color = '#666';
                    }
                  }}
                >
                  {range === 'week' ? '过去一周' :
                   range === 'month' ? '过去一月' :
                   range === 'quarter' ? '过去三月' : '过去一年'}
                </button>
              ))}
            </Space>
          </div>
        </Card>
      )}
    </div>
  );
};

export default EmotionReport; 