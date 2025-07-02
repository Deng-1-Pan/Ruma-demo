import React, { useState, useMemo, useEffect } from 'react';
import { Layout, Typography, Space, Button, /* DatePicker, Select, Input, Row, Col, */ message, Card, Spin, Alert, Switch } from 'antd';
import { SearchOutlined, ArrowLeftOutlined, CloudOutlined, DatabaseOutlined, ReloadOutlined } from '@ant-design/icons';
// import { Dayjs } from 'dayjs'; // 已临时隐藏，因对应功能被注释
import dayjs from 'dayjs';
import { ChatHistory, HistoryFilter } from '../types';
import { HistoryMetadata, ChatHistoryData } from '../types/history';
import HistoryList from '../components/history/HistoryList';
import HistoryDetail from '../components/history/HistoryDetail';
// import VirtualList from '../components/common/VirtualList';
import PullToRefresh from '../components/common/PullToRefresh';
import { useChatSessions, useChatActions } from '../stores';
import { useUserStore } from '../stores/userStore';
import historyService from '../services/historyService';
import { useResponsive } from '../utils/responsiveUtils';

const { Title, Text } = Typography;
// 以下变量因对应功能已暂时隐藏而被注释，恢复功能时需取消注释：
// const { RangePicker } = DatePicker;
// const { Option } = Select;
// const { Search } = Input;
const { Sider, Content, Header } = Layout;

interface HistoryPageProps {
  onBack?: () => void;
}

