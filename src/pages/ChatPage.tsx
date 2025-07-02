import React, { useState, useEffect, useRef } from 'react';
import { Layout, Card, Typography, Space, Button, message, Modal } from 'antd';
import { HistoryOutlined, WifiOutlined, DisconnectOutlined, ReloadOutlined, BarChartOutlined, ClearOutlined, ExclamationCircleOutlined, LogoutOutlined, FileTextOutlined, StopOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { Message, EmotionData } from '../types';
import MessageBubble from '../components/chat/MessageBubble';
import MessageInput from '../components/chat/MessageInput';
import TypingIndicator from '../components/chat/TypingIndicator';
import ChatReportDisplay from '../components/chat/ChatReportDisplay';
import { demoApiClient as apiClient } from '../utils/demoApiClient';
import useWebSocket from '../hooks/useWebSocket';
import { 
  useMessages, 
  useCurrentThreadId, 
  useChatActions, 
  useIsTyping
} from '../stores';
import { 
  useIsGeneratingReport,
  useCurrentReport,
  useShowInputBox,
  useShouldShowGenerateReport,
  useDemoMode,
  useCurrentDemoTyping,
  useDemoSendTrigger
} from '../stores/chatStore';
import { useIsAuthenticated } from '../stores';
import { resetAllStores } from '../stores/utils';

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

const ChatPage: React.FC = () => {
  // 路由导航
  const navigate = useNavigate();
  const location = useLocation();
  
  // 使用Store状态
  const messages = useMessages();
  const currentThreadId = useCurrentThreadId();
  const isAuthenticated = useIsAuthenticated();
  const isTyping = useIsTyping();
  
  // 报告相关状态
  const isGeneratingReport = useIsGeneratingReport();
  const currentReport = useCurrentReport();
  const showInputBox = useShowInputBox();
  const shouldShowGenerateReport = useShouldShowGenerateReport();
  
  // 演示相关状态
  const demoMode = useDemoMode();
  const currentDemoTyping = useCurrentDemoTyping();
  const demoSendTrigger = useDemoSendTrigger();
  
  // Store操作
  const { 
    addMessage, 
    updateMessage, 
    setCurrentThreadId, 
    setTyping, 
    setConnectionStatus,
    clearMessages,
    generateReport,
    endCurrentChat,
    checkAndRecoverReportGeneration,
    setGeneratingReport,
    setCurrentReport,
    setShowInputBox,
    triggerDemoByUrl,
    stopHiddenDemo
  } = useChatActions();
  
  // WebSocket集成
  const {
    isConnected: wsConnected,
    error: wsError,
    connect: wsConnect,
    sendMessage: wsSendMessage,
    startTyping,
    stopTyping,
    clearError: clearWsError
  } = useWebSocket({
    autoConnect: true,
    reconnectOnAuth: true,
    joinCurrentThread: true
  });

  // 本地状态
  const [hybridConnectionStatus, setHybridConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 🧹 首先检测并清理可能存在的演示数据，并重置演示状态
  useEffect(() => {
    console.log('🔄 ChatPage: === 页面加载，开始初始检查 ===');
    console.log('🔄 ChatPage: 当前状态:', {
      messagesCount: messages.length,
      demoMode,
      currentReport: !!currentReport,
      location: location.pathname + location.search
    });
    
    // 🔄 页面刷新时清理旧的启动标志
    const oldAutoStarted = sessionStorage.getItem('demoAutoStarted');
    if (oldAutoStarted) {
      console.log('🔄 ChatPage: 清理旧的启动标志:', oldAutoStarted);
      sessionStorage.removeItem('demoAutoStarted');
    }
    
    // 检测是否有演示相关的消息被错误持久化
    const hasDemoMessages = messages.some(msg => 
      msg.id?.includes('demo_') || 
      msg.content?.includes('工作压力特别大') ||
      msg.content?.includes('室友最近总是因为一些小事') ||
      msg.content?.includes('今天终于完成了我一直在准备的项目')
    );
    
    // 检测是否处于演示状态
    const isInDemoMode = demoMode;
    
    console.log('🔄 ChatPage: 检测结果:', {
      hasDemoMessages,
      isInDemoMode,
      shouldClean: hasDemoMessages || isInDemoMode,
      oldAutoStarted: oldAutoStarted ? 'existed' : 'none'
    });
    
    if (hasDemoMessages || isInDemoMode) {
      console.log('🧹 ChatPage: 检测到演示数据或演示状态，正在重置...', {
        hasDemoMessages,
        isInDemoMode,
        messagesCount: messages.length
      });
      
      // 完全重置演示状态
      stopHiddenDemo();
      clearMessages();
      setCurrentReport(null);
      setShowInputBox(true);
      setGeneratingReport(false);
      setCurrentThreadId(null);
      
      // 重置欢迎消息添加标记
      sessionStorage.removeItem('welcomeMessageAdded');
      
      console.log('✅ ChatPage: 演示状态重置完成，准备重新开始');
      
      // 设置标志，让后续的自动启动逻辑知道已经清理过了
      sessionStorage.setItem('demoReset', 'true');
      sessionStorage.setItem('demoResetTime', Date.now().toString());
    } else {
      console.log('✅ ChatPage: 无需清理演示数据，状态正常');
      // 即使不需要清理，也设置一个标志表示页面已初始化
      sessionStorage.setItem('pageInitialized', 'true');
      sessionStorage.setItem('pageInitTime', Date.now().toString());
    }
  }, []);

  // 初始化默认消息（仅在Store为空且非演示模式时）
  useEffect(() => {
    console.log('📝 ChatPage: === 检查是否需要添加欢迎消息 ===');
    console.log('📝 ChatPage: 当前状态:', {
      messagesCount: messages.length,
      demoMode,
      hasWelcomeMessage: messages.some(m => m.content.includes('你好！我是RuMa GPT'))
    });
    
    // 检查是否已经有欢迎消息
    const hasWelcomeMessage = messages.some(m => m.content.includes('你好！我是RuMa GPT'));
    
    // 使用sessionStorage来防止重复添加（防止React StrictMode重复执行）
    const welcomeAdded = sessionStorage.getItem('welcomeMessageAdded');
    
    if (messages.length === 0 && !demoMode && !hasWelcomeMessage && !welcomeAdded) {
      console.log('📝 ChatPage: 添加欢迎消息');
      
      // 立即标记为已添加，防止重复
      sessionStorage.setItem('welcomeMessageAdded', 'true');
      
      const welcomeMessage: Message = {
        id: `welcome_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: '你好！我是RuMa GPT，很高兴为您服务。我可以帮助您进行情感支持和心理疏导。请告诉我您今天的心情如何？',
        role: 'assistant',
        timestamp: new Date()
        // 移除emotionData，不显示情绪小标
      };
      addMessage(welcomeMessage);
      console.log('✅ ChatPage: 欢迎消息已添加');
    } else if (hasWelcomeMessage) {
      // 如果已经有欢迎消息，标记为已添加
      sessionStorage.setItem('welcomeMessageAdded', 'true');
      
      // 🔧 临时修复：移除已存在消息中的emotionData
      const hasWelcomeWithEmotion = messages.some(msg => 
        msg.role === 'assistant' && 
        msg.content.includes('你好！我是RuMa GPT') && 
        msg.emotionData
      );
      
      if (hasWelcomeWithEmotion) {
        console.log('🔧 ChatPage: 检测到旧的欢迎消息包含emotionData，正在清理...');
        clearMessages();
        const cleanWelcomeMessage: Message = {
          id: `welcome_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          content: '你好！我是RuMa GPT，很高兴为您服务。我可以帮助您进行情感支持和心理疏导。请告诉我您今天的心情如何？',
          role: 'assistant',
          timestamp: new Date()
          // 不包含emotionData
        };
        addMessage(cleanWelcomeMessage);
        console.log('✅ ChatPage: 欢迎消息已清理并重新添加');
      } else {
        console.log('📝 ChatPage: 消息状态正常，无需处理');
      }
    } else {
      console.log('📝 ChatPage: 有其他消息或处于演示模式，无需添加欢迎消息');
    }
  }, [messages.length, demoMode, addMessage, clearMessages]);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 🚀 智能滚动逻辑：只在消息变化时滚动，避免typing状态导致的意外滚动
  useEffect(() => {
    // 只在消息数量变化时自动滚动，忽略isTyping状态变化
    scrollToBottom();
  }, [messages.length]); // 只依赖消息数量，不依赖isTyping

  // 初始化聊天线程
  useEffect(() => {
    initializeChatThread();
  }, []);

  // 🎯 检查并恢复被中断的报告生成
  useEffect(() => {
    checkAndRecoverReportGeneration();
  }, [checkAndRecoverReportGeneration]);

  // === 新增：URL参数处理，触发隐藏演示 ===
  useEffect(() => {
    console.log('🔗 ChatPage: === URL参数检查 ===');
    console.log('🔗 ChatPage: URL信息:', {
      pathname: location.pathname,
      search: location.search,
      hasSearch: !!location.search
    });
    
    const searchParams = new URLSearchParams(location.search);
    const demoParam = searchParams.get('demo');
    
    console.log('🔗 ChatPage: URL参数解析:', {
      demoParam,
      allParams: Object.fromEntries(searchParams.entries())
    });
    
    if (demoParam) {
      console.log('🔗 ChatPage: 检测到演示参数，触发演示:', demoParam);
      triggerDemoByUrl(searchParams);
    } else {
      console.log('🔗 ChatPage: 未检测到演示参数');
    }
    
    // 清理函数：页面卸载时停止演示
    return () => {
      if (demoMode) {
        console.log('🔗 ChatPage: 页面卸载，停止演示');
        stopHiddenDemo();
      }
    };
  }, [location.search, triggerDemoByUrl, demoMode, stopHiddenDemo]);

  // === 🚀 新增：首次进入自动启动演示 ===
  useEffect(() => {
    console.log('🚀 ChatPage: === 自动启动演示检查 ===');
    console.log('🚀 ChatPage: 当前状态详情:', {
      demoMode,
      messagesLength: messages.length,
      locationSearch: location.search,
      locationPathname: location.pathname,
      hasCurrentReport: !!currentReport,
      sessionStorageKeys: Object.keys(sessionStorage),
      localStorage_keys: Object.keys(localStorage)
    });
    
    // 延迟检查，确保前面的重置逻辑完成
    const timer = setTimeout(() => {
      console.log('🚀 ChatPage: 延迟检查开始');
      
      const wasReset = sessionStorage.getItem('demoReset');
      const resetTime = sessionStorage.getItem('demoResetTime');
      const autoStarted = sessionStorage.getItem('demoAutoStarted');
      const currentTime = Date.now();
      
      console.log('🚀 ChatPage: 重置状态详细检查:', {
        wasReset: wasReset,
        resetTime: resetTime,
        autoStarted: autoStarted,
        currentTime: currentTime,
        timeSinceReset: resetTime ? currentTime - parseInt(resetTime) : 'N/A'
      });
      
      // 检查是否已经启动过演示（防止React StrictMode重复启动）
      if (autoStarted) {
        console.log('🚀 ChatPage: 🛑 演示已启动过，跳过重复启动');
        return;
      }
      
      // 🔥 简化自动启动条件 - 更宽松的条件
      const shouldAutoStart = (
        !demoMode &&                    // 不在演示模式
        messages.length <= 1 &&         // 只有欢迎消息或无消息
        !location.search.includes('demo=') && // 没有显式的demo URL参数
        !currentReport                  // 没有当前报告
        // 移除 wasReset 条件，让演示总是能启动
      );
      
      console.log('🚀 ChatPage: 自动启动条件详细检查:', {
        shouldAutoStart: shouldAutoStart,
        conditions: {
          notInDemoMode: !demoMode,
          fewMessages: messages.length <= 1,
          noURLParams: !location.search.includes('demo='),
          noCurrentReport: !currentReport,
          notAlreadyStarted: !autoStarted
          // wasReset: wasReset === 'true' // 移除此条件
        },
        currentValues: {
          demoMode: demoMode,
          messagesLength: messages.length,
          locationSearch: location.search,
          currentReport: currentReport ? 'exists' : 'null',
          autoStarted: autoStarted
        }
      });
      
      if (shouldAutoStart) {
        console.log('🚀 ChatPage: ✅ 满足自动启动条件，准备启动演示...');
        
        // 清理重置标志（如果存在）
        sessionStorage.removeItem('demoReset');
        sessionStorage.removeItem('demoResetTime');
        
        // 设置启动标志，避免重复启动
        const startFlag = 'demo_auto_started_' + Date.now();
        sessionStorage.setItem('demoAutoStarted', startFlag);
        console.log('🚀 ChatPage: 🔒 设置防重复启动标志:', startFlag);
        
        // 快速启动演示，界面加载完成后立即开始
        const demoTimer = setTimeout(() => {
          console.log('🚀 ChatPage: 🎬 正在启动默认演示场景（工作压力场景）...');
          
          // 启动默认演示场景（工作压力场景）
          const demoParams = new URLSearchParams();
          demoParams.set('demo', 'work-stress');
          
          console.log('🚀 ChatPage: 📞 调用triggerDemoByUrl，参数:', {
            demo: 'work-stress',
            allParams: Object.fromEntries(demoParams.entries())
          });
          
          triggerDemoByUrl(demoParams);
        }, 500); // 给界面更充分的时间完成渲染
        
        return () => {
          console.log('🚀 ChatPage: 清理演示启动定时器');
          clearTimeout(demoTimer);
        };
      } else {
        console.log('🚀 ChatPage: ❌ 不满足自动启动条件，跳过自动演示');
        console.log('🚀 ChatPage: 详细原因分析:', {
          '演示模式': demoMode ? '❌ 已在演示模式' : '✅ 未在演示模式',
          '消息数量': messages.length <= 1 ? `✅ 消息数量正常(${messages.length})` : `❌ 消息过多(${messages.length})`,
          'URL参数': !location.search.includes('demo=') ? '✅ 无demo参数' : `❌ 已有demo参数: ${location.search}`,
          '现有报告': !currentReport ? '✅ 无现有报告' : '❌ 已有报告',
          '重复启动': !autoStarted ? '✅ 未重复启动' : '❌ 已启动过'
        });
      }
    }, 300); // 给重置逻辑充分时间完成
    
    return () => {
      console.log('🚀 ChatPage: 清理自动启动检查定时器');
      clearTimeout(timer);
    };
  }, [demoMode, messages.length, location.search, currentReport, triggerDemoByUrl]);

  // === 🎭 新增：演示系统的消息发送回调 ===
  const handleDemoSend = async () => {
    console.log('🎭 ChatPage: === 演示系统消息发送 ===');
    console.log('🎭 ChatPage: 当前状态:', {
      demoMode,
      hasCurrentDemoTyping: !!currentDemoTyping.trim(),
      currentDemoTypingLength: currentDemoTyping.length,
      currentDemoTypingPreview: currentDemoTyping.substring(0, 30) + '...',
      currentDemoTypingFull: currentDemoTyping,
      messagesCount: messages.length
    });
    
    if (demoMode && currentDemoTyping.trim()) {
      const messageContent = currentDemoTyping.trim();
      console.log('🎭 ChatPage: 开始发送演示消息:', messageContent);
      
      // 记录发送前的消息数量
      const messageCountBefore = messages.length;
      console.log('🎭 ChatPage: 发送前消息数量:', messageCountBefore);
      
      // 通过正常的发送流程来发送演示消息
      await handleSendMessage(messageContent);
      
      // 等待消息被添加
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        const currentMessageCount = messages.length;
        
        console.log(`🎭 ChatPage: 等待消息添加，尝试 ${attempts + 1}/${maxAttempts}，消息数量: ${currentMessageCount}`);
        
        if (currentMessageCount > messageCountBefore) {
          const lastMessage = messages[currentMessageCount - 1];
          if (lastMessage.role === 'user' && lastMessage.content === messageContent) {
            console.log('✅ 🎭 ChatPage: 演示消息成功添加到界面');
            return;
          }
        }
        
        attempts++;
      }
      
      console.warn('⚠️ 🎭 ChatPage: 演示消息发送超时，但继续执行');
    } else {
      console.log('🎭 ChatPage: 跳过演示消息发送，条件不满足:', {
        demoMode,
        hasContent: !!currentDemoTyping.trim()
      });
    }
  };

  // === 🎭 新增：监听演示发送触发器 ===
  useEffect(() => {
    console.log('🎭 ChatPage: === 演示发送触发器监听 ===');
    console.log('🎭 ChatPage: 触发器状态:', {
      demoMode,
      demoSendTrigger,
      shouldTrigger: demoMode && demoSendTrigger > 0
    });
    
    if (demoMode && demoSendTrigger > 0) {
      console.log('🎭 ChatPage: 检测到演示发送触发器，值:', demoSendTrigger);
      
      // 异步处理演示消息发送
      (async () => {
        try {
          await handleDemoSend();
        } catch (error) {
          console.error('🎭 ChatPage: 演示消息发送失败:', error);
        }
      })();
    } else {
      console.log('🎭 ChatPage: 未满足发送触发条件');
    }
  }, [demoSendTrigger, demoMode]);

  // 🚀 新增：额外的报告状态检查，确保报告正确显示
  useEffect(() => {
    // 延迟检查，确保Store状态已完全恢复
    const timer = setTimeout(() => {
      if (currentReport) {
        console.log('ChatPage: 检测到已有报告，确保UI状态正确');
        // 如果有报告但生成状态仍然为true，修正状态
        if (isGeneratingReport) {
          console.log('ChatPage: 修正生成状态为false');
          setGeneratingReport(false);
          setShowInputBox(true);
        }
      }
    }, 1000); // 1秒延迟确保状态恢复完成
    
    return () => clearTimeout(timer);
  }, [currentReport, isGeneratingReport]);

  // 同步连接状态
  useEffect(() => {
    console.log('🔌 ChatPage: Connection status update', {
      wsConnected,
      wsError: wsError ? wsError.message || wsError : null,
      hybridConnectionStatus,
      currentThreadId
    });
    
    if (wsConnected && hybridConnectionStatus === 'connected') {
      setConnectionStatus('connected');
      console.log('✅ ChatPage: Both WebSocket and HTTP connections are ready');
    } else if (wsError || hybridConnectionStatus === 'error') {
      setConnectionStatus('error');
      console.log('❌ ChatPage: Connection error detected');
    } else {
      setConnectionStatus('connecting');
      console.log('🔄 ChatPage: Still connecting...');
    }
  }, [wsConnected, wsError, hybridConnectionStatus, setConnectionStatus]);

  const initializeChatThread = async () => {
    try {
      setHybridConnectionStatus('connecting');
      console.log('Initializing chat thread...');

      // 检查API健康状态和AI配置
      const healthResponse = await apiClient.checkHealth();
      console.log('Health check response:', healthResponse);

      if (healthResponse.success) {
        setHybridConnectionStatus('connected');
        
        // 检查AI配置状态
        const aiConfig = healthResponse.data?.ai;
        if (aiConfig && !aiConfig.isConfigured) {
          console.warn('DeepSeek API not properly configured:', aiConfig);
          
          // 显示AI配置警告（但不阻止聊天）
          message.warning('AI服务配置不完整，将使用模拟回复模式', 3);
        }

        // 🆕 如果没有当前线程ID，创建一个新的后端线程
        if (!currentThreadId) {
          console.log('No current thread ID, creating new backend thread...');
          const createThreadResponse = await apiClient.createChatThread('新对话');
          
          if (createThreadResponse.success && createThreadResponse.data) {
            const newThreadId = createThreadResponse.data.id;
            console.log('Backend thread created successfully:', newThreadId);
            setCurrentThreadId(newThreadId);
            
            // 🆕 立即加入WebSocket房间（如果WebSocket已连接）
            if (wsConnected) {
              console.log('Joining WebSocket room for new thread:', newThreadId);
              setTimeout(() => {
                // 使用webSocketService直接加入房间
                import('../services/websocket').then(({ webSocketService }) => {
                  webSocketService.joinRoom(newThreadId);
                });
              }, 100);
            }
          } else {
            console.error('Failed to create backend thread:', createThreadResponse.error);
            throw new Error('Failed to create backend thread');
          }
        }

        console.log('Backend connection established successfully');
      } else {
        throw new Error('Health check failed');
      }
    } catch (error) {
      console.error('Failed to initialize chat thread:', error);
      setHybridConnectionStatus('error');
      
      // 显示友好的错误信息
      message.error('无法连接到后端服务，将使用离线模式', 5);
    }
  };

  // 模拟情绪分析（离线模式使用）
  const generateEmotionData = (_content: string): EmotionData => {
    const emotions = ['positive', 'negative', 'neutral', 'excited', 'calm'];
    const primary = emotions[Math.floor(Math.random() * emotions.length)];
    return {
      primary,
      score: Math.random() * 0.5 + 0.5,
      confidence: Math.random() * 0.3 + 0.7,
      secondary: emotions.filter(e => e !== primary).slice(0, 2)
    };
  };

  // 处理发送消息 - 优先使用WebSocket，降级到HTTP API
  const handleSendMessage = async (content: string) => {
    console.log('📨 ChatPage: === 处理发送消息 ===');
    console.log('📨 ChatPage: 消息信息:', {
      contentLength: content.length,
      contentPreview: content.substring(0, 50) + '...',
      demoMode,
      currentThreadId
    });
    
    // 🎭 演示模式下只添加用户消息，不触发AI回复
    if (demoMode) {
      console.log('🎭 ChatPage: === 演示模式下发送用户消息 ===');
      console.log('🎭 ChatPage: 不会触发AI回复，仅添加用户消息');
      
      const messageId = `demo_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const userMessage: Message = {
        id: messageId,
        content,
        role: 'user',
        timestamp: new Date(),
        status: 'sent' // 演示模式下直接标记为已发送
      };

      console.log('🎭 ChatPage: 创建演示用户消息:', {
        id: messageId,
        role: userMessage.role,
        status: userMessage.status,
        contentLength: content.length
      });

      addMessage(userMessage);
      console.log('🎭 ChatPage: 演示用户消息已添加，等待演示脚本继续');
      return; // 提前返回，不执行AI回复逻辑
    }

    console.log('📨 ChatPage: 正常模式，将触发AI回复');

    // 生成唯一ID，使用更可靠的生成策略
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const userMessage: Message = {
      id: messageId,
      content,
      role: 'user',
      timestamp: new Date(),
      status: 'sending'
      // 移除用户消息的情绪数据生成，只有AI消息才需要情绪分析
    };

    console.log('📨 ChatPage: 创建正常用户消息:', {
      id: messageId,
      role: userMessage.role,
      status: userMessage.status
    });

    // 添加用户消息
    addMessage(userMessage);
    setTyping(true);

    console.log('📨 ChatPage: 开始发送消息并等待AI回复...');

    try {
      // 检查连接状态，确定使用哪种发送方式
      const shouldUseWebSocket = wsConnected && currentThreadId && !wsError;
      const shouldUseHTTP = currentThreadId && hybridConnectionStatus === 'connected';
      
      if (shouldUseWebSocket) {
        // 优先使用WebSocket发送消息
        console.log('📡 ChatPage: Sending message via WebSocket:', { 
          threadId: currentThreadId, 
          messageId,
          contentLength: content.length,
          contentPreview: content.substring(0, 50) + '...'
        });
        
        // 🆕 确保在发送消息前已加入WebSocket房间
        console.log('🏠 ChatPage: Ensuring WebSocket room membership for thread:', currentThreadId);
        import('../services/websocket').then(({ webSocketService }) => {
          webSocketService.joinRoom(currentThreadId);
        });
        
        // 启动输入指示器
        startTyping();
        console.log('⌨️ ChatPage: Started typing indicator');
        
        // 通过WebSocket发送消息
        wsSendMessage(content, {
          messageId, // 传递消息ID以确保一致性
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        });
        
        // 更新用户消息状态为已发送
        updateMessage(messageId, { status: 'sent' });
        
        console.log('📡 ChatPage: Message sent via WebSocket, waiting for AI response...', {
          messageId,
          threadId: currentThreadId,
          wsConnected,
          wsError: wsError ? 'Has Error' : 'No Error'
        });
        
      } else if (shouldUseHTTP) {
        // 降级到HTTP API
        console.log('Sending message to backend via HTTP:', { threadId: currentThreadId, content });
        
        const response = await apiClient.sendChatMessage(currentThreadId, content, {
          messageId, // 传递消息ID以确保一致性
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        });

        if (response.success && response.data) {
          const { assistantMessage, aiMetadata } = response.data;
          
          // 更新用户消息状态为已发送
          updateMessage(messageId, { status: 'sent' });

          // 添加AI回复消息，使用服务器返回的ID或生成新的ID
          const aiMessage: Message = {
            id: assistantMessage.id || `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            content: assistantMessage.content,
            role: 'assistant',
            timestamp: new Date(assistantMessage.timestamp),
            emotionData: aiMetadata ? {
              primary: 'positive',
              score: 0.8,
              confidence: 0.9,
              secondary: aiMetadata.emotionKeywords || []
            } : generateEmotionData(assistantMessage.content)
          };

          addMessage(aiMessage);
          
          // HTTP模式下收到AI回复后关闭输入状态
          setTyping(false);
          
          console.log('AI response received via HTTP:', assistantMessage.content);
        } else {
          throw new Error(response.error || 'Failed to send message');
        }
      } else {
        // 离线模式：使用模拟回复
        console.log('Using offline mode - no connection available');
        
        setTimeout(() => {
          // 更新用户消息状态为已发送
          updateMessage(messageId, { status: 'sent' });
        }, 500);

        // 模拟AI回复
        setTimeout(() => {
          const aiMessageId = `offline_ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const aiMessage: Message = {
            id: aiMessageId,
            content: generateOfflineResponse(content),
            role: 'assistant',
            timestamp: new Date(),
            emotionData: {
              primary: 'positive',
              score: 0.7,
              confidence: 0.85,
              secondary: ['calm', 'supportive']
            }
          };
          
          addMessage(aiMessage);
          
          // 离线模式下收到AI回复后关闭输入状态
          setTyping(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // 更新用户消息状态为错误
      updateMessage(messageId, { status: 'error' });
      
      // 发送失败时关闭输入状态
      setTyping(false);
      stopTyping();

      message.error('发送消息失败，请重试');
    }
    // 🚀 移除finally块中的setTyping(false)，让AI回复或错误处理时自然关闭
  };

  // 离线模式的回复生成
  const generateOfflineResponse = (_userMessage: string): string => {
    const responses = [
      '谢谢您的分享。我理解您现在的感受。请继续告诉我更多详情，这样我可以更好地帮助您。',
      '我听到了您的话，这听起来确实不容易。您愿意告诉我这种感受是从什么时候开始的吗？',
      '您的感受是完全可以理解的。每个人都会有这样的时刻。让我们一起来探讨如何应对这种情况。',
      '感谢您愿意与我分享这些。您提到的这种感受很多人都经历过。我们可以一起寻找一些应对的方法。',
      '抱歉，当前处于离线模式。如果可能，请检查网络连接或稍后重试以获得更智能的回复。'
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleReconnect = () => {
    console.log('Attempting to reconnect...');
    
    // 重新连接WebSocket
    if (!wsConnected) {
      wsConnect();
    }
    
    // 重新初始化HTTP连接
    if (hybridConnectionStatus === 'error') {
      initializeChatThread();
    }
    
    // 清除WebSocket错误
    if (wsError) {
      clearWsError();
    }
  };

  // 手动加入WebSocket房间（调试用）
  const handleJoinRoom = () => {
    if (currentThreadId) {
      console.log('Manually joining WebSocket room:', currentThreadId);
      import('../services/websocket').then(({ webSocketService }) => {
        webSocketService.joinRoom(currentThreadId);
      });
    } else {
      console.warn('No current thread ID to join room');
    }
  };

  // 处理清空对话
  const handleClearChat = () => {
    Modal.confirm({
      title: '确认清空对话',
      icon: <ExclamationCircleOutlined />,
      content: '此操作将清空当前对话中的所有聊天记录，开始全新的对话。此操作不可撤销，是否确定要继续？',
      okText: '确定清空',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          if (!currentThreadId) {
            message.error('没有活跃的聊天线程');
            return;
          }

          console.log('Clearing chat messages for thread:', currentThreadId);
          
          // 调用后端API清空消息
          const response = await apiClient.clearThreadMessages(currentThreadId);
          
                               if (response.success) {
            // 清空前端状态中的消息
            clearMessages();
            
            // 重置欢迎消息添加标记
            sessionStorage.removeItem('welcomeMessageAdded');

            // 显示成功消息
            message.success(`已成功清空 ${response.data?.deletedMessagesCount || 0} 条消息记录`);
            
            // 添加新的欢迎消息
            sessionStorage.setItem('welcomeMessageAdded', 'true');
            const welcomeMessage: Message = {
              id: `welcome_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              content: '你好！我是RuMa GPT，很高兴重新为您服务。我可以帮助您进行情感支持和心理疏导。请告诉我您今天的心情如何？',
              role: 'assistant',
              timestamp: new Date()
              // 移除emotionData，不显示情绪小标
            };
            addMessage(welcomeMessage);

            console.log('Chat cleared successfully');
          } else {
            throw new Error(response.error || '清空操作失败');
          }
        } catch (error: any) {
          console.error('Clear chat error:', error);
          message.error(`清空对话失败: ${error.message}`);
        }
      }
    });
  };

  // 处理用户登出
  const handleLogout = () => {
    Modal.confirm({
      title: '确认退出登录',
      icon: <ExclamationCircleOutlined />,
      content: '确定要退出当前账号吗？退出后您将需要重新登录才能继续使用。',
      okText: '确定退出',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          console.log('User logout initiated');
          
          // 1. 调用后端登出接口（即使失败也继续执行本地清理）
          try {
            await apiClient.logout();
            console.log('Backend logout successful');
          } catch (error) {
            console.warn('Backend logout failed, but continuing with local cleanup:', error);
          }
          
          // 2. 重置所有本地状态（用户状态、聊天状态、WebSocket连接等）
          resetAllStores();
          
          // 3. 显示成功消息
          message.success('已安全退出登录');
          
          // 4. 跳转到登录页面
          setTimeout(() => {
            navigate('/');
          }, 1000);
          
        } catch (error: any) {
          console.error('Logout error:', error);
          
          // 即使出错也要清除本地状态和跳转
          resetAllStores();
          message.warning('退出登录成功（部分操作失败）');
          
          setTimeout(() => {
            navigate('/');
          }, 1000);
        }
      }
    });
  };

  // 连接状态指示器
  const renderConnectionStatus = () => {
    const isFullyConnected = wsConnected && hybridConnectionStatus === 'connected';
    const hasError = wsError || hybridConnectionStatus === 'error';
    
    let icon;
    let text;
    let color;
    
    if (isFullyConnected) {
      icon = <WifiOutlined />;
      text = 'WebSocket已连接';
      color = '#52c41a';
    } else if (hybridConnectionStatus === 'connected') {
      icon = <DisconnectOutlined />;
      text = 'HTTP模式';
      color = '#faad14';
    } else if (hasError) {
      icon = <DisconnectOutlined />;
      text = '连接失败';
      color = '#ff4d4f';
    } else {
      icon = <ReloadOutlined spin />;
      text = '连接中';
      color = '#1890ff';
    }

    return (
      <Space style={{ color }}>
        {icon}
        <Text style={{ color, fontSize: '12px' }}>{text}</Text>
        {hasError && (
          <Button 
            type="link" 
            size="small" 
            onClick={handleReconnect}
            style={{ padding: 0, height: 'auto', color }}
          >
            重连
          </Button>
        )}
      </Space>
    );
  };

    return (
    <Layout style={{ height: '100vh', background: '#f5f5f5' }}>
      {/* 侧边栏 */}
      <Sider 
        width={280} 
        style={{ 
          background: '#fff',
          borderRight: '1px solid #e8e8e8',
          padding: '16px'
        }}
      >
        <div style={{ marginBottom: '24px' }}>
          <Title level={4} style={{ margin: 0 }}>RuMa GPT</Title>
          <Text type="secondary">智能情感支持助手</Text>
        </div>
        
        {/* 连接状态 */}
        <Card size="small" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong>连接状态</Text>
            {renderConnectionStatus()}
          </div>
        </Card>



        {/* 快捷操作 */}
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button 
            icon={<ClearOutlined />} 
            block 
            danger
            style={{ textAlign: 'left' }}
            onClick={handleClearChat}
            disabled={!currentThreadId || messages.length === 0}
          >
            清空对话
          </Button>
          <Button 
            icon={<HistoryOutlined />} 
            block 
            style={{ textAlign: 'left' }}
            onClick={() => window.location.href = '/history'}
          >
            查看历史记录
          </Button>
          <Button 
            icon={<BarChartOutlined />} 
            block 
            style={{ textAlign: 'left' }}
            onClick={() => window.location.href = '/emotion-analysis'}
          >
            情绪分析
          </Button>
          
          {/* 登出按钮 */}
          <Button 
            icon={<LogoutOutlined />} 
            block 
            danger
            style={{ textAlign: 'left', marginTop: '16px' }}
            onClick={handleLogout}
          >
            退出登录
          </Button>
          
          {/* 调试按钮 - 仅开发环境显示 */}
          {process.env.NODE_ENV === 'development' && (
            <Button 
              type="primary" 
              onClick={handleJoinRoom}
              block
              disabled={!currentThreadId}
              style={{ marginTop: '8px' }}
            >
              🔧 加入WebSocket房间
            </Button>
          )}
        </Space>
      </Sider>

      {/* 主内容区域 */}
      <Layout>
        <Content style={{ 
          display: 'flex', 
          flexDirection: 'column',
          padding: '16px',
          overflow: 'hidden'
        }}>
          {/* 消息列表 */}
          <div style={{ 
            flex: 1, 
            overflow: 'auto', 
            marginBottom: '16px',
            padding: '16px',
            background: '#fff',
            borderRadius: '8px',
            border: '1px solid #e8e8e8'
          }}>
            <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
              {messages.map((message) => (
                <MessageBubble 
                  key={message.id}
                  message={message}
                  showAvatar={true}
                  showTimestamp={true}
                />
              ))}
              
              {/* 显示生成报告按钮 */}
              {shouldShowGenerateReport && !currentReport && !isGeneratingReport && (
                <div style={{ 
                  textAlign: 'center', 
                  margin: '24px 0',
                  padding: '16px',
                  borderTop: '1px solid #f0f0f0'
                }}>
                  <Button 
                    type="primary"
                    icon={<FileTextOutlined />}
                    size="large"
                    onClick={generateReport}
                    style={{
                      background: 'linear-gradient(45deg, #1890ff, #52c41a)',
                      border: 'none',
                      borderRadius: '8px',
                      height: '48px',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}
                  >
                    🎯 生成聊天情绪分析报告
                  </Button>
                  <div style={{ marginTop: '8px', color: '#8c8c8c', fontSize: '12px' }}>
                    分析本次对话的情绪变化和心理状态
                  </div>
                </div>
              )}

              {/* 🎯 新增：显示被中断报告生成的恢复选项 */}
              {!shouldShowGenerateReport && !currentReport && !isGeneratingReport && messages.length > 0 && (() => {
                const startTimeStr = localStorage.getItem('reportGenerationStartTime');
                const threadId = localStorage.getItem('reportGenerationThreadId');
                const messagesStr = localStorage.getItem('reportGenerationMessages');
                
                if (startTimeStr && threadId && messagesStr && threadId === currentThreadId) {
                  const startTime = parseInt(startTimeStr);
                  const elapsedTime = Date.now() - startTime;
                  
                  // 如果有被中断的报告生成，且时间合理（小于5分钟）
                  if (elapsedTime < 5 * 60 * 1000) {
                    return (
                      <div style={{ 
                        textAlign: 'center', 
                        margin: '24px 0',
                        padding: '16px',
                        borderTop: '1px solid #f0f0f0',
                        background: '#fffbe6',
                        borderRadius: '8px',
                        border: '1px solid #ffd666'
                      }}>
                        <Text type="warning" style={{ marginBottom: '12px', display: 'block' }}>
                          ⚠️ 检测到未完成的报告生成任务
                        </Text>
                        <Button 
                          type="primary"
                          icon={<ReloadOutlined />}
                          onClick={generateReport}
                          style={{ marginRight: '8px' }}
                        >
                          重新生成报告
                        </Button>
                        <Button 
                          onClick={() => {
                            localStorage.removeItem('reportGenerationStartTime');
                            localStorage.removeItem('reportGenerationThreadId');
                            localStorage.removeItem('reportGenerationMessages');
                            window.location.reload();
                          }}
                        >
                          取消生成
                        </Button>
                      </div>
                    );
                  }
                }
                return null;
              })()}

              {/* 显示报告生成中的等待动画 */}
              {isGeneratingReport && (
                <div style={{ 
                  textAlign: 'center', 
                  margin: '24px 0',
                  padding: '24px',
                  borderTop: '1px solid #f0f0f0'
                }}>
                  <TypingIndicator 
                    typingUsers={[
                      { id: 'report-ai', name: '正在生成情绪分析报告', isBot: true }
                    ]}
                    showUserNames={true}
                    animationMode="ripple"
                    theme="emotion"
                    waitingMessage="正在深度分析您的情绪状态，请稍候..."
                  />
                </div>
              )}

              {/* 显示生成的报告 */}
              {currentReport && (
                <ChatReportDisplay 
                  report={currentReport}
                />
              )}

              {/* 结束聊天按钮 */}
              {currentReport && (
                <div style={{ 
                  textAlign: 'center', 
                  margin: '24px 0',
                  padding: '16px',
                  borderTop: '1px solid #f0f0f0'
                }}>
                  <Button 
                    icon={<StopOutlined />}
                    size="large"
                    onClick={endCurrentChat}
                    style={{
                      borderRadius: '8px',
                      height: '40px'
                    }}
                  >
                    结束当前聊天
                  </Button>
                  <div style={{ marginTop: '8px', color: '#8c8c8c', fontSize: '12px' }}>
                    清空对话记录，开始新的聊天
                  </div>
                </div>
              )}

              {isTyping && !isGeneratingReport && (
                <TypingIndicator 
                  typingUsers={[
                    { id: 'ai', name: 'RuMa AI', isBot: true }
                  ]}
                  showUserNames={true}
                  animationMode="ripple"
                  theme="emotion"
                />
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* 消息输入框 - 根据showInputBox状态控制显示 */}
          {showInputBox && (
            <MessageInput 
              onSendMessage={handleSendMessage}
              isLoading={isTyping}
              disabled={!isAuthenticated}
              placeholder={
                isAuthenticated 
                  ? "输入您的想法..." 
                  : "请先登录以开始对话"
              }
              maxLength={500}
              demoMode={demoMode}
              demoTypingText={currentDemoTyping}
              onDemoSend={handleDemoSend}
            />
          )}
        </Content>
      </Layout>
    </Layout>
  );
};

export default ChatPage; 