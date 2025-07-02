// Store工具函数
import { useUserStore } from './userStore';
import { useUIStore } from './uiStore';
import { useChatStore } from './chatStore';
import { useSocketStore } from './socketStore';

// Store初始化工具
export const initializeStores = () => {
  console.log('Initializing Zustand stores...');
  
  // 获取各个store的初始状态以触发初始化
  const userState = useUserStore.getState();
  const uiState = useUIStore.getState();
  const chatState = useChatStore.getState();
  const socketState = useSocketStore.getState();
  
  console.log('Stores initialized:', {
    user: !!userState,
    ui: !!uiState,
    chat: !!chatState,
    socket: !!socketState
  });
  
  // 应用主题
  if (uiState.theme) {
    document.documentElement.setAttribute('data-theme', uiState.theme);
  }
  
  return {
    userState,
    uiState,
    chatState,
    socketState
  };
};

// 重置所有Store（用于登出等场景）
export const resetAllStores = () => {
  console.log('Resetting all stores...');
  
  // 用户登出
  useUserStore.getState().logout();
  
  // 重置聊天状态
  useChatStore.getState().clearMessages();
  useChatStore.getState().setCurrentThreadId(null);
  
  // 断开WebSocket连接
  useSocketStore.getState().disconnect();
  
  // 重置UI通知
  useUIStore.getState().clearNotifications();
  
  console.log('All stores reset');
}; 