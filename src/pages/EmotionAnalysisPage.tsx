import React, { useState, useMemo } from 'react';
import { Layout, Typography, Tabs, Button, Card, Spin, Alert } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import EmotionReport from '../components/visualization/EmotionReport';
import EmotionCalendar from '../components/visualization/EmotionCalendar';
// import EmotionKnowledgeGraph from '../components/visualization/EmotionKnowledgeGraph';
import InteractiveEmotionGraph from '../components/visualization/InteractiveEmotionGraph';
// ExportShareDialog 已移除 - UI简化
import { useEmotionAnalysisStore } from '../stores/emotionAnalysisStore';
import { useResponsive, getResponsiveStyles, getComponentResponsiveConfig } from '../utils/responsiveUtils';
import { usePerformanceMonitor, useMemoryMonitor, getAllCacheStats } from '../utils/performanceUtils';
// Mobile Test 功能已移除 - 避免自动滚动副作用
// import { useMobileTest, checkMobileCompatibility, testMobileInteractions, getMobileDebugInfo } from '../utils/mobileTestUtils';

const { Title } = Typography;
const { TabPane } = Tabs;
const { Header, Content } = Layout;
// RangePicker 已移除 - UI简化

interface EmotionAnalysisPageProps {
  onBack?: () => void;
}

