import { create } from 'zustand';
import { User } from '../types';
import { tokenManager } from '../services/tokenManager';

// Socket.IO 类型 (避免import冲突，使用any代替)
type Socket = any;

// WebSocket事件数据类型
interface MessageData {
  content: string;
  threadId: string;
  metadata?: any;
}

interface TypingData {
  userId: string;
  threadId: string;
  isTyping: boolean;
}

interface SocketError {
  code: string;
  message: string;
  details?: any;
}

// WebSocket连接状态
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

// WebSocket状态接口
interface SocketState {
  // 连接状态
  socket: Socket | null;
  isConnected: boolean;
  connectionState: ConnectionState;
  reconnectCount: number;
  lastError: SocketError | null;
  
  // 在线用户管理
  onlineUsers: User[];
  typingUsers: Map<string, TypingData>; // threadId -> TypingData
  
  // 房间管理
  joinedRooms: Set<string>;
  currentRoom: string | null;
  
  // 操作方法
  connect: (token?: string) => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
  
  // 房间操作
  joinChatRoom: (threadId: string) => void;
  leaveChatRoom: (threadId: string) => void;
  
  // 消息操作
  sendMessage: (data: MessageData) => void;
  
  // 输入状态
  startTyping: (threadId: string) => void;
  stopTyping: (threadId: string) => void;
  
  // 状态更新
  setConnectionState: (state: ConnectionState) => void;
  setSocket: (socket: Socket | null) => void;
  addOnlineUser: (user: User) => void;
  removeOnlineUser: (userId: string) => void;
  updateTypingUser: (data: TypingData) => void;
  removeTypingUser: (threadId: string, userId: string) => void;
  setError: (error: SocketError | null) => void;
  clearError: () => void;
}

