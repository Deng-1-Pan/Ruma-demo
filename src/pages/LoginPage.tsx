import React, { useState } from 'react';
import { Button, Input, Card, Divider, message, Form } from 'antd';
import { UserOutlined, LockOutlined, WechatOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useUserActions } from '../stores/userStore';
import { demoApiClient as apiClient } from '../utils/demoApiClient';

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useUserActions();

  const handleLogin = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      // 使用ApiClient进行登录，会自动处理Token管理
      const result = await apiClient.login(values.username, values.password);

      if (result.success && result.data) {
        // ApiClient已经自动将Token存储到TokenManager中
        // 转换AuthUser为User类型
        const user = {
          id: result.data.user.id,
          name: result.data.user.displayName,
          avatar: undefined,
          isOnline: true
        };
        
        // 调用userStore的login方法更新用户状态
        login(user);
        
        message.success('登录成功！');
        
        // 跳转到聊天页面
        setTimeout(() => {
          navigate('/chat');
        }, 1000);
      } else {
        message.error(result.error || '登录失败，请重试');
      }
    } catch (error) {
      console.error('Login error:', error);
      message.error(error instanceof Error ? error.message : '网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleWeChatLogin = () => {
    message.info('微信登录功能开发中...');
  };

  return (
    <div className="login-container">
      <Card className="login-card">
        <div className="logo-section">
          <h1>RuMa GPT</h1>
          <p>基于DeepSeek的智能聊天助手</p>
        </div>
        
        <div className="login-methods">
          <Button 
            type="primary" 
            icon={<WechatOutlined />} 
            block 
            size="large"
            onClick={handleWeChatLogin}
            style={{ marginBottom: 16, backgroundColor: '#07c160' }}
          >
            微信登录
          </Button>
          
          <Divider>或</Divider>
          
          <Form onFinish={handleLogin} layout="vertical">
            <Form.Item
              name="username"
              label="用户名"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input 
                prefix={<UserOutlined />}
                placeholder="请输入您的用户名"
                size="large"
              />
            </Form.Item>
            
            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password 
                prefix={<LockOutlined />}
                placeholder="请输入您的密码"
                size="large"
              />
            </Form.Item>
            
            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                block 
                size="large"
                loading={loading}
              >
                登录
              </Button>
            </Form.Item>
          </Form>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage; 