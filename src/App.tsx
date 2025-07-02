import { useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import './App.css';

// 懒加载页面组件
import { lazy } from 'react';

const ChatPage = lazy(() => import('./pages/ChatPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const EmotionAnalysisPage = lazy(() => import('./pages/EmotionAnalysisPage'));

// Auth
import { useUserActions } from './stores/userStore';

// 加载组件
const LoadingComponent = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh' 
  }}>
    <Spin size="large" tip="加载中..." />
  </div>
);

// DemoAuthProvider组件 - 演示版自动设置已登录状态
const DemoAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { login, initializeAuth } = useUserActions();

  useEffect(() => {
    console.log('🚀 App: === 演示认证提供者启动 ===');
    console.log('🚀 App: 开始设置演示用户认证状态');
    
    // 初始化认证状态
    console.log('🚀 App: 初始化认证状态...');
    initializeAuth();
    
    // 设置演示用户
    const demoUser = {
      id: 'demo_user_001',
      name: '演示用户',
      email: 'demo@ruma.com',
      avatar: undefined,
      isOnline: true
    };
    
    console.log('🚀 App: 设置演示用户:', demoUser);
    login(demoUser);
    console.log('✅ App: 演示用户登录完成');
  }, [login, initializeAuth]);

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN}>
      <Router>
        <DemoAuthProvider>
          <div className="App">
            <Suspense fallback={<LoadingComponent />}>
              <Routes>
                <Route path="/" element={<ChatPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/emotion-analysis" element={<EmotionAnalysisPage />} />
              </Routes>
            </Suspense>
          </div>
        </DemoAuthProvider>
      </Router>
    </ConfigProvider>
  );
};

export default App; 