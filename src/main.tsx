import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import 'antd/dist/reset.css'
import './index.css'
// 开发模式下加载演示清理工具
import './utils/cleanupDemo'

console.log('🌟 Main: === RuMa 演示应用启动 ===');
console.log('🌟 Main: React版本:', React.version);
console.log('🌟 Main: 当前URL:', window.location.href);
console.log('🌟 Main: 当前时间:', new Date().toISOString());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

console.log('✅ Main: React应用启动完成'); 