import React, { useMemo, useState, useEffect } from 'react';
import { Card, Typography, Space } from 'antd';
import { CheckOutlined, ClockCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { Message } from '../../types';
import UserAvatar from '../common/UserAvatar';
import AIAvatar from '../common/AIAvatar';
import EmotionIndicator from './EmotionIndicator';

const { Text, Paragraph } = Typography;

interface MessageBubbleProps {
  message: Message;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  isHistory?: boolean;
}

// 默认欢迎消息内容
const DEFAULT_WELCOME_MESSAGE = '你好！我是RuMa GPT，很高兴为您服务。我可以帮助您进行情感支持和心理疏导。请告诉我您今天的心情如何？';

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  showAvatar = true, 
  showTimestamp = true,
  isHistory
}) => {
  const isUser = message.role === 'user';
  
  // 处理消息内容格式 - 兼容字符串和对象格式
  const getMessageContent = (content: string | { assistant_reply?: string } | any): string => {
    if (typeof content === 'string') {
      return content;
    }
    
    // 处理助手回复的对象格式
    if (content && typeof content === 'object') {
      if (content.assistant_reply) {
        return content.assistant_reply;
      }
      // 如果是其他对象格式，尝试转换为字符串
      return JSON.stringify(content);
    }
    
    return String(content || '');
  };

  // 分割AI消息为段落
  const messageParagraphs = useMemo(() => {
    if (isUser) return null;
    
    const content = getMessageContent(message.content);
    
    // 检查是否为默认欢迎消息
    if (content === DEFAULT_WELCOME_MESSAGE) {
      return null; // 不分段处理欢迎消息
    }
    
    // 按双换行符分割段落
    const paragraphs = content.split('\n\n').filter(p => p.trim());
    
    // 如果只有一个段落，不进行分段处理
    if (paragraphs.length <= 1) {
      return null;
    }
    
    return paragraphs;
  }, [isUser, message.content]);
  
  // 管理段落显示状态
  const [visibleParagraphs, setVisibleParagraphs] = useState<number>(0);

  // 段落延迟显示逻辑
  useEffect(() => {
    // 如果是历史记录，直接显示所有段落
    if (isHistory || !messageParagraphs || messageParagraphs.length === 0) {
      setVisibleParagraphs(messageParagraphs?.length || 0);
      return;
    }

    // 重置显示状态
    setVisibleParagraphs(0);

    // 第一个段落立即显示
    setVisibleParagraphs(1);

    // 后续段落延迟显示
    const timers: NodeJS.Timeout[] = [];
    
    for (let i = 1; i < messageParagraphs.length; i++) {
      const timer = setTimeout(() => {
        setVisibleParagraphs(i + 1);
      }, i * 1200); // 每个段落延迟1.2秒，基于研究的最佳实践
      
      timers.push(timer);
    }

    // 清理定时器
    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [messageParagraphs, isHistory]);

  const formatTimestamp = (timestamp: Date | string) => {
    // 确保timestamp是Date对象
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    
    // 验证日期有效性
    if (isNaN(date.getTime())) {
      return '时间未知';
    }
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending':
        return <ClockCircleOutlined style={{ color: 'var(--text-tertiary)' }} />;
      case 'sent':
        return <CheckOutlined style={{ color: 'var(--success-color)' }} />;
      case 'error':
        return <ExclamationCircleOutlined style={{ color: 'var(--error-color)' }} />;
      default:
        return null;
    }
  };

  const bubbleStyle = {
    backgroundColor: isUser ? 'var(--primary-light)' : 'var(--success-light)',
    border: 'none',
    borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
    boxShadow: 'var(--shadow-sm)',
    maxWidth: '100%'
  };

  const messageContainerStyle = {
    display: 'flex',
    justifyContent: isUser ? 'flex-end' : 'flex-start',
    marginBottom: 'var(--space-md)',
    animation: 'fadeIn var(--transition-base)'
  };

  const contentWrapperStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: isUser ? 'row-reverse' : 'row',
    alignItems: 'flex-start',
    maxWidth: 'var(--message-max-width)',
    gap: 'var(--space-sm)'
  };

  // 渲染分段的AI消息
  const renderSegmentedAIMessage = () => {
    if (!messageParagraphs) return null;

    return (
      <div style={{ width: '100%' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          {messageParagraphs.slice(0, visibleParagraphs).map((paragraph, index) => (
            <Card
              key={index}
              size="small"
              style={{
                ...bubbleStyle,
                animation: `fadeInUp 0.5s ease-out`,
                animationFillMode: 'both'
              }}
              bodyStyle={{
                padding: 'var(--space-sm) var(--space-md)',
                wordBreak: 'break-word'
              }}
            >
              <Paragraph 
                style={{ 
                  fontSize: index === 0 ? 'calc(var(--font-size-base) * 1.05)' : 'var(--font-size-base)', 
                  lineHeight: 1.6,
                  marginBottom: 0
                }}
              >
                {paragraph}
              </Paragraph>
            </Card>
          ))}
        </Space>
      </div>
    );
  };

  // 渲染普通消息（用户消息或不分段的AI消息）
  const renderNormalMessage = () => (
    <Card
      size="small"
      style={bubbleStyle}
      bodyStyle={{
        padding: 'var(--space-sm) var(--space-md)',
        wordBreak: 'break-word'
      }}
    >
      <Text style={{ fontSize: 'var(--font-size-base)', lineHeight: 1.6 }}>
        {getMessageContent(message.content)}
      </Text>
    </Card>
  );

  return (
    <div style={messageContainerStyle}>
      <div style={contentWrapperStyle}>
        {showAvatar && (
          isUser ? (
            <UserAvatar size="default" />
          ) : (
            <AIAvatar size="default" />
          )
        )}
        
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* 根据是否需要分段来渲染不同的内容 */}
          {!isUser && messageParagraphs ? 
            renderSegmentedAIMessage() : 
            renderNormalMessage()
          }
          
          {(showTimestamp || message.emotionData || message.status) && (
            <div 
              style={{
                marginTop: 'var(--space-xs)',
                textAlign: isUser ? 'right' : 'left',
                paddingLeft: isUser ? 0 : 'var(--space-sm)',
                paddingRight: isUser ? 'var(--space-sm)' : 0
              }}
            >
              <Space size="small" wrap>
                {/* 只为助手消息显示情绪指示器，用户消息不显示情绪 */}
                {!isUser && message.emotionData && (
                  <EmotionIndicator emotion={message.emotionData} size="small" />
                )}
                
                {showTimestamp && (
                  <Text type="secondary" style={{ fontSize: 'var(--font-size-xs)' }}>
                    {formatTimestamp(message.timestamp)}
                  </Text>
                )}
                
                {isUser && message.status && getStatusIcon()}
              </Space>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble; 