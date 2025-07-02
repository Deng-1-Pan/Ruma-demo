// WebSocket服务层
// 封装Socket.IO客户端，集成SocketStore，提供高级WebSocket功能

import { useSocketStore } from '../stores/socketStore';
import { useChatStore } from '../stores/chatStore';
import { Message } from '../types';
import { tokenManager } from './tokenManager';

// WebSocket服务类
class WebSocketService {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // 初始重连延迟

  constructor() {
    // 绑定方法以确保正确的this上下文
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleAIResponse = this.handleAIResponse.bind(this);
    this.handleMessageError = this.handleMessageError.bind(this);
  }

  // 连接到WebSocket服务器
  async connect(): Promise<boolean> {
    try {
      const socketStore = useSocketStore.getState();
      
      // 如果已经连接，直接返回
      if (socketStore.isConnected) {
        console.log('WebSocketService: Already connected');
        return true;
      }

      console.log('WebSocketService: Initiating connection...');
      
      // 检查TokenManager中的认证状态
      const tokenStatus = tokenManager.getTokenStatus();
      if (!tokenStatus.isAuthenticated) {
        console.error('WebSocketService: No valid authentication token available');
        throw new Error('No valid authentication token available');
      }
      
      // 使用SocketStore的connect方法（SocketStore会从TokenManager获取Token）
      await socketStore.connect();
      
      // 设置事件监听器
      this.setupEventListeners();
      
      // 重置重连计数
      this.reconnectAttempts = 0;
      
      return true;
    } catch (error) {
      console.error('WebSocketService: Connection failed', error);
      return false;
    }
  }

  // 断开连接
  disconnect(): void {
    console.log('WebSocketService: Disconnecting...');
    const socketStore = useSocketStore.getState();
    socketStore.disconnect();
  }

  // 设置事件监听器
  private setupEventListeners(): void {
    const socketStore = useSocketStore.getState();
    const { socket } = socketStore;
    
    if (!socket) {
      console.warn('WebSocketService: No socket available for event listeners');
      return;
    }

    console.log('WebSocketService: Setting up event listeners');

    // 消息接收事件
    socket.on('message_received', this.handleMessage);
    
    // AI回复事件
    socket.on('ai_response', this.handleAIResponse);
    
    // 🔧 调试：添加事件监听确认日志
    console.log('🔊 WebSocket: Event listeners set up:', ['message_received', 'ai_response', 'message_error', 'connect', 'disconnect', 'connect_error']);
    
    // 消息错误事件
    socket.on('message_error', this.handleMessageError);
    
    // 连接事件
    socket.on('connect', () => {
      console.log('WebSocketService: Connected to server');
      socketStore.setConnectionState('connected');
      this.reconnectAttempts = 0;
    });

    // 断开连接事件
    socket.on('disconnect', (reason: string) => {
      console.log('WebSocketService: Disconnected:', reason);
      socketStore.setConnectionState('disconnected');
      
      // 如果不是主动断开，尝试重连
      if (reason !== 'io client disconnect') {
        this.scheduleReconnect();
      }
    });

    // 连接错误事件
    socket.on('connect_error', (error: any) => {
      console.error('WebSocketService: Connection error:', error);
      socketStore.setConnectionState('error');
      socketStore.setError({
        code: 'CONNECTION_ERROR',
        message: error.message || 'Failed to connect to WebSocket server',
        details: error
      });
      
      this.scheduleReconnect();
    });
  }

