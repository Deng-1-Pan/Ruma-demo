import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import './App.css';

// Pages
import ChatPage from './pages/ChatPage';
import HistoryPage from './pages/HistoryPage';
import EmotionAnalysisPage from './pages/EmotionAnalysisPage';

// Auth
import { useUserActions } from './stores/userStore';

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
            <Routes>
              <Route path="/" element={<ChatPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/emotion-analysis" element={<EmotionAnalysisPage />} />
            </Routes>
          </div>
        </DemoAuthProvider>
      </Router>
    </ConfigProvider>
  );
};

export default App; 