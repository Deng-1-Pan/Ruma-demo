import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '../types';
import { tokenManager } from '../services/tokenManager';
// import { AuthUser } from '../types/auth'; // 暂时未使用

// 用户状态接口
interface UserState {
  // 状态
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // 操作方法
  login: (user: User, token?: string) => void;
  logout: () => void;
  initializeAuth: () => void;
  updateUser: (userData: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

// 创建用户状态管理Store
export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      // 初始状态
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // 初始化认证状态
      initializeAuth: () => {
        const status = tokenManager.getTokenStatus();
        if (status.isAuthenticated) {
          set({
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
        }
      },

      // 登录方法
      login: (user: User, token?: string) => {
        console.log('UserStore: User login', { user, hasToken: !!token });
        
        // 如果提供了token，使用TokenManager管理
        if (token) {
          // 注意：这里假设只提供了accessToken，refreshToken需要从其他地方获取
          console.warn('UserStore: Only accessToken provided, refreshToken should be managed separately');
        }
        
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
      },

      // 登出方法
      logout: () => {
        console.log('UserStore: User logout');
        
        // 使用TokenManager清除所有Token
        tokenManager.clearTokens();
        
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });
      },

      // 更新用户信息
      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = { ...currentUser, ...userData };
          console.log('UserStore: Update user', { updatedUser });
          
          set({
            user: updatedUser,
            error: null
          });
        }
      },

      // 设置加载状态
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      // 设置错误信息
      setError: (error: string | null) => {
        set({ error, isLoading: false });
      },

      // 清除错误信息
      clearError: () => {
        set({ error: null });
      }
    }),
    {
      name: 'user-storage', // 持久化存储的key
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // 只持久化用户信息和认证状态，不持久化临时状态
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);

// 导出选择器 hooks 以便组件使用
export const useUser = () => useUserStore((state) => state.user);
export const useIsAuthenticated = () => useUserStore((state) => state.isAuthenticated);
export const useUserLoading = () => useUserStore((state) => state.isLoading);
export const useUserError = () => useUserStore((state) => state.error);

// 导出操作方法
export const useUserActions = () => useUserStore((state) => ({
  login: state.login,
  logout: state.logout,
  initializeAuth: state.initializeAuth,
  updateUser: state.updateUser,
  setLoading: state.setLoading,
  setError: state.setError,
  clearError: state.clearError
})); 