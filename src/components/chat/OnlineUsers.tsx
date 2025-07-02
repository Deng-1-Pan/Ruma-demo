// 在线用户列表组件
// 显示当前聊天房间中的在线用户

import React from 'react';
import { Card, List, Avatar, Badge, Typography, Space } from 'antd';
import { UserOutlined, RobotOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface OnlineUser {
  id: string;
  name: string;
  avatar?: string;
  isBot?: boolean;
  lastSeen?: Date;
  status?: 'online' | 'away' | 'busy';
}

interface OnlineUsersProps {
  users: OnlineUser[];
  currentUserId?: string;
  showStatus?: boolean;
  maxDisplay?: number;
}

const OnlineUsers: React.FC<OnlineUsersProps> = ({
  users,
  currentUserId,
  showStatus = true,
  maxDisplay = 10
}) => {
  // 过滤和排序用户
  const sortedUsers = users
    .filter(user => user.id !== currentUserId) // 排除当前用户
    .sort((a, b) => {
      // AI助手总是在最前面
      if (a.isBot && !b.isBot) return -1;
      if (!a.isBot && b.isBot) return 1;
      
      // 按在线状态排序
      const statusPriority = { online: 0, away: 1, busy: 2 };
      const aPriority = statusPriority[a.status || 'online'];
      const bPriority = statusPriority[b.status || 'online'];
      
      return aPriority - bPriority;
    })
    .slice(0, maxDisplay);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'online': return '#52c41a';
      case 'away': return '#faad14';
      case 'busy': return '#ff4d4f';
      default: return '#d9d9d9';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'online': return '在线';
      case 'away': return '离开';
      case 'busy': return '忙碌';
      default: return '离线';
    }
  };

  const formatLastSeen = (lastSeen?: Date) => {
    if (!lastSeen) return '';
    
    const now = new Date();
    const diff = now.getTime() - lastSeen.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '刚刚活跃';
    if (minutes < 60) return `${minutes}分钟前活跃`;
    if (hours < 24) return `${hours}小时前活跃`;
    if (days < 7) return `${days}天前活跃`;
    return '很久未活跃';
  };

  if (sortedUsers.length === 0) {
    return (
      <Card 
        title="在线用户" 
        size="small"
        style={{ marginBottom: '16px' }}
      >
        <Text type="secondary" style={{ fontSize: '12px' }}>
          暂无其他在线用户
        </Text>
      </Card>
    );
  }

  return (
    <Card 
      title={
        <Space>
          <span>在线用户</span>
          <Badge 
            count={sortedUsers.length} 
            size="small" 
            style={{ backgroundColor: '#52c41a' }}
          />
        </Space>
      }
      size="small"
      style={{ marginBottom: '16px' }}
    >
      <List
        size="small"
        dataSource={sortedUsers}
        renderItem={(user) => (
          <List.Item key={user.id} style={{ padding: '8px 0', border: 'none' }}>
            <List.Item.Meta
              avatar={
                <Badge 
                  dot 
                  color={getStatusColor(user.status)}
                  offset={[-4, 4]}
                >
                  <Avatar 
                    size="small"
                    src={user.avatar}
                    icon={user.isBot ? <RobotOutlined /> : <UserOutlined />}
                    style={{
                      backgroundColor: user.isBot ? '#1890ff' : '#87d068'
                    }}
                  />
                </Badge>
              }
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Text 
                    style={{ 
                      fontSize: '12px', 
                      fontWeight: user.isBot ? 'bold' : 'normal',
                      color: user.isBot ? '#1890ff' : 'inherit'
                    }}
                  >
                    {user.name}
                  </Text>
                  {user.isBot && (
                    <Badge 
                      size="small" 
                      count="AI" 
                      style={{ 
                        backgroundColor: '#1890ff',
                        fontSize: '10px',
                        height: '16px',
                        lineHeight: '16px',
                        minWidth: '20px'
                      }}
                    />
                  )}
                </div>
              }
              description={
                showStatus && (
                  <Text 
                    type="secondary" 
                    style={{ fontSize: '10px' }}
                  >
                    {user.status === 'online' 
                      ? getStatusText(user.status)
                      : formatLastSeen(user.lastSeen)
                    }
                  </Text>
                )
              }
            />
          </List.Item>
        )}
      />
      
      {users.length > maxDisplay && (
        <div style={{ textAlign: 'center', marginTop: '8px' }}>
          <Text type="secondary" style={{ fontSize: '10px' }}>
            还有 {users.length - maxDisplay} 位用户在线
          </Text>
        </div>
      )}
    </Card>
  );
};

export default OnlineUsers; 