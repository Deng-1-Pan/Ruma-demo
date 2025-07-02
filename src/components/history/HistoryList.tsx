import React from 'react';
import { List, Card, Typography, Space, Tag, Badge, Skeleton, Button } from 'antd';
import { MessageOutlined, ClockCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { ChatHistory } from '../../types';

const { Text, Paragraph } = Typography;

interface HistoryListProps {
  histories: ChatHistory[];
  onSelectHistory: (history: ChatHistory) => void;
  selectedHistoryId?: string;
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
}

const HistoryList: React.FC<HistoryListProps> = ({
  histories,
  onSelectHistory,
  selectedHistoryId,
  loading = false,
  hasMore = false,
  onLoadMore,
  loadingMore = false
}) => {
  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    
    return timestamp.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getEmotionColor = (emotion: string) => {
    const colorMap: Record<string, string> = {
      'positive': '#52c41a',
      'negative': '#ff4d4f',
      'neutral': '#8c8c8c',
      'excited': '#faad14',
      'calm': '#1890ff'
    };
    return colorMap[emotion] || '#8c8c8c';
  };

  if (loading) {
    return (
      <div style={{ padding: '16px' }}>
        {Array.from({ length: 5 }).map((_, index) => (
          <Card 
            key={index} 
            style={{ marginBottom: '12px' }}
            bodyStyle={{ padding: 16 }}
          >
            <Skeleton active paragraph={{ rows: 2 }} />
          </Card>
        ))}
      </div>
    );
  }

  if (histories.length === 0) {
    return (
      <div style={{ 
        padding: '48px 16px', 
        textAlign: 'center',
        color: 'var(--text-secondary)' 
      }}>
        <MessageOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
        <Text type="secondary">暂无聊天历史记录</Text>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <List
        style={{ flex: 1, overflow: 'auto' }}
        dataSource={histories}
        renderItem={(history) => (
          <List.Item key={history.id} style={{ padding: 0, marginBottom: '8px' }}>
            <Card
              hoverable
              onClick={() => onSelectHistory(history)}
              style={{
                width: '100%',
                borderLeft: selectedHistoryId === history.id 
                  ? '4px solid var(--primary-color)' 
                  : '4px solid transparent',
                backgroundColor: selectedHistoryId === history.id 
                  ? 'var(--primary-light)' 
                  : 'var(--surface)',
                cursor: 'pointer'
              }}
              bodyStyle={{ padding: '12px 16px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <Text strong style={{ fontSize: '14px' }}>
                  {history.title}
                </Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {formatTimestamp(history.updatedAt)}
                </Text>
              </div>

              {history.lastMessage && (
                <Paragraph 
                  ellipsis={{ rows: 2 }}
                  style={{ 
                    margin: '8px 0',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.4
                  }}
                >
                  {history.lastMessage.content}
                </Paragraph>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space size="small">
                  <Badge 
                    count={history.messageCount} 
                    size="small"
                    style={{ backgroundColor: 'var(--text-tertiary)' }}
                  />
                  <ClockCircleOutlined style={{ color: 'var(--text-tertiary)' }} />
                  
                  {history.emotionSummary && (
                    <Tag 
                      color={getEmotionColor(history.emotionSummary.dominant)}
                      style={{ 
                        fontSize: '10px',
                        padding: '2px 6px',
                        lineHeight: '16px',
                        borderRadius: '8px'
                      }}
                    >
                      {history.emotionSummary.dominant}
                    </Tag>
                  )}
                </Space>
              </div>
            </Card>
          </List.Item>
        )}
      />
      
      {/* 加载更多按钮 */}
      {hasMore && onLoadMore && (
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <Button 
            type="default" 
            onClick={onLoadMore} 
            loading={loadingMore}
            icon={loadingMore ? <LoadingOutlined /> : undefined}
            style={{ width: '100%' }}
          >
            {loadingMore ? '加载中...' : '加载更多'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default HistoryList; 