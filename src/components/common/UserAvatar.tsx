import React from 'react';
import { Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { User } from '../../types';

interface UserAvatarProps {
  user?: User;
  size?: 'small' | 'default' | 'large';
  showStatus?: boolean;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ 
  user, 
  size = 'default', 
  showStatus = false 
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
    backgroundColor: '#1890ff',
    fontSize: size === 'small' ? '14px' : '16px'
  };

  return (
    <div className="user-avatar-container" style={{ position: 'relative', display: 'inline-block' }}>
      <Avatar
        size={getAvatarSize()}
        src={user?.avatar}
        icon={!user?.avatar && <UserOutlined />}
        style={avatarStyle}
        alt={user?.name || 'User'}
      />
      {showStatus && user?.isOnline && (
        <div
          className="online-status"
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: '12px',
            height: '12px',
            backgroundColor: 'var(--success-color)',
            borderRadius: '50%',
            border: '2px solid var(--surface)',
            boxSizing: 'border-box'
          }}
        />
      )}
    </div>
  );
};

export default UserAvatar; 