import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// 主题类型
export type Theme = 'light' | 'dark';

// 页面类型
export type CurrentPage = 'chat' | 'history' | 'settings';

// 界面状态接口
interface UIState {
  // 状态
  currentPage: CurrentPage;
  sidebarVisible: boolean;
  theme: Theme;
  isLoading: boolean;
  notifications: Notification[];
  
  // 操作方法
  setCurrentPage: (page: CurrentPage) => void;
  toggleSidebar: () => void;
  setSidebarVisible: (visible: boolean) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setLoading: (loading: boolean) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

// 通知类型
interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  timestamp: Date;
  duration?: number; // 自动消失时间（毫秒）
}

// 创建界面状态管理Store
export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // 初始状态
      currentPage: 'chat',
      sidebarVisible: true,
      theme: 'light',
      isLoading: false,
      notifications: [],

      // 设置当前页面
      setCurrentPage: (page: CurrentPage) => {
        console.log('UIStore: Set current page', page);
        set({ currentPage: page });
      },

      // 切换侧边栏可见性
      toggleSidebar: () => {
        const currentVisible = get().sidebarVisible;
        console.log('UIStore: Toggle sidebar', !currentVisible);
        set({ sidebarVisible: !currentVisible });
      },

      // 设置侧边栏可见性
      setSidebarVisible: (visible: boolean) => {
        console.log('UIStore: Set sidebar visible', visible);
        set({ sidebarVisible: visible });
      },

      // 设置主题
      setTheme: (theme: Theme) => {
        console.log('UIStore: Set theme', theme);
        
        // 更新DOM的data-theme属性
        document.documentElement.setAttribute('data-theme', theme);
        
        set({ theme });
      },

      // 切换主题
      toggleTheme: () => {
        const currentTheme = get().theme;
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        console.log('UIStore: Toggle theme', { from: currentTheme, to: newTheme });
        
        // 更新DOM的data-theme属性
        document.documentElement.setAttribute('data-theme', newTheme);
        
        set({ theme: newTheme });
      },

      // 设置全局加载状态
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      // 添加通知
      addNotification: (notificationData) => {
        const notification: Notification = {
          ...notificationData,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          timestamp: new Date()
        };
        
        console.log('UIStore: Add notification', notification);
        
        set((state) => ({
          notifications: [...state.notifications, notification]
        }));

        // 如果设置了duration，自动移除通知
        if (notification.duration && notification.duration > 0) {
          setTimeout(() => {
            get().removeNotification(notification.id);
          }, notification.duration);
        }
      },

      // 移除通知
      removeNotification: (id: string) => {
        console.log('UIStore: Remove notification', id);
        set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id)
        }));
      },

      // 清除所有通知
      clearNotifications: () => {
        console.log('UIStore: Clear all notifications');
        set({ notifications: [] });
      }
    }),
    {
      name: 'ui-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // 持久化用户偏好设置
        theme: state.theme,
        sidebarVisible: state.sidebarVisible,
        currentPage: state.currentPage
      })
    }
  )
);

// 初始化主题
const initializeTheme = () => {
  const storedTheme = useUIStore.getState().theme;
  document.documentElement.setAttribute('data-theme', storedTheme);
};

// 在模块加载时初始化主题
if (typeof window !== 'undefined') {
  initializeTheme();
}

// 导出选择器 hooks
export const useCurrentPage = () => useUIStore((state) => state.currentPage);
export const useSidebarVisible = () => useUIStore((state) => state.sidebarVisible);
export const useTheme = () => useUIStore((state) => state.theme);
export const useUILoading = () => useUIStore((state) => state.isLoading);
export const useNotifications = () => useUIStore((state) => state.notifications);

// 导出操作方法
export const useUIActions = () => useUIStore((state) => ({
  setCurrentPage: state.setCurrentPage,
  toggleSidebar: state.toggleSidebar,
  setSidebarVisible: state.setSidebarVisible,
  setTheme: state.setTheme,
  toggleTheme: state.toggleTheme,
  setLoading: state.setLoading,
  addNotification: state.addNotification,
  removeNotification: state.removeNotification,
  clearNotifications: state.clearNotifications
})); 