const HistoryPage: React.FC<HistoryPageProps> = ({ 
  onBack = () => window.location.href = '/chat' 
}) => {
  // 🔧 移除全局body样式控制，改用精确的容器级控制
  // 响应式检测
  const { isMobile } = useResponsive();
  
  // Store状态
  const sessions = useChatSessions();
  const { deleteSession } = useChatActions();
  const { user } = useUserStore();

  // 本地状态
  const [selectedHistory, setSelectedHistory] = useState<ChatHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [cloudHistoryLoading, setCloudHistoryLoading] = useState(false);
  const [cloudHistoryError, setCloudHistoryError] = useState<string | null>(null);
  

  
  // 已临时隐藏，因搜索筛选功能被注释：
  const [filter/*, setFilter*/] = useState<HistoryFilter>({
    sortBy: 'date',
    sortOrder: 'desc'
  });

  
  // 云端历史记录状态
  const [cloudHistories, setCloudHistories] = useState<HistoryMetadata[]>([]);
  const [useCloudHistory, setUseCloudHistory] = useState(!!user); // 如果用户已登录，默认使用云端历史
  const [cloudPagination, setCloudPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    hasMore: false
  });

  // 加载云端历史记录
  const loadCloudHistory = async (resetData = false) => {
    if (!user) return;
    
    try {
      setCloudHistoryLoading(true);
      setCloudHistoryError(null);
      
      const page = resetData ? 1 : cloudPagination.page;
      const params = {
        page,
        limit: cloudPagination.limit,
        type: 'all' as const,
        startDate: filter.dateRange?.[0] ? dayjs(filter.dateRange[0]).format('YYYY-MM-DD') : undefined,
        endDate: filter.dateRange?.[1] ? dayjs(filter.dateRange[1]).format('YYYY-MM-DD') : undefined,
        threadId: undefined
      };
      
      const response = await historyService.getHistoryMetadata(params);
      
      if (resetData) {
        setCloudHistories(response.data);
      } else {
        setCloudHistories(prev => [...prev, ...response.data]);
      }
      
      setCloudPagination({
        page: page + 1,
        limit: cloudPagination.limit,
        total: response.pagination?.total || response.data.length,
        hasMore: response.pagination?.hasMore || false
      });
      
      if (response.warning) {
        message.warning(response.warning);
      }
      
    } catch (error: any) {
      console.error('Failed to load cloud history:', error);
      setCloudHistoryError(error.message || '加载云端历史记录失败');
      message.error('加载云端历史记录失败: ' + (error.message || '未知错误'));
    } finally {
      setCloudHistoryLoading(false);
    }
  };

  // 初始化加载云端历史记录
  useEffect(() => {
    if (useCloudHistory && user) {
      loadCloudHistory(true);
    }
  }, [useCloudHistory, user, filter.dateRange]);

  // 生成友好的时间显示标题
  const generateFriendlyTitle = (timestamp: string, filename: string): string => {
    try {
      // 尝试解析时间戳
      const date = new Date(timestamp);
      
      // 检查是否为有效日期
      if (!isNaN(date.getTime())) {
        const now = new Date();
        const diffTime = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        // 相对时间显示
        if (diffDays === 0) {
          return `今天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
        } else if (diffDays === 1) {
          return `昨天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
        } else if (diffDays < 7) {
          return `${diffDays}天前 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
        } else if (diffDays < 30) {
          return date.toLocaleDateString('zh-CN', { 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit', 
            minute: '2-digit'
          });
        } else {
          return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      }
    } catch (error) {
      console.warn('Failed to parse timestamp for title:', timestamp, error);
    }
    
    // 回退到文件名（移除扩展名和前缀）
    return filename.replace(/\.(json|txt)$/, '').replace(/^\w+_/, '历史记录 ');
  };

  // 将CloudHistories转换为ChatHistory格式
  const convertCloudHistoryToLocal = (metadata: HistoryMetadata): ChatHistory => {
    const friendlyTitle = generateFriendlyTitle(metadata.timestamp, metadata.filename || '');
    
    return {
      id: metadata.key,
      title: friendlyTitle,
      messages: [], // 延迟加载
      messageCount: 0,
      lastMessage: undefined,
      createdAt: new Date(metadata.timestamp),
      updatedAt: new Date(metadata.last_modified),
      emotionSummary: undefined,
      // 云端历史记录特有字段
      cloudMetadata: metadata
    };
  };

  // 将ChatSession转换为ChatHistory格式
  const convertSessionsToHistory = (): ChatHistory[] => {
    return sessions.map(session => {
      const messages = session.messages || [];
      const lastMessage = messages[messages.length - 1];
      
      // 计算情绪统计
      const emotionMessages = messages.filter(msg => msg.emotionData);
      let emotionSummary;
      
      if (emotionMessages.length > 0) {
        const emotionCounts: Record<string, number> = {};
        let totalScore = 0;

        emotionMessages.forEach(msg => {
          if (msg.emotionData) {
            const emotion = msg.emotionData.primary;
            emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
            totalScore += msg.emotionData.score;
          }
        });

        const averageScore = totalScore / emotionMessages.length;
        const dominant = Object.entries(emotionCounts)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || 'neutral';

        emotionSummary = {
          dominant,
          averageScore,
          distribution: emotionCounts
        };
      }

      return {
        id: session.id,
        title: session.title,
        messages,
        messageCount: messages.length,
        lastMessage,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        emotionSummary
      };
    }).filter(history => history.messageCount > 0); // 只显示有消息的会话
  };

  // 合并本地和云端历史记录
  const histories: ChatHistory[] = useMemo(() => {
    if (useCloudHistory) {
      return cloudHistories.map(convertCloudHistoryToLocal);
    } else {
      return convertSessionsToHistory();
    }
  }, [sessions, cloudHistories, useCloudHistory]);

  // 过滤和排序历史记录
  const filteredHistories = useMemo(() => {
    let filtered = [...histories];

    // 日期筛选 (云端数据已在API层面筛选)
    if (!useCloudHistory && filter.dateRange) {
      const [start, end] = filter.dateRange;
      filtered = filtered.filter(history => {
        const date = history.updatedAt;
        return date >= start && date <= end;
      });
    }

    // 情绪筛选
    if (filter.emotion) {
      filtered = filtered.filter(history => 
        history.emotionSummary?.dominant === filter.emotion
      );
    }

    // 关键词搜索
    if (filter.keyword) {
      const keyword = filter.keyword.toLowerCase();
      filtered = filtered.filter(history =>
        history.title.toLowerCase().includes(keyword) ||
        (history.cloudMetadata?.filename?.toLowerCase().includes(keyword)) ||
        history.messages.some(msg => 
          msg.content.toLowerCase().includes(keyword)
        )
      );
    }

    // 排序 (云端数据已按时间排序)
    if (!useCloudHistory) {
      filtered.sort((a, b) => {
        let result = 0;
        
        switch (filter.sortBy) {
          case 'date':
            result = a.updatedAt.getTime() - b.updatedAt.getTime();
            break;
          case 'emotion':
            result = (a.emotionSummary?.averageScore || 0) - (b.emotionSummary?.averageScore || 0);
            break;
          case 'messageCount':
            result = a.messageCount - b.messageCount;
            break;
          default:
            result = 0;
        }

        return filter.sortOrder === 'desc' ? -result : result;
      });
    }

    return filtered;
  }, [histories, filter, useCloudHistory]);



  // 以下处理函数因对应功能已暂时隐藏而被注释，恢复功能时需取消注释：
  /*
  const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      setFilter(prev => ({
        ...prev,
        dateRange: [dates[0]!.toDate(), dates[1]!.toDate()]
      }));
    } else {
      setFilter(prev => ({
        ...prev,
        dateRange: undefined
      }));
    }
  };

  const handleEmotionFilter = (emotion: string) => {
    setFilter(prev => ({
      ...prev,
      emotion: emotion === 'all' ? undefined : emotion
    }));
  };

  const handleKeywordSearch = (keyword: string) => {
    setFilter(prev => ({
      ...prev,
      keyword: keyword || undefined
    }));
  };

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split('-') as [string, 'asc' | 'desc'];
    setFilter(prev => ({
      ...prev,
      sortBy: sortBy as any,
      sortOrder
    }));
  };
  */

  const handleSelectHistory = async (history: ChatHistory) => {
    setSelectedHistory(history);
    
    // 如果是云端历史记录且没有加载消息内容，需要从云端加载
    if (history.cloudMetadata && history.messages.length === 0) {
      try {
        setLoading(true);
        const data = await historyService.getHistoryItem(history.cloudMetadata.key);
        
        if (data && historyService.isChatHistory(data)) {
          const chatData = data as ChatHistoryData;
          
          // 更新history对象
          const updatedHistory: ChatHistory = {
            ...history,
            messages: chatData.messages.map(msg => ({
              id: Math.random().toString(),
              content: msg.content,
              role: msg.role as any,
              timestamp: new Date(msg.created_at || msg.timestamp || history.createdAt),
              emotionData: undefined // TODO: 从情绪报告中获取
            })),
            messageCount: chatData.messages.length
          };
          
          setSelectedHistory(updatedHistory);
        }
      } catch (error: any) {
        console.error('Failed to load cloud history detail:', error);
        message.error('加载历史记录详情失败: ' + (error.message || '未知错误'));
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBackToList = () => {
    setSelectedHistory(null);
  };
  
  // 移动端顶部导航栏
  const renderMobileHeader = () => {
    if (showMobileDetail) {
      // 详情页的导航栏
      return (
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
              onClick={handleBackToList}
              style={{ padding: '8px' }}
            />
            <div>
              <Title level={5} style={{ margin: 0, fontSize: '16px' }}>历史详情</Title>
              <div style={{ fontSize: '10px', color: '#8c8c8c', lineHeight: 1 }}>
                {selectedHistory?.title}
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {loading && <Spin size="small" />}
          </div>
        </Header>
      );
    } else {
      // 历史列表页的导航栏
      return (
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
              <Title level={5} style={{ margin: 0, fontSize: '16px' }}>聊天历史</Title>
              <div style={{ fontSize: '10px', color: '#8c8c8c', lineHeight: 1 }}>
                {useCloudHistory ? '云端记录' : '本地记录'}
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {cloudHistoryLoading && <Spin size="small" />}
            {useCloudHistory && (
              <Button 
                type="text" 
                icon={<ReloadOutlined />}
                onClick={handleRefreshCloudHistory}
                style={{ padding: '4px' }}
              />
            )}
          </div>
        </Header>
      );
    }
  };

  const handleDeleteHistory = async (historyId: string) => {
    try {
      if (useCloudHistory) {
        // TODO: 实现云端历史记录删除
        message.info('云端历史记录删除功能开发中...');
        return;
      }
      
      deleteSession(historyId);
      message.success('删除成功');
      
      // 如果删除的是当前选中的历史记录，返回列表
      if (selectedHistory?.id === historyId) {
        setSelectedHistory(null);
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleShareHistory = () => {
    // TODO: 实现分享功能
    message.info('分享功能开发中...');
  };

  const handleRefreshCloudHistory = () => {
    if (useCloudHistory) {
      loadCloudHistory(true);
    }
  };

  const handleLoadMore = () => {
    if (useCloudHistory && cloudPagination.hasMore && !cloudHistoryLoading) {
      loadCloudHistory(false);
    }
  };

  const handleCloudHistoryToggle = (checked: boolean) => {
    setUseCloudHistory(checked);
    setCloudHistoryError(null);
    setSelectedHistory(null);
    
    if (checked) {
      // 重置分页状态
      setCloudPagination({
        page: 1,
        limit: 20,
        total: 0,
        hasMore: false
      });
      setCloudHistories([]);
    }
  };

  // 下拉刷新处理
  const handlePullRefresh = async () => {
    try {
      if (useCloudHistory) {
        await loadCloudHistory(true);
      }
      message.success(isMobile ? '刷新成功' : '历史记录已刷新');
    } catch (error) {
      console.error('下拉刷新失败:', error);
      message.error(isMobile ? '刷新失败' : '刷新失败，请重试');
      throw error;
    }
  };

  // 移动端详情显示状态
  const showMobileDetail = isMobile && selectedHistory;

  // 移动端布局
  if (isMobile) {
    return (
      <Layout style={{ 
        height: '100vh', 
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
          padding: showMobileDetail ? '0' : '8px'
        }}>
          {showMobileDetail ? (
            // 详情页面
            <div style={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column'
            }}>
              <Spin spinning={loading} style={{ flex: 1, minHeight: 0 }}>
                <HistoryDetail
                  history={selectedHistory}
                  onBack={handleBackToList}
                  onShare={handleShareHistory}
                  onDelete={handleDeleteHistory}
                  showActions={true}
                  isCloudHistory={!!selectedHistory.cloudMetadata}
                />
              </Spin>
            </div>
          ) : (
            // 历史列表页面
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* 数据源切换 */}
              <Card size="small" style={{ 
                background: '#fafafa',
                marginBottom: '8px',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {useCloudHistory ? (
                      <>
                        <CloudOutlined style={{ color: '#1890ff' }} />
                        <Text style={{ fontSize: '12px' }}>云端历史记录</Text>
                      </>
                    ) : (
                      <>
                        <DatabaseOutlined style={{ color: '#52c41a' }} />
                        <Text style={{ fontSize: '12px' }}>本地历史记录</Text>
                      </>
                    )}
                  </div>
                  <Switch
                    size="small"
                    checked={useCloudHistory}
                    onChange={handleCloudHistoryToggle}
                    loading={cloudHistoryLoading}
                  />
                </div>
              </Card>

              {/* 云端历史记录错误提示 */}
              {cloudHistoryError && (
                <Alert
                  message="加载失败"
                  description={cloudHistoryError}
                  type="error"
                  showIcon
                  closable
                  onClose={() => setCloudHistoryError(null)}
                  style={{ 
                    fontSize: '12px',
                    marginBottom: '8px',
                    borderRadius: '8px'
                  }}
                />
              )}

              {/* 历史记录列表 - 移动端添加下拉刷新 */}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <PullToRefresh
                  onRefresh={handlePullRefresh}
                  config={{
                    threshold: 60,
                    maxPullDistance: 100,
                    enableHapticFeedback: true,
                    enableAnimation: true
                  }}
                  style={{ height: '100%' }}
                >
                  <Spin spinning={cloudHistoryLoading && cloudHistories.length === 0}>
                    <HistoryList
                      histories={filteredHistories}
                      onSelectHistory={handleSelectHistory}
                      selectedHistoryId={selectedHistory?.id}
                      loading={loading}
                      hasMore={useCloudHistory ? cloudPagination.hasMore : false}
                      onLoadMore={handleLoadMore}
                      loadingMore={cloudHistoryLoading && cloudHistories.length > 0}
                    />
                  </Spin>
                </PullToRefresh>
              </div>
            </div>
          )}
        </Content>
      </Layout>
    );
  }

  // 桌面端布局
  return (
    <Layout style={{ 
      height: '100vh', 
      background: '#f5f5f5', 
      overflow: 'hidden'  // 🎯 关键：禁止整个页面滚动
    }}>
      {!showMobileDetail && (
        <Sider 
          width={isMobile ? '100%' : 400} 
          style={{ 
            background: '#fff',
            borderRight: '1px solid #e8e8e8',
            height: '100vh',  // 确保侧边栏占满视口高度
            overflow: 'hidden'  // 禁止侧边栏整体滚动
          }}
        >
          <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ marginBottom: '16px' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {onBack && (
                      <Button 
                        type="text" 
                        icon={<ArrowLeftOutlined />} 
                        onClick={onBack}
                        size="small"
                      />
                    )}
                    <Title level={4} style={{ margin: 0 }}>
                      聊天历史
                    </Title>
                  </div>
                  
                  <Space>
                    {useCloudHistory && (
                      <Button 
                        type="text" 
                        icon={<ReloadOutlined />}
                        onClick={handleRefreshCloudHistory}
                        loading={cloudHistoryLoading}
                        size="small"
                      />
                    )}
                  </Space>
                </div>

                {/* 数据源切换 */}
                <Card size="small" style={{ background: '#fafafa' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {useCloudHistory ? (
                        <>
                          <CloudOutlined style={{ color: '#1890ff' }} />
                          <Text style={{ fontSize: '12px' }}>云端历史记录</Text>
                        </>
                      ) : (
                        <>
                          <DatabaseOutlined style={{ color: '#52c41a' }} />
                          <Text style={{ fontSize: '12px' }}>本地历史记录</Text>
                        </>
                      )}
                    </div>
                    <Switch
                      size="small"
                      checked={useCloudHistory}
                      onChange={handleCloudHistoryToggle}
                      loading={cloudHistoryLoading}
                    />
                  </div>
                </Card>

                {/* 云端历史记录错误提示 */}
                {cloudHistoryError && (
                  <Alert
                    message="加载失败"
                    description={cloudHistoryError}
                    type="error"
                    showIcon
                    closable
                    onClose={() => setCloudHistoryError(null)}
                    style={{ fontSize: '12px' }}
                  />
                )}



                {/* 
                  ========================
                  搜索和筛选功能 - 已临时隐藏
                  ========================
                  
                  注意：以下功能已按用户要求临时隐藏，但代码保留便于后续恢复：
                  1. 搜索历史记录功能
                  2. 日期范围选择器（开始日期和结束日期）
                  3. 情绪筛选功能
                  4. 记录排序功能
                  
                  如需恢复，取消下方代码的注释即可：
                */}
                {/*
                <Search
                  placeholder="搜索历史记录..."
                  allowClear
                  onSearch={handleKeywordSearch}
                  style={{ marginBottom: '8px' }}
                />
                
                <Space direction="vertical" style={{ width: '100%' }}>
                  <RangePicker
                    style={{ width: '100%' }}
                    placeholder={['开始日期', '结束日期']}
                    onChange={handleDateRangeChange}
                    size="small"
                  />
                  
                  <Row gutter={8}>
                    <Col span={12}>
                      <Select
                        placeholder="情绪筛选"
                        allowClear
                        style={{ width: '100%' }}
                        onChange={handleEmotionFilter}
                        size="small"
                      >
                        <Option value="all">全部情绪</Option>
                        <Option value="positive">积极</Option>
                        <Option value="negative">消极</Option>
                        <Option value="neutral">中性</Option>
                        <Option value="excited">兴奋</Option>
                        <Option value="calm">平静</Option>
                      </Select>
                    </Col>
                    <Col span={12}>
                      <Select
                        defaultValue="date-desc"
                        style={{ width: '100%' }}
                        onChange={handleSortChange}
                        size="small"
                        disabled={useCloudHistory} // 云端数据已排序
                      >
                        <Option value="date-desc">最新在前</Option>
                        <Option value="date-asc">最旧在前</Option>
                        <Option value="messageCount-desc">消息数↓</Option>
                        <Option value="emotion-desc">情绪强度↓</Option>
                      </Select>
                    </Col>
                  </Row>
                </Space>
                */}
              </Space>
            </div>

            {/* 主要内容区域 */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              <Spin spinning={cloudHistoryLoading && cloudHistories.length === 0}>
                <HistoryList
                  histories={filteredHistories}
                  onSelectHistory={handleSelectHistory}
                  selectedHistoryId={selectedHistory?.id}
                  loading={loading}
                  // 云端历史记录的分页加载
                  hasMore={useCloudHistory ? cloudPagination.hasMore : false}
                  onLoadMore={handleLoadMore}
                  loadingMore={cloudHistoryLoading && cloudHistories.length > 0}
                />
              </Spin>
            </div>
          </div>
        </Sider>
      )}

      {/* 详情内容 */}
      <Content style={{ 
        background: '#fff', 
        display: 'flex', 
        flexDirection: 'column',
        height: '100vh',  // 确保内容区域占满视口高度
        overflow: 'hidden'  // 禁止内容区域整体滚动
      }}>
        {selectedHistory ? (
          <div style={{ 
            padding: '16px', 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            minHeight: 0 // 重要：允许 flex 子元素收缩
          }}>
            <Spin spinning={loading} style={{ flex: 1, minHeight: 0 }}>
              <HistoryDetail
                history={selectedHistory}
                onBack={showMobileDetail ? handleBackToList : undefined}
                onShare={handleShareHistory}
                onDelete={handleDeleteHistory}
                showActions={true}
                isCloudHistory={!!selectedHistory.cloudMetadata}
              />
            </Spin>
          </div>
        ) : (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%',
            flexDirection: 'column',
            color: 'var(--text-secondary)'
          }}>
            <SearchOutlined style={{ fontSize: '64px', marginBottom: '16px' }} />
            <Text type="secondary" style={{ fontSize: '16px' }}>
              选择一个历史记录来查看详情
            </Text>
            {useCloudHistory && (
              <Text type="secondary" style={{ fontSize: '14px', marginTop: '8px' }}>
                当前显示云端历史记录
              </Text>
            )}
          </div>
        )}
      </Content>
    </Layout>
  );
};

export default HistoryPage; 