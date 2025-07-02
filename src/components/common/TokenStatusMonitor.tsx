import React, { useEffect, useState } from 'react';
import { Alert, notification } from 'antd';
import { ExclamationCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { tokenManager } from '../../services/tokenManager';
import { TokenStatus } from '../../types/auth';

interface TokenStatusMonitorProps {
  showStatusIndicator?: boolean; // 是否显示状态指示器
  autoRefreshNotification?: boolean; // 是否显示自动刷新通知
}

const TokenStatusMonitor: React.FC<TokenStatusMonitorProps> = ({
  showStatusIndicator = false,
  autoRefreshNotification = true
}) => {
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);
  const [lastNotificationTime, setLastNotificationTime] = useState<number>(0);

  useEffect(() => {
    // 初始化Token状态
    const updateStatus = () => {
      const status = tokenManager.getTokenStatus();
      setTokenStatus(status);
    };

    updateStatus();

    // 监听Token事件
    const handleTokenRefreshed = () => {
      console.log('🔄 TokenStatusMonitor: Token refreshed');
      updateStatus();
      
      if (process.env.NODE_ENV === 'development') {
        if (autoRefreshNotification) {
          notification.success({
            message: '认证状态已更新',
            description: '您的登录状态已自动刷新，可以继续使用。',
            placement: 'topRight',
            duration: 3,
            icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />
          });
        }
      }
    };

    const handleTokenWillExpire = () => {
      console.log('⚠️ TokenStatusMonitor: Token will expire soon');
      updateStatus();

      // 防止频繁通知（5分钟内只通知一次）
      const now = Date.now();
      if (now - lastNotificationTime > 5 * 60 * 1000) {
        notification.warning({
          message: '登录即将过期',
          description: '您的登录状态即将过期，系统正在自动刷新...',
          placement: 'topRight',
          duration: 5,
          icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />
        });
        setLastNotificationTime(now);
      }
    };

    const handleTokenExpired = () => {
      console.log('❌ TokenStatusMonitor: Token expired');
      updateStatus();
      
      // 仅在开发环境显示错误通知
      if (process.env.NODE_ENV === 'development') {
        notification.error({
          message: '登录已过期',
          description: '您的登录状态已过期，正在尝试自动刷新...',
          placement: 'topRight',
          duration: 5,
          icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
        });
      }
    };

    const handleRefreshFailed = ({ error }: { error: string }) => {
      console.error('❌ TokenStatusMonitor: Token refresh failed', error);
      updateStatus();
      
      // 仅在开发环境显示错误通知
      if (process.env.NODE_ENV === 'development') {
        notification.error({
          message: '登录刷新失败',
          description: '无法自动刷新您的登录状态，请重新登录。',
          placement: 'topRight',
          duration: 10,
          icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
          btn: (
            <button 
              onClick={() => {
                // 清除Token并重定向到登录页
                tokenManager.clearTokens();
                window.location.href = '/';
              }}
              style={{
                background: '#ff4d4f',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                cursor: 'pointer'
              }}
            >
              重新登录
            </button>
          )
        });
      }
    };

    const handleAuthenticationLost = ({ reason }: { reason: string }) => {
      console.error('❌ TokenStatusMonitor: Authentication lost', reason);
      updateStatus();
      
      // 仅在开发环境显示错误通知
      if (process.env.NODE_ENV === 'development') {
        notification.error({
          message: '登录状态丢失',
          description: `认证状态已丢失：${reason}，请重新登录。`,
          placement: 'topRight',
          duration: 0, // 不自动关闭
          icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
          btn: (
            <button 
              onClick={() => {
                notification.destroy();
                window.location.href = '/';
              }}
              style={{
                background: '#ff4d4f',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                cursor: 'pointer'
              }}
            >
              重新登录
            </button>
          )
        });
      }
    };

    // 注册事件监听器
    tokenManager.on('token-refreshed', handleTokenRefreshed);
    tokenManager.on('token-will-expire', handleTokenWillExpire);
    tokenManager.on('token-expired', handleTokenExpired);
    tokenManager.on('refresh-failed', handleRefreshFailed);
    tokenManager.on('authentication-lost', handleAuthenticationLost);

    // 定期更新状态（每30秒）
    const statusInterval = setInterval(updateStatus, 30000);

    // 清理函数
    return () => {
      tokenManager.off('token-refreshed', handleTokenRefreshed);
      tokenManager.off('token-will-expire', handleTokenWillExpire);
      tokenManager.off('token-expired', handleTokenExpired);
      tokenManager.off('refresh-failed', handleRefreshFailed);
      tokenManager.off('authentication-lost', handleAuthenticationLost);
      clearInterval(statusInterval);
    };
  }, [autoRefreshNotification, lastNotificationTime]);

  // 获取状态指示器样式
  const getStatusIndicator = () => {
    if (!tokenStatus) return null;

    if (!tokenStatus.isAuthenticated) {
      return (
        <Alert
          message="未登录"
          description="请登录以使用所有功能"
          type="error"
          showIcon
          closable={false}
          style={{ marginBottom: 16 }}
        />
      );
    }

    if (tokenStatus.needsRefresh) {
      return (
        <Alert
          message="认证状态刷新中"
          description="正在自动刷新您的登录状态..."
          type="warning"
          showIcon
          closable={false}
          style={{ marginBottom: 16 }}
        />
      );
    }

    const timeUntilExpire = tokenStatus.accessToken?.expiresAt 
      ? tokenStatus.accessToken.expiresAt - Date.now()
      : 0;

    if (timeUntilExpire > 0 && timeUntilExpire < 30 * 60 * 1000) { // 30分钟内过期
      const minutesLeft = Math.floor(timeUntilExpire / (60 * 1000));
      return (
        <Alert
          message="登录即将过期"
          description={`您的登录状态将在 ${minutesLeft} 分钟后过期，系统会自动刷新。`}
          type="info"
          showIcon
          closable
          style={{ marginBottom: 16 }}
        />
      );
    }

    return null;
  };

  return (
    <>
      {showStatusIndicator && getStatusIndicator()}
    </>
  );
};

export default TokenStatusMonitor; 