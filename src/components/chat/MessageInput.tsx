import React, { useState, useEffect } from 'react';
import { Input, Button, Space, Typography } from 'antd';
import { SendOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Text } = Typography;

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  demoMode?: boolean;
  demoTypingText?: string;
  onDemoSend?: () => void;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  isLoading = false,
  disabled = false,
  placeholder = "输入您的消息...",
  maxLength = 500,
  demoMode = false,
  demoTypingText = '',
  onDemoSend
}) => {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (demoMode && demoTypingText !== undefined) {
      setInputValue(demoTypingText);
    }
  }, [demoMode, demoTypingText]);

  const handleSend = () => {
    const trimmedValue = inputValue.trim();
    
    if (demoMode) {
      if (onDemoSend && trimmedValue) {
        onDemoSend();
        setInputValue('');
      }
    } else {
      if (trimmedValue && !isLoading && !disabled) {
        onSendMessage(trimmedValue);
        setInputValue('');
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (demoMode) {
      return;
    }
    
    const value = e.target.value;
    if (value.length <= maxLength) {
      setInputValue(value);
    }
  };

  const canSend = demoMode 
    ? inputValue.trim().length > 0
    : inputValue.trim().length > 0 && !isLoading && !disabled;

  const isNearLimit = inputValue.length > maxLength * 0.8;

  const demoInputStyle = demoMode ? {
    cursor: 'default',
    background: '#f9f9ff',
    border: '2px dashed #1890ff',
    color: '#1890ff'
  } : {};

  return (
    <div 
      className="message-input-container"
      style={{
        padding: 'var(--space-lg)',
        borderTop: '1px solid var(--border-color)',
        backgroundColor: 'var(--surface)',
        position: 'sticky',
        bottom: 0,
        zIndex: 10,
        ...(demoMode ? { 
          background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
          borderTop: '2px solid #1890ff'
        } : {})
      }}
    >
      <div 
        style={{ 
          maxWidth: '800px', 
          margin: '0 auto',
          width: '100%'
        }}
      >
        {demoMode && (
          <div style={{
            marginBottom: 'var(--space-sm)',
            textAlign: 'center',
            color: '#1890ff',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'bold'
          }}>
            🎭 演示模式：正在模拟用户输入...
          </div>
        )}
        
        <Space.Compact 
          style={{ 
            display: 'flex', 
            width: '100%',
            gap: 'var(--space-sm)'
          }}
        >
          <div style={{ flex: 1, position: 'relative' }}>
            <TextArea
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={demoMode ? "演示模式下自动输入..." : placeholder}
              autoSize={{ 
                minRows: 1, 
                maxRows: 4 
              }}
              disabled={disabled}
              style={{
                resize: 'none',
                borderRadius: 'var(--border-radius-lg)',
                fontSize: 'var(--font-size-base)',
                lineHeight: 1.6,
                ...demoInputStyle
              }}
            />
            
            <div 
              style={{
                position: 'absolute',
                bottom: 'var(--space-xs)',
                right: 'var(--space-sm)',
                fontSize: 'var(--font-size-xs)',
                color: isNearLimit ? 'var(--warning-color)' : 'var(--text-tertiary)',
                background: 'var(--surface)',
                padding: '2px 4px',
                borderRadius: 'var(--border-radius-sm)',
                pointerEvents: 'none'
              }}
            >
              {inputValue.length}/{maxLength}
            </div>
          </div>
          
          <Button 
            type="primary" 
            icon={<SendOutlined />}
            onClick={handleSend}
            loading={isLoading}
            disabled={!canSend}
            size="large"
            style={{
              height: 'auto',
              minHeight: '40px',
              borderRadius: 'var(--border-radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              ...(demoMode && !canSend ? {
                opacity: 0.6,
                cursor: 'not-allowed'
              } : {})
            }}
          >
            {demoMode ? (canSend ? '发送' : '演示中') : '发送'}
          </Button>
        </Space.Compact>
        
        <div 
          style={{
            marginTop: 'var(--space-xs)',
            textAlign: 'center'
          }}
        >
          <Text 
            type="secondary" 
            style={{ 
              fontSize: 'var(--font-size-xs)',
              opacity: 0.7
            }}
          >
            {demoMode 
              ? '演示模式：正在自动模拟用户对话' 
              : '按 Enter 发送，Shift + Enter 换行'
            }
          </Text>
        </div>
      </div>
    </div>
  );
};

export default MessageInput; 