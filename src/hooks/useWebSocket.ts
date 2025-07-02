// useWebSocket Hook
// 提供简化的WebSocket功能接口给React组件使用

import { useEffect, useCallback, useRef } from 'react';
import { webSocketService } from '../services/websocket';
import { 
  useIsSocketConnected, 
  useConnectionState, 
  useSocketError, 
  useOnlineUsers,
  useSocketActions 
} from '../stores/socketStore';
import { useChatActions, useCurrentThreadId } from '../stores/chatStore';
import { useIsAuthenticated } from '../stores/userStore';
import { tokenManager } from '../services/tokenManager';

// Hook配置选项
interface UseWebSocketOptions {
  autoConnect?: boolean;           // 是否自动连接
  reconnectOnAuth?: boolean;       // 认证状态变化时是否重连
  joinCurrentThread?: boolean;     // 是否自动加入当前线程房间
}

// Hook返回值类型
interface UseWebSocketReturn {
  // 状态
  isConnected: boolean;
  connectionState: string;
  error: any;
  onlineUsers: any[];
  
  // 操作方法
  connect: () => Promise<boolean>;
  disconnect: () => void;
  sendMessage: (content: string, metadata?: any) => void;
  joinRoom: (threadId: string) => void;
  leaveRoom: (threadId: string) => void;
  startTyping: () => void;
  stopTyping: () => void;
  clearError: () => void;
}

export const useWebSocket = (options: UseWebSocketOptions = {}): UseWebSocketReturn => {
  const {
    autoConnect = true,
    reconnectOnAuth = true,
    joinCurrentThread = true
  } = options;

  // Store状态
  const isConnected = useIsSocketConnected();
  const connectionState = useConnectionState();
  const error = useSocketError();
  const onlineUsers = useOnlineUsers();
  const isAuthenticated = useIsAuthenticated();
  const currentThreadId = useCurrentThreadId();

  // Store操作
  const { clearError: clearSocketError } = useSocketActions();
  const { setTyping } = useChatActions();

  // Refs for tracking
  const currentThreadRef = useRef<string | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  // 连接函数
  const connect = useCallback(async (): Promise<boolean> => {
    console.log('useWebSocket: Attempting to connect...');
    try {
      const success = await webSocketService.connect();
      if (success) {
        console.log('useWebSocket: Connection successful');
        
        // 如果有当前线程且需要自动加入，则加入房间
        if (joinCurrentThread && currentThreadId) {
          webSocketService.joinRoom(currentThreadId);
          currentThreadRef.current = currentThreadId;
        }
      }
      return success;
    } catch (error) {
      console.error('useWebSocket: Connection failed', error);
      return false;
    }
  }, [joinCurrentThread, currentThreadId]);

  // 断开连接函数
  const disconnect = useCallback((): void => {
    console.log('useWebSocket: Disconnecting...');
    
    // 清理输入超时
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    
    // 断开WebSocket连接
    webSocketService.disconnect();
    
    // 重置当前线程引用
    currentThreadRef.current = null;
  }, []);

  // 发送消息函数
  const sendMessage = useCallback((content: string, metadata?: any): void => {
    if (!isConnected) {
      console.warn('useWebSocket: Cannot send message - not connected');
      return;
    }

    if (!currentThreadId) {
      console.warn('useWebSocket: Cannot send message - no current thread');
      return;
    }

    console.log('useWebSocket: Sending message', { content, threadId: currentThreadId });
    webSocketService.sendMessage(content, currentThreadId, metadata);
  }, [isConnected, currentThreadId]);

  // 加入房间函数
  const joinRoom = useCallback((threadId: string): void => {
    if (!isConnected) {
      console.warn('useWebSocket: Cannot join room - not connected');
      return;
    }

    console.log('useWebSocket: Joining room', threadId);
    webSocketService.joinRoom(threadId);
    currentThreadRef.current = threadId;
  }, [isConnected]);

  // 离开房间函数
  const leaveRoom = useCallback((threadId: string): void => {
    if (!isConnected) {
      console.warn('useWebSocket: Cannot leave room - not connected');
      return;
    }

    console.log('useWebSocket: Leaving room', threadId);
    webSocketService.leaveRoom(threadId);
    
    if (currentThreadRef.current === threadId) {
      currentThreadRef.current = null;
    }
  }, [isConnected]);

  // 开始输入函数
  const startTyping = useCallback((): void => {
    if (!isConnected || !currentThreadId) {
      return;
    }

    console.log('useWebSocket: Start typing in', currentThreadId);
    webSocketService.startTyping(currentThreadId);
    setTyping(true);

    // 设置输入超时（10秒后自动停止）
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 10000) as any;
  }, [isConnected, currentThreadId, setTyping]);

  // 停止输入函数
  const stopTyping = useCallback((): void => {
    if (!isConnected || !currentThreadId) {
      return;
    }

    console.log('useWebSocket: Stop typing in', currentThreadId);
    webSocketService.stopTyping(currentThreadId);
    setTyping(false);

    // 清理输入超时
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [isConnected, currentThreadId, setTyping]);

  // 清除错误函数
  const clearError = useCallback((): void => {
    clearSocketError();
  }, [clearSocketError]);

  // 自动连接效果
  useEffect(() => {
    if (autoConnect && isAuthenticated && !isConnected) {
      console.log('useWebSocket: Auto-connecting...');
      // 检查TokenManager中的认证状态
      const tokenStatus = tokenManager.getTokenStatus();
      if (tokenStatus.isAuthenticated) {
        connect();
      } else {
        console.warn('useWebSocket: Cannot auto-connect - no valid token available');
      }
    }
  }, [autoConnect, isAuthenticated, isConnected, connect]);

  // 认证状态变化时重连
  useEffect(() => {
    if (reconnectOnAuth && isAuthenticated && !isConnected) {
      console.log('useWebSocket: Reconnecting due to auth state change...');
      // 检查TokenManager中的认证状态
      const tokenStatus = tokenManager.getTokenStatus();
      if (tokenStatus.isAuthenticated) {
        connect();
      } else {
        console.warn('useWebSocket: Cannot reconnect - no valid token available');
      }
    } else if (!isAuthenticated && isConnected) {
      console.log('useWebSocket: Disconnecting due to auth state change...');
      disconnect();
    }
  }, [isAuthenticated, isConnected, reconnectOnAuth, connect, disconnect]);

  // 线程变化时自动切换房间
  useEffect(() => {
    if (!joinCurrentThread || !isConnected) {
      return;
    }

    // 离开之前的房间
    if (currentThreadRef.current && currentThreadRef.current !== currentThreadId) {
      leaveRoom(currentThreadRef.current);
    }

    // 加入新房间
    if (currentThreadId && currentThreadRef.current !== currentThreadId) {
      joinRoom(currentThreadId);
    }
  }, [currentThreadId, isConnected, joinCurrentThread, joinRoom, leaveRoom]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      // 清理输入超时
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // 停止输入
      if (isConnected && currentThreadId) {
        webSocketService.stopTyping(currentThreadId);
      }
    };
  }, [isConnected, currentThreadId]);

  return {
    // 状态
    isConnected,
    connectionState,
    error,
    onlineUsers,
    
    // 操作方法
    connect,
    disconnect,
    sendMessage,
    joinRoom,
    leaveRoom,
    startTyping,
    stopTyping,
    clearError
  };
};

export default useWebSocket; 