// 创建WebSocket状态管理Store
export const useSocketStore = create<SocketState>((set, get) => ({
  // 初始状态
  socket: null,
  isConnected: false,
  connectionState: 'disconnected',
  reconnectCount: 0,
  lastError: null,
  onlineUsers: [],
  typingUsers: new Map(),
  joinedRooms: new Set(),
  currentRoom: null,

  // 连接WebSocket
  connect: async (token?: string) => {
    const state = get();
    
    if (state.isConnected || state.connectionState === 'connecting') {
      console.log('SocketStore: Already connected or connecting');
      return;
    }

    console.log('SocketStore: Connecting to WebSocket...');
    set({ connectionState: 'connecting', lastError: null });

    try {
      // 动态导入socket.io-client
      const { io } = await import('socket.io-client');
      
      // 从TokenManager获取有效的访问Token
      const authToken = token || tokenManager.getAccessToken();
      
      if (!authToken) {
        throw new Error('No authentication token available');
      }

      // 检查Token是否即将过期，如果是则尝试刷新
      const tokenStatus = tokenManager.getTokenStatus();
      if (tokenStatus.needsRefresh) {
        console.log('SocketStore: Token needs refresh before connection');
        try {
          await tokenManager.refreshTokens();
          console.log('SocketStore: Token refreshed successfully');
        } catch (error) {
          console.error('SocketStore: Failed to refresh token before connection', error);
          throw new Error('Failed to refresh authentication token');
        }
      }

      // 获取最新的Token（可能已经刷新）
      const freshToken = tokenManager.getAccessToken();
      if (!freshToken) {
        throw new Error('No valid authentication token available after refresh');
      }
      
      console.log('SocketStore: Using token for authentication');
      
      const socket = io('http://localhost:3002', {
        // 简化认证方式：只使用auth对象传递
        auth: {
          token: freshToken
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        autoConnect: true
      });

      // 设置事件监听器
      socket.on('connect', () => {
        console.log('SocketStore: Connected to WebSocket');
        set({
          socket,
          isConnected: true,
          connectionState: 'connected',
          reconnectCount: 0,
          lastError: null
        });
      });

      socket.on('disconnect', (reason) => {
        console.log('SocketStore: Disconnected from WebSocket', reason);
        set({
          isConnected: false,
          connectionState: 'disconnected',
          socket: null
        });
      });

      socket.on('connect_error', (error) => {
        console.error('SocketStore: Connection error', error);
        const socketError: SocketError = {
          code: 'CONNECTION_ERROR',
          message: error.message || 'Failed to connect to WebSocket',
          details: error
        };
        
        set({
          connectionState: 'error',
          lastError: socketError,
          isConnected: false
        });
      });

      // 用户事件
      socket.on('user_joined_thread', (data: any) => {
        console.log('SocketStore: User joined thread', data);
        const user: User = {
          id: data.userId,
          name: data.username,
          isOnline: true
        };
        get().addOnlineUser(user);
      });

      socket.on('user_left_thread', (data: any) => {
        console.log('SocketStore: User left thread', data);
        get().removeOnlineUser(data.userId);
      });

      // 输入事件
      socket.on('typing_status', (data: TypingData) => {
        console.log('SocketStore: User typing status', data);
        get().updateTypingUser(data);
      });

      // 错误事件
      socket.on('error', (error: SocketError) => {
        console.error('SocketStore: Socket error', error);
        get().setError(error);
      });

      set({ socket });
      
    } catch (error) {
      console.error('SocketStore: Failed to connect', error);
      const socketError: SocketError = {
        code: 'IMPORT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to connect to WebSocket',
        details: error
      };
      set({
        connectionState: 'error',
        lastError: socketError
      });
    }
  },

  // 断开连接
  disconnect: () => {
    const { socket } = get();
    console.log('SocketStore: Disconnecting...');
    
    if (socket) {
      socket.disconnect();
    }
    
    set({
      socket: null,
      isConnected: false,
      connectionState: 'disconnected',
      onlineUsers: [],
      typingUsers: new Map(),
      joinedRooms: new Set(),
      currentRoom: null
    });
  },

  // 重新连接
  reconnect: async () => {
    const state = get();
    console.log('SocketStore: Reconnecting...');
    
    set({
      connectionState: 'reconnecting',
      reconnectCount: state.reconnectCount + 1
    });
    
    // 先断开现有连接
    if (state.socket) {
      state.socket.disconnect();
    }
    
    // 检查TokenManager中是否有有效Token
    const tokenStatus = tokenManager.getTokenStatus();
    if (!tokenStatus.isAuthenticated) {
      console.error('SocketStore: No valid token available for reconnection');
      set({
        connectionState: 'error',
        lastError: {
          code: 'NO_TOKEN',
          message: 'No valid authentication token available for reconnection'
        }
      });
      return;
    }
    
    // 重新连接，TokenManager会自动处理Token
    await get().connect();
  },

  // 加入聊天房间
  joinChatRoom: (threadId: string) => {
    const { socket, joinedRooms } = get();
    
    if (socket && socket.connected) {
      console.log('SocketStore: Joining chat room', threadId);
      console.log('SocketStore: Socket connected:', socket.connected);
      console.log('SocketStore: Socket ID:', socket.id);
      
      socket.emit('join_thread', threadId);
      console.log('SocketStore: Emitted join_thread event for:', threadId);
      
      set({
        joinedRooms: new Set([...joinedRooms, threadId]),
        currentRoom: threadId
      });
      
      console.log('SocketStore: Updated joined rooms, current room:', threadId);
    } else {
      console.error('SocketStore: Cannot join room - socket not connected');
      console.log('SocketStore: Socket exists:', !!socket);
      console.log('SocketStore: Socket connected:', socket?.connected);
    }
  },

  // 离开聊天房间
  leaveChatRoom: (threadId: string) => {
    const { socket, joinedRooms } = get();
    
    if (socket && socket.connected) {
      console.log('SocketStore: Leaving chat room', threadId);
      socket.emit('leave_thread', threadId);
      
      const newRooms = new Set(joinedRooms);
      newRooms.delete(threadId);
      
      set({
        joinedRooms: newRooms,
        currentRoom: newRooms.size > 0 ? Array.from(newRooms)[0] : null
      });
    }
  },

  // 发送消息
  sendMessage: (data: MessageData) => {
    const { socket } = get();
    
    if (socket && socket.connected) {
      console.log('SocketStore: Sending message', data);
      socket.emit('send_message', data);
    } else {
      console.warn('SocketStore: Cannot send message - not connected');
    }
  },

  // 开始输入
  startTyping: (threadId: string) => {
    const { socket } = get();
    
    if (socket && socket.connected) {
      console.log('SocketStore: Start typing in', threadId);
      socket.emit('typing', { threadId, isTyping: true });
    }
  },

  // 停止输入
  stopTyping: (threadId: string) => {
    const { socket } = get();
    
    if (socket && socket.connected) {
      console.log('SocketStore: Stop typing in', threadId);
      socket.emit('typing', { threadId, isTyping: false });
    }
  },

  // 设置连接状态
  setConnectionState: (connectionState: ConnectionState) => {
    set({ connectionState });
  },

  // 设置socket实例
  setSocket: (socket: Socket | null) => {
    set({ socket, isConnected: socket?.connected || false });
  },

  // 添加在线用户
  addOnlineUser: (user: User) => {
    set((state) => ({
      onlineUsers: [...state.onlineUsers.filter(u => u.id !== user.id), user]
    }));
  },

  // 移除在线用户
  removeOnlineUser: (userId: string) => {
    set((state) => ({
      onlineUsers: state.onlineUsers.filter(u => u.id !== userId)
    }));
  },

  // 更新输入用户
  updateTypingUser: (data: TypingData) => {
    set((state) => {
      const newTypingUsers = new Map(state.typingUsers);
      const key = `${data.threadId}-${data.userId}`;
      
      if (data.isTyping) {
        newTypingUsers.set(key, data);
      } else {
        newTypingUsers.delete(key);
      }
      
      return { typingUsers: newTypingUsers };
    });
  },

  // 移除输入用户
  removeTypingUser: (threadId: string, userId: string) => {
    set((state) => {
      const newTypingUsers = new Map(state.typingUsers);
      const key = `${threadId}-${userId}`;
      newTypingUsers.delete(key);
      
      return { typingUsers: newTypingUsers };
    });
  },

  // 设置错误
  setError: (error: SocketError | null) => {
    set({ lastError: error });
  },

  // 清除错误
  clearError: () => {
    set({ lastError: null });
  }
}));

// 导出选择器 hooks
export const useSocket = () => useSocketStore((state) => state.socket);
export const useIsSocketConnected = () => useSocketStore((state) => state.isConnected);
export const useConnectionState = () => useSocketStore((state) => state.connectionState);
export const useOnlineUsers = () => useSocketStore((state) => state.onlineUsers);
export const useTypingUsers = () => useSocketStore((state) => state.typingUsers);
export const useSocketError = () => useSocketStore((state) => state.lastError);
export const useCurrentRoom = () => useSocketStore((state) => state.currentRoom);

// 导出操作方法
export const useSocketActions = () => useSocketStore((state) => ({
  connect: state.connect,
  disconnect: state.disconnect,
  reconnect: state.reconnect,
  joinChatRoom: state.joinChatRoom,
  leaveChatRoom: state.leaveChatRoom,
  sendMessage: state.sendMessage,
  startTyping: state.startTyping,
  stopTyping: state.stopTyping,
  clearError: state.clearError
})); 