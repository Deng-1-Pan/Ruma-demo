import React from 'react';
import { Card, Typography, Space } from 'antd';
import AIAvatar from '../common/AIAvatar';
import UserAvatar from '../common/UserAvatar';
import './TypingIndicator.css';

const { Text } = Typography;

interface TypingUser {
  id: string;
  name: string;
  avatar?: string;
  isBot?: boolean;
}

interface TypingIndicatorProps {
  className?: string;
  typingUsers?: TypingUser[];
  showUserNames?: boolean;
  animationMode?: 'dots' | 'ripple';
  waitingMessage?: string;
  theme?: 'default' | 'emotion';
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ 
  className,
  typingUsers = [],
  showUserNames = true,
  animationMode = 'ripple',
  waitingMessage,
  theme = 'emotion'
}) => {
  // 如果没有输入用户，默认显示AI正在输入
  const usersToShow = typingUsers.length > 0 ? typingUsers : [
    { id: 'ai', name: 'RuMa AI', isBot: true }
  ];

  const formatTypingText = (): string => {
    if (waitingMessage) {
      return waitingMessage;
    }

    if (usersToShow.length === 0) return '';
    
    if (usersToShow.length === 1) {
      const user = usersToShow[0];
      if (user.isBot) {
        const emotionMessages = [
          '正在理解您的情绪...',
          '正在思考如何回复...',
          '正在分析您的心情...',
          '正在准备回复...'
        ];
        return emotionMessages[Math.floor(Math.random() * emotionMessages.length)];
      }
      return `${user.name} 正在输入...`;
    }
    
    if (usersToShow.length === 2) {
      return `${usersToShow[0].name} 和 ${usersToShow[1].name} 正在输入...`;
    }
    
    return `${usersToShow[0].name} 等 ${usersToShow.length} 人正在输入...`;
  };

  const renderAnimationContent = () => {
    if (animationMode === 'ripple' && usersToShow[0]?.isBot) {
      return (
        <div className="emotion-ripple-container">
          <div className="emotion-ripple-center emotion-breathing">
            <AIAvatar size="small" />
          </div>
          
          <div className="emotion-ripple-wave emotion-ripple-wave-1" />
          <div className="emotion-ripple-wave emotion-ripple-wave-2" />
          <div className="emotion-ripple-wave emotion-ripple-wave-3" />
        </div>
      );
    }

    return (
      <div className="typing-dots">
        <div className="typing-dot typing-dot-1" />
        <div className="typing-dot typing-dot-2" />
        <div className="typing-dot typing-dot-3" />
      </div>
    );
  };

  return (
    <div 
      className={`typing-indicator fade-in ${className || ''}`}
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        marginBottom: 'var(--space-md)',
        animation: 'fadeIn var(--transition-base)'
      }}
    >
      <div 
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          maxWidth: 'var(--message-max-width)'
        }}
      >
        {animationMode !== 'ripple' && (
          <div style={{ display: 'flex', marginRight: 'var(--space-sm)' }}>
            {usersToShow.slice(0, 3).map((user, index) => (
              <div 
                key={`typing-user-${user.id}-${index}`}
                style={{ 
                  marginLeft: index > 0 ? '-8px' : '0',
                  zIndex: 3 - index
                }}
              >
                {user.isBot ? (
                  <AIAvatar size="default" isThinking />
                ) : (
                  <UserAvatar 
                    size="default" 
                    user={{
                      id: user.id,
                      name: user.name,
                      avatar: user.avatar
                    }}
                    showStatus={false}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <Card 
          size="small"
          style={{
            backgroundColor: theme === 'emotion' 
              ? 'rgba(82, 196, 26, 0.05)' 
              : 'var(--success-light)',
            border: theme === 'emotion' 
              ? '1px solid rgba(82, 196, 26, 0.2)' 
              : 'none',
            minWidth: animationMode === 'ripple' ? '120px' : '80px',
            boxShadow: theme === 'emotion' 
              ? '0 2px 12px rgba(82, 196, 26, 0.1)' 
              : 'var(--shadow-sm)',
            borderRadius: '12px'
          }}
          styles={{
            body: {
              padding: animationMode === 'ripple' 
                ? 'var(--space-md)' 
                : 'var(--space-sm) var(--space-md)',
              textAlign: 'center'
            }
          }}
        >
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: animationMode === 'ripple' ? '60px' : '24px'
              }}
            >
              {renderAnimationContent()}
            </div>
            
            {showUserNames && (
              <Text 
                className={theme === 'emotion' ? 'emotion-status-text' : ''}
                type={theme === 'emotion' ? undefined : 'secondary'} 
                style={{ 
                  fontSize: 'var(--font-size-xs)',
                  textAlign: 'center',
                  display: 'block',
                  marginTop: animationMode === 'ripple' ? '8px' : '2px',
                  fontWeight: theme === 'emotion' ? 500 : 400
                }}
              >
                {formatTypingText()}
              </Text>
            )}
          </Space>
        </Card>
      </div>
    </div>
  );
};

export default TypingIndicator; 