// 统一的状态管理导出文件
// 根据CREATIVE-001设计方案实现的Zustand状态管理系统

// 用户状态管理
export {
  useUserStore,
  useUser,
  useIsAuthenticated,
  useUserLoading,
  useUserError,
  useUserActions,
} from './userStore';

// 界面状态管理
export {
  useUIStore,
  useCurrentPage,
  useSidebarVisible,
  useTheme,
  useUILoading,
  useNotifications,
  useUIActions,
  type Theme,
  type CurrentPage,
} from './uiStore';

// 聊天状态管理
export {
  useChatStore,
  useMessages,
  useCurrentThreadId,
  useIsTyping,
  useChatLoading,
  useConnectionStatus,
  useChatSessions,
  useCurrentSession,
  useInputText,
  useIsComposing,
  useChatActions,
} from './chatStore';

// WebSocket状态管理
export {
  useSocketStore,
  useSocket,
  useIsSocketConnected,
  useConnectionState,
  useOnlineUsers,
  useTypingUsers,
  useSocketError,
  useCurrentRoom,
  useSocketActions,
} from './socketStore';

// Store工具函数
export { initializeStores, resetAllStores } from './utils'; 