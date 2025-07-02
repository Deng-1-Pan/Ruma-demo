import React, { useRef, useEffect } from 'react';
import { Card, Typography, Space, Button, Statistic, Row, Col, Divider } from 'antd';
import { ArrowLeftOutlined, ShareAltOutlined, DeleteOutlined } from '@ant-design/icons';
import { ChatHistory } from '../../types';
import MessageBubble from '../chat/MessageBubble';

const { Title, Text } = Typography;

interface HistoryDetailProps {
  history: ChatHistory;
  onBack?: () => void;
  onShare?: (history: ChatHistory) => void;
  onDelete?: (historyId: string) => void;
  showActions?: boolean;
  isCloudHistory?: boolean;
}

const HistoryDetail: React.FC<HistoryDetailProps> = ({
  history,
  onBack,
  onShare,
  onDelete,
  showActions = true,
  isCloudHistory = false
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // TODO: 使用isCloudHistory参数来显示云端特有的功能
  console.log('History type:', isCloudHistory ? 'cloud' : 'local');

  useEffect(() => {
    // 只在首次加载时自动滚动到底部，之后允许用户手动控制
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timer);
  }, [history.id]); // 只在history.id变化时触发，不是messages变化

  const formatDateTime = (timestamp: Date) => {
    return timestamp.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateSessionDuration = () => {
    if (history.messages.length < 2) return '< 1 分钟';
    
    const firstMessage = history.messages[0];
    const lastMessage = history.messages[history.messages.length - 1];
    const lastTime = lastMessage.timestamp instanceof Date ? lastMessage.timestamp : new Date(lastMessage.timestamp);
    const firstTime = firstMessage.timestamp instanceof Date ? firstMessage.timestamp : new Date(firstMessage.timestamp);
    const duration = lastTime.getTime() - firstTime.getTime();
    const minutes = Math.floor(duration / 60000);
    
    if (minutes < 1) return '< 1 分钟';
    if (minutes < 60) return `${minutes} 分钟`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} 小时 ${remainingMinutes} 分钟`;
  };

  const getEmotionStats = () => {
    const emotionMessages = history.messages.filter(msg => msg.emotionData);
    if (emotionMessages.length === 0) return null;

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
    const dominantEmotion = Object.entries(emotionCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0];

    return {
      averageScore,
      dominantEmotion,
      distribution: emotionCounts
    };
  };

  const emotionStats = getEmotionStats();

  return (
    <div style={{ 
      height: '100%', // 从父容器获得高度参照
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden', // 确保整个组件不会滚动
      minHeight: 0 // 关键：允许flex子元素收缩
    }}>
      {/* Header */}
      <Card 
        style={{ marginBottom: '16px', borderRadius: '8px', flexShrink: 0 }}
        bodyStyle={{ padding: 16 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
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
                  {history.title}
                </Title>
              </div>
              
              <Text type="secondary" style={{ fontSize: '12px' }}>
                开始于 {formatDateTime(history.createdAt)}
              </Text>
            </Space>
          </div>

          {showActions && (
            <Space>
              {onShare && (
                <Button 
                  type="text" 
                  icon={<ShareAltOutlined />} 
                  onClick={() => onShare(history)}
                  size="small"
                >
                  分享
                </Button>
              )}
              {onDelete && (
                <Button 
                  type="text" 
                  danger 
                  icon={<DeleteOutlined />} 
                  onClick={() => onDelete(history.id)}
                  size="small"
                >
                  删除
                </Button>
              )}
            </Space>
          )}
        </div>

        {/* 统计信息 */}
        <Divider style={{ margin: '12px 0' }} />
        <Row gutter={16}>
          <Col span={6}>
            <Statistic 
              title="消息数" 
              value={history.messageCount} 
              valueStyle={{ fontSize: '16px' }}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="持续时间" 
              value={calculateSessionDuration()} 
              valueStyle={{ fontSize: '16px' }}
            />
          </Col>
          {emotionStats && (
            <>
              <Col span={6}>
                <Statistic 
                  title="主要情绪" 
                  value={emotionStats.dominantEmotion} 
                  valueStyle={{ fontSize: '16px' }}
                />
              </Col>
              <Col span={6}>
                <Statistic 
                  title="情绪强度" 
                  value={`${(emotionStats.averageScore * 100).toFixed(0)}%`}
                  valueStyle={{ fontSize: '16px' }}
                />
              </Col>
            </>
          )}
        </Row>
      </Card>

      {/* Messages - 方案3：指定最大高度+滚动（Modal场景做法） */}
      <Card 
        title="聊天记录"
        style={{ 
          borderRadius: '8px'
        }}
        bodyStyle={{
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 250px)', // 根据布局留出header/input/统计等空间
          padding: 16
        }}
      >
        {history.messages.map((message) => (
          <MessageBubble 
            key={message.id}
            message={message}
            showAvatar={true}
            showTimestamp={true}
            isHistory={true}
          />
        ))}
        <div ref={messagesEndRef} />
      </Card>
    </div>
  );
};

export default HistoryDetail; 