const EmotionAnalysisPage: React.FC<EmotionAnalysisPageProps> = ({ 
  onBack = () => window.location.href = '/chat' 
}) => {
  const emotionStore = useEmotionAnalysisStore();
  const [activeTab, setActiveTab] = useState<'report' | 'trends' | 'distribution' | 'calendar' | 'knowledge'>('report');
  // 导出分享功能已移除 - UI简化
  
  // 响应式设计Hook
  const { deviceType, isMobile } = useResponsive();
  const responsiveStyles = getResponsiveStyles(deviceType);
  const componentConfig = getComponentResponsiveConfig(deviceType);
  
  // 性能监控Hook
  const { measureRender, trackInteraction } = usePerformanceMonitor('EmotionAnalysisPage');
  const memoryInfo = useMemoryMonitor(30000); // 30秒检查一次内存
  
  // Mobile Test 功能已移除 - 避免自动滚动副作用

  // 初始化数据加载
  React.useEffect(() => {
    measureRender('initial-load');
    trackInteraction('page-init');
    
    // 🎯 添加详细的调试信息
    console.log('🎭 EmotionAnalysisPage: Starting data load');
    console.log('🎭 Current emotion store state:', {
      isLoading: emotionStore.isLoading,
      error: emotionStore.error,
      analysisResult: emotionStore.analysisResult,
      summaryData: emotionStore.summaryData?.length || 0,
      currentTimeRange: emotionStore.currentTimeRange,
      lastUpdated: emotionStore.lastUpdated
    });
    
    emotionStore.loadSummaryData();
  }, [measureRender, trackInteraction]);

  // 监听emotion store状态变化
  React.useEffect(() => {
    console.log('🎭 EmotionStore state changed:', {
      isLoading: emotionStore.isLoading,
      error: emotionStore.error,
      analysisResult: !!emotionStore.analysisResult,
      summaryDataCount: emotionStore.summaryData?.length || 0,
      lastUpdated: emotionStore.lastUpdated
    });
  }, [
    emotionStore.isLoading, 
    emotionStore.error, 
    emotionStore.analysisResult, 
    emotionStore.summaryData,
    emotionStore.lastUpdated
  ]);

  // 性能监控和内存警告
  React.useEffect(() => {
    if (memoryInfo && memoryInfo.usedJSMemory > 100) { // 超过100MB警告
      console.warn('[Performance] High memory usage:', memoryInfo);
    }
    
    // 定期输出缓存统计
    const cacheStats = getAllCacheStats();
    if (cacheStats.emotionAnalysis.size > 0 || cacheStats.emotionAggregation.size > 0) {
      console.log('[Performance] Cache stats:', cacheStats);
    }
  }, [memoryInfo]);

  // Mobile Test 适配测试已移除 - 避免自动滚动副作用

  // 从emotion store获取分析结果
  const emotionData = useMemo(() => {
    if (!emotionStore.analysisResult) {
      console.log('🎯 EmotionAnalysisPage: 没有分析结果，返回空数据');
      return {
        trends: [],
        distribution: {},
        totalSessions: 0,
        averageScore: 0,
        dominantEmotion: 'neutral',
        suggestions: [],
        insights: {
          moodStability: 0,
          positivityRatio: 0,
          recentTrend: 'stable' as const,
          weeklyComparison: 0
        }
      };
    }

    const result = emotionStore.analysisResult;

    // 🎯 详细输出核心统计数据，确认时间范围影响
    console.log('🎯 EmotionAnalysisPage: 核心统计数据', {
      timeRange: result.timeRange,
      dateRange: result.dateRange.map(d => d.toLocaleDateString()),
      totalRecords: result.statistics.totalRecords,
      averageIntensity: result.statistics.averageIntensity,
      dominantEmotion: result.statistics.dominantEmotion,
      moodStability: result.statistics.moodStability,
      positivityRatio: result.statistics.positivityRatio,
      trendsLength: result.trends.timePoints.length,
      aggregationsLength: result.aggregations.length
    });

    // 转换为现有组件期望的格式
    const trends = result.trends.timePoints.map(point => ({
      date: point.date,
      emotion: point.dominantEmotion,
      score: point.averageIntensity,
      timestamp: new Date(point.date)
    }));
    
    console.log('🎯 EmotionAnalysisPage: trends数据', {
      length: trends.length, 
      firstPoint: trends[0],
      lastPoint: trends[trends.length - 1]
    });

    // 转换聚合数据为分布格式
    const distribution = result.aggregations.reduce((acc, agg) => {
      acc[agg.emotion] = agg.count;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('🎯 EmotionAnalysisPage: 分布数据', {
      emotionCount: Object.keys(distribution).length,
      topEmotions: Object.entries(distribution)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([emotion, count]) => `${emotion}:${count}`)
    });

    const finalData = {
      trends,
      distribution,
      totalSessions: result.statistics.totalRecords,
      averageScore: result.statistics.averageIntensity,
      dominantEmotion: result.statistics.dominantEmotion,
      suggestions: result.suggestions,
      insights: {
        moodStability: result.statistics.moodStability,
        positivityRatio: result.statistics.positivityRatio,
        recentTrend: result.statistics.recentTrend,
        weeklyComparison: result.statistics.weeklyChange
      }
    };
    
    // 🎯 输出最终转换结果
    console.log('🎯 EmotionAnalysisPage: 最终emotionData', {
      totalSessions: finalData.totalSessions,
      averageScore: finalData.averageScore,
      dominantEmotion: finalData.dominantEmotion,
      moodStability: finalData.insights.moodStability,
      positivityRatio: finalData.insights.positivityRatio,
      recentTrend: finalData.insights.recentTrend,
      suggestionsCount: finalData.suggestions.length
    });
    
    return finalData;
  }, [
    emotionStore.analysisResult, 
    emotionStore.currentTimeRange, 
    emotionStore.lastUpdated,
    emotionStore.cacheKey // 🎯 修复：添加cacheKey依赖，确保缓存更新时重新计算
  ]);

  // 这些函数现在由EmotionAnalysisStore处理，不再需要本地实现

  const handleTimeRangeChange = (range: 'week' | 'month' | 'quarter' | 'year') => {
    trackInteraction(`time-range-change-${range}`);
    emotionStore.setTimeRange(range);
  };

  // handleCustomDateRangeChange 已移除 - 日期选择器UI已移除

  const handleTabChange = (tab: 'report' | 'trends' | 'distribution' | 'calendar' | 'knowledge') => {
    trackInteraction(`tab-change-${tab}`);
    measureRender(`tab-${tab}`);
    setActiveTab(tab);
  };

  // 导出和分享处理函数已移除 - UI简化

  // 移动端顶部导航栏
  const renderMobileHeader = () => (
    <Header style={{
      background: '#fff',
      borderBottom: '1px solid #e8e8e8',
      padding: '0 16px',
      height: '56px',
      lineHeight: '56px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />}
          onClick={onBack}
          style={{ padding: '8px' }}
        />
        <div>
          <Title level={5} style={{ margin: 0, fontSize: '16px' }}>情绪分析</Title>
          <div style={{ fontSize: '10px', color: '#8c8c8c', lineHeight: 1 }}>
            数据洞察
          </div>
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {emotionStore.isLoading && (
          <Spin size="small" />
        )}
        {emotionStore.error && (
          <Button 
            type="text" 
            icon={<ReloadOutlined />}
            onClick={() => emotionStore.refreshData()}
            style={{ padding: '4px', color: '#ff4d4f' }}
          />
        )}
      </div>
    </Header>
  );

  // 移动端布局
  if (isMobile) {
    return (
      <Layout style={{ 
        minHeight: '100vh', 
        width: '100%', 
        background: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* 移动端顶部导航栏 */}
        {renderMobileHeader()}
        
        {/* 主内容区域 */}
        <Content style={{ 
          flex: 1,
          overflow: 'auto',
          padding: '8px'
        }}>
          {/* 开发环境调试信息 - 移动端精简显示 */}
          {process.env.NODE_ENV === 'development' && (
            <Card 
              style={{ 
                marginBottom: '8px',
                borderRadius: '8px'
              }} 
              title="🐛 调试" 
              size="small"
            >
              <div style={{ fontSize: '10px', fontFamily: 'monospace' }}>
                <div><strong>状态:</strong> {emotionStore.isLoading ? '加载中' : emotionStore.error ? '错误' : '正常'}</div>
                <div><strong>数据:</strong> {emotionStore.summaryData?.length || 0} 条记录</div>
                <div><strong>时间范围:</strong> {emotionStore.currentTimeRange}</div>
              </div>
            </Card>
          )}

          {/* 加载状态 */}
          {emotionStore.isLoading && (
            <Card style={{ 
              marginBottom: '8px',
              borderRadius: '8px'
            }}>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Spin size="large" />
                <div style={{ marginTop: '12px', color: '#666', fontSize: '14px' }}>
                  正在加载数据...
                </div>
              </div>
            </Card>
          )}

          {/* 错误状态 */}
          {emotionStore.error && (
            <Card style={{ 
              marginBottom: '8px',
              borderRadius: '8px'
            }}>
              <Alert
                message="加载失败"
                description={emotionStore.error}
                type="error"
                showIcon
                action={
                  <Button 
                    size="small" 
                    icon={<ReloadOutlined />}
                    onClick={() => emotionStore.refreshData()}
                  >
                    重试
                  </Button>
                }
              />
            </Card>
          )}

          {/* 分析内容 - 移动端优化的标签页 */}
          {!emotionStore.isLoading && !emotionStore.error && (
            <Card style={{ 
              borderRadius: '8px',
              padding: '0'
            }}>
              <Tabs 
                activeKey={activeTab} 
                onChange={handleTabChange as any}
                tabPosition="top"
                size="small"
                centered
                style={{ 
                  margin: 0
                }}
                tabBarStyle={{
                  marginBottom: '8px',
                  padding: '0 8px'
                }}
              >
                <TabPane tab="📊 报告" key="report">
                  <div style={{ padding: '8px' }}>
                    <EmotionReport 
                      data={emotionData}
                      timeRange={emotionStore.currentTimeRange}
                      onTimeRangeChange={handleTimeRangeChange}
                    />
                  </div>
                </TabPane>

                <TabPane tab="🗓️ 日历" key="calendar">
                  <div style={{ padding: '8px', textAlign: 'center' }}>
                    <EmotionCalendar 
                      data={emotionStore.analysisResult?.calendar || []}
                      title="情绪日历"
                      size="small"
                      onDateSelect={(date, emotions) => {
                        console.log('Selected date:', date, emotions);
                      }}
                    />
                  </div>
                </TabPane>

                <TabPane tab="🕸️ 图谱" key="knowledge">
                  <div style={{ 
                    padding: '8px',
                    overflowX: 'auto',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <InteractiveEmotionGraph 
                      data={emotionStore.analysisResult?.knowledgeGraph || { 
                        nodes: [], 
                        edges: [], 
                        statistics: { 
                          totalNodes: 0, 
                          totalEdges: 0, 
                          dominantCauses: [],
                          emotionNodeCount: 0,
                          causeNodeCount: 0,
                          avgConnections: 0,
                          maxWeight: 0,
                          strongestConnections: [],
                          clusters: []
                        } 
                      }}
                      title="情绪关系图谱"
                      height={300}
                      className="emotion-knowledge-graph"
                    />
                  </div>
                </TabPane>
              </Tabs>
            </Card>
          )}
        </Content>
      </Layout>
    );
  }

  // 桌面端布局
  return (
    <Layout style={{ minHeight: '100vh', width: '100%', background: '#f5f5f5' }}>
      <div style={responsiveStyles.containerStyle}>
        {/* 页面头部 */}
        <Card style={responsiveStyles.cardStyle}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexDirection: 'row',
            gap: '0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Button 
                type="text" 
                icon={<ArrowLeftOutlined />} 
                onClick={onBack}
                size="middle"
              >
                返回
              </Button>
              <Title 
                level={3} 
                style={{ ...responsiveStyles.titleStyle, margin: 0 }}
              >
                情绪分析
              </Title>
            </div>
          </div>
        </Card>

        {/* 开发环境调试信息 */}
        {process.env.NODE_ENV === 'development' && (
          <Card 
            style={responsiveStyles.cardStyle} 
            title="🐛 调试信息" 
            size="small"
          >
            <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
              <div><strong>Loading:</strong> {emotionStore.isLoading ? 'true' : 'false'}</div>
              <div><strong>Error:</strong> {emotionStore.error || 'none'}</div>
              <div><strong>Summary Data Count:</strong> {emotionStore.summaryData?.length || 0}</div>
              <div><strong>Analysis Result:</strong> {emotionStore.analysisResult ? 'exists' : 'null'}</div>
              <div><strong>Last Updated:</strong> {emotionStore.lastUpdated?.toLocaleString() || 'never'}</div>
              <div><strong>Current Time Range:</strong> {emotionStore.currentTimeRange}</div>
              <div><strong>Cache Key:</strong> {emotionStore.cacheKey || 'none'}</div>
              {emotionStore.analysisResult && (
                <div>
                  <strong>Aggregations:</strong> {emotionStore.analysisResult.aggregations?.length || 0}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* 分析内容 */}
        {emotionStore.isLoading && (
          <Card style={responsiveStyles.cardStyle}>
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin size="large" />
              <div style={{ marginTop: '16px', color: '#666' }}>
                正在加载情绪分析数据...
              </div>
            </div>
          </Card>
        )}

        {emotionStore.error && (
          <Card style={responsiveStyles.cardStyle}>
            <Alert
              message="数据加载失败"
              description={emotionStore.error}
              type="error"
              showIcon
              action={
                <Button 
                  size="small" 
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    console.log('🔄 Manual refresh triggered by user');
                    emotionStore.refreshData();
                  }}
                >
                  重新加载
                </Button>
              }
            />
          </Card>
        )}

        {!emotionStore.isLoading && !emotionStore.error && (
          <Tabs 
            activeKey={activeTab} 
            onChange={handleTabChange as any}
            tabPosition={isMobile ? 'top' : 'top'}
            size={isMobile ? 'small' : 'middle'}
            style={{ 
              background: 'white',
              borderRadius: responsiveStyles.cardStyle.borderRadius,
              padding: responsiveStyles.spacingStyle.sectionPadding,
              marginBottom: responsiveStyles.cardStyle.marginBottom
            }}
          >
            <TabPane tab={isMobile ? "📊 报告" : "📊 分析报告"} key="report">
              <EmotionReport 
                data={emotionData}
                timeRange={emotionStore.currentTimeRange}
                onTimeRangeChange={handleTimeRangeChange}
              />
            </TabPane>

            <TabPane tab={isMobile ? "🗓️ 日历" : "🗓️ 情绪日历"} key="calendar">
              <div style={{ 
                padding: responsiveStyles.spacingStyle.componentGap,
                textAlign: 'center'
              }}>
                <EmotionCalendar 
                  data={emotionStore.analysisResult?.calendar || []}
                  title="情绪日历热图"
                  size={componentConfig.calendar.size}
                  onDateSelect={(date, emotions) => {
                    console.log('Selected date:', date, emotions);
                    // TODO: 添加日期选择处理逻辑
                  }}
                />
              </div>
            </TabPane>

            <TabPane tab={isMobile ? "🕸️ 图谱" : "🕸️ 关系图谱"} key="knowledge">
              <div style={{ 
                padding: responsiveStyles.spacingStyle.componentGap,
                overflowX: isMobile ? 'auto' : 'visible',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                width: '100%'
              }}>
                <InteractiveEmotionGraph 
                  data={emotionStore.analysisResult?.knowledgeGraph || { 
                    nodes: [], 
                    edges: [], 
                    statistics: { 
                      totalNodes: 0, 
                      totalEdges: 0, 
                      dominantCauses: [],
                      emotionNodeCount: 0,
                      causeNodeCount: 0,
                      avgConnections: 0,
                      maxWeight: 0,
                      strongestConnections: [],
                      clusters: []
                    } 
                  }}
                  title="🧠 情绪原因关系图谱"
                  height={componentConfig.knowledgeGraph.height}
                  className="emotion-knowledge-graph"
                />
              </div>
            </TabPane>
          </Tabs>
        )}

        {/* 导出分享对话框已移除 - UI简化 */}
      </div>
    </Layout>
  );
};

export default EmotionAnalysisPage; 