  // 处理接收到的消息
  private handleMessage(messageData: any): void {
    console.log('WebSocketService: Received message', messageData);
    
    try {
      const chatStore = useChatStore.getState();
      
      // 生成更可靠的消息ID
      const messageId = messageData.messageId || `ws_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 创建消息对象
      const message: Message = {
        id: messageId,
        content: messageData.content,
        role: messageData.sender === 'user' ? 'user' : 'assistant',
        timestamp: new Date(messageData.timestamp || Date.now()),
        emotionData: messageData.emotionData,
        status: 'sent'
      };
      
      // 检查消息是否已存在（通过store的去重机制）
      chatStore.addMessage(message);
      
    } catch (error) {
      console.error('WebSocketService: Error handling message', error);
    }
  }

  // 处理AI回复
  private handleAIResponse(responseData: any): void {
    console.log('🤖 WebSocketService: Received AI response', responseData);
    
    try {
      const chatStore = useChatStore.getState();
      
      // 🔧 修复：确保AI回复有唯一的ID，避免与用户消息冲突
      const messageId = responseData.messageId || `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 🔧 修复：增强AI回复内容验证
      if (!responseData.content || typeof responseData.content !== 'string') {
        console.error('WebSocketService: Invalid AI response content', responseData);
        chatStore.setTyping(false);
        return;
      }
      
      // 创建AI回复消息
      const message: Message = {
        id: messageId,
        content: responseData.content,
        role: 'assistant',
        timestamp: new Date(responseData.timestamp || Date.now()),
        emotionData: responseData.emotionData,
        status: 'sent'
      };
      
      console.log('🤖 WebSocketService: Creating AI message', {
        id: messageId,
        contentLength: responseData.content.length,
        contentPreview: responseData.content.substring(0, 50) + '...'
      });
      
      // 停止输入指示器
      chatStore.setTyping(false);
      
      // 🔧 修复：检查消息是否已存在，避免重复添加
      const currentMessages = chatStore.messages;
      const existingMessage = currentMessages.find(msg => msg.id === messageId || 
        (msg.role === 'assistant' && msg.content === responseData.content && 
         Math.abs(new Date(msg.timestamp).getTime() - Date.now()) < 5000));
      
      if (existingMessage) {
        console.log('🤖 WebSocketService: AI message already exists, skipping', messageId);
        return;
      }
      
      // 添加AI回复
      chatStore.addMessage(message);
      
      console.log('🤖 WebSocketService: AI response added successfully', messageId);
      
    } catch (error) {
      console.error('❌ WebSocketService: Error handling AI response', error);
      // 确保输入状态恢复
      const chatStore = useChatStore.getState();
      chatStore.setTyping(false);
    }
  }

  // 处理消息错误
  private handleMessageError(errorData: any): void {
    console.error('WebSocketService: Received message error', errorData);
    
    try {
      const chatStore = useChatStore.getState();
      
      // 停止输入指示器
      chatStore.setTyping(false);
      
      // 生成错误消息ID
      const errorMessageId = `ws_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 显示错误消息
      const errorMessage: Message = {
        id: errorMessageId,
        content: `发送失败: ${errorData.error}`,
        role: 'assistant',
        timestamp: new Date(),
        status: 'error'
      };
      
      chatStore.addMessage(errorMessage);
      
    } catch (error) {
      console.error('WebSocketService: Error handling message error', error);
    }
  }

  // 发送消息
  sendMessage(content: string, threadId: string, metadata?: any): void {
    const socketStore = useSocketStore.getState();
    
    if (!socketStore.isConnected) {
      console.warn('WebSocketService: Cannot send message - not connected');
      return;
    }

    const messageData = {
      content,
      threadId,
      metadata
    };

    console.log('WebSocketService: Sending message', messageData);
    socketStore.sendMessage(messageData);
  }

  // 加入聊天房间
  joinRoom(threadId: string): void {
    const socketStore = useSocketStore.getState();
    
    if (!socketStore.isConnected) {
      console.warn('WebSocketService: Cannot join room - not connected');
      return;
    }

    console.log('WebSocketService: Joining room', threadId);
    console.log('WebSocketService: Current connection state:', socketStore.connectionState);
    console.log('WebSocketService: Socket instance exists:', !!socketStore.socket);
    
    socketStore.joinChatRoom(threadId);
    
    console.log('WebSocketService: Join room command sent for thread:', threadId);
  }

  // 离开聊天房间
  leaveRoom(threadId: string): void {
    const socketStore = useSocketStore.getState();
    
    if (!socketStore.isConnected) {
      console.warn('WebSocketService: Cannot leave room - not connected');
      return;
    }

    console.log('WebSocketService: Leaving room', threadId);
    socketStore.leaveChatRoom(threadId);
  }

  // 开始输入
  startTyping(threadId: string): void {
    const socketStore = useSocketStore.getState();
    
    if (!socketStore.isConnected) {
      return;
    }

    socketStore.startTyping(threadId);
  }

  // 停止输入
  stopTyping(threadId: string): void {
    const socketStore = useSocketStore.getState();
    
    if (!socketStore.isConnected) {
      return;
    }

    socketStore.stopTyping(threadId);
  }

  // 安排重连
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('WebSocketService: Max reconnect attempts reached');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts); // 指数退避
    this.reconnectAttempts++;

    console.log(`WebSocketService: Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      console.log(`WebSocketService: Attempting reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      const socketStore = useSocketStore.getState();
      socketStore.reconnect();
    }, delay);
  }

  // 获取连接状态
  getConnectionState(): string {
    const socketStore = useSocketStore.getState();
    return socketStore.connectionState;
  }

  // 获取在线用户
  getOnlineUsers(): any[] {
    const socketStore = useSocketStore.getState();
    return socketStore.onlineUsers;
  }

  // 检查是否连接
  isConnected(): boolean {
    const socketStore = useSocketStore.getState();
    return socketStore.isConnected;
  }
}

// 创建全局WebSocket服务实例
export const webSocketService = new WebSocketService();

// 导出服务类用于测试或其他用途
export default WebSocketService; 