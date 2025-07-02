import React from 'react';
import { Avatar } from 'antd';
import { RobotOutlined } from '@ant-design/icons';

interface AIAvatarProps {
  size?: 'small' | 'default' | 'large';
  isThinking?: boolean;
}

const AIAvatar: React.FC<AIAvatarProps> = ({ 
  size = 'default', 
  isThinking = false 
}) => {
  const getAvatarSize = () => {
    switch (size) {
      case 'small':
        return 32;
      case 'large':
        return 48;
      default:
        return 40;
    }
  };

  const avatarStyle = {
    backgroundColor: '#52c41a',
    fontSize: size === 'small' ? '14px' : '16px'
  };

  return (
    <div className="ai-avatar-container" style={{ position: 'relative', display: 'inline-block' }}>
      <Avatar
        size={getAvatarSize()}
        icon={<RobotOutlined />}
        style={avatarStyle}
        className={isThinking ? 'pulse' : ''}
      />
      {isThinking && (
        <div
          className="thinking-indicator"
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: '12px',
            height: '12px',
            backgroundColor: 'var(--warning-color)',
            borderRadius: '50%',
            border: '2px solid var(--surface)',
            boxSizing: 'border-box',
            animation: 'pulse 1.5s infinite'
          }}
        />
      )}
    </div>
  );
};

export default AIAvatar; 