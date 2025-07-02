import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Message, ChatSession } from '../types';
import { demoApiClient } from '../utils/demoApiClient';

// DeepSeek服务返回的聊天报告格式
interface ChatEmotionReport {
  detected_emotions: Array<{
    emotion: string;
    emotion_cn: string;
    intensity: number;
    causes: Array<{
      cause: string;
      description: string;
    }>;
  }>;
  summary: string;
}

// === 新增：隐藏演示系统类型定义 ===
interface DemoStep {
  type: 'user_typing' | 'user_sent' | 'ai_thinking' | 'ai_reply' | 'generate_report';
  content?: string;           // 消息内容
  typingDuration?: number;    // 打字时长(ms)
  thinkingDuration?: number;  // 思考时长(ms)
  emotionData?: {            // AI消息的情绪数据
    primary: string;
    score: number;
    confidence: number;
    secondary?: string[];
  };
}

interface DemoScenario {
  id: string;
  title: string;
  description: string;
  steps: DemoStep[];
}

const apiClient = demoApiClient;

// === 演示场景数据 ===
const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'work-stress',
    title: '工作压力场景',
    description: '展示用户表达工作压力，AI提供情绪支持的完整流程',
    steps: [
      {
        type: 'user_typing',
        content: '我最近工作压力特别大，经常加班到很晚，感觉快要承受不住了...',
        typingDuration: 2000 // 减少打字时间
      },
      {
        type: 'user_sent',
        content: '我最近工作压力特别大，经常加班到很晚，感觉快要承受不住了...'
      },
      {
        type: 'ai_thinking',
        thinkingDuration: 1500 // 减少思考时间
      },
      {
        type: 'ai_reply',
        content: '听到你这段时间承受的巨大压力，我深感同情。加班到很晚真的可以让人感到筋疲力尽，尤其是在你感觉快要承受不住的时候。能够意识到这些感受，并愿意分享出来，这需要很大的勇气。\n工作负担过重经常让人觉得无力应对，不知道这种压力是否来源于特定的项目或者人际关系呢？有时候，明确感受到的压力出处也许能帮助我们更好地应对。\n你能做的已经很多了，仅仅是承认这些情绪便是一大步。或许尝试下班后给自己一点空间和时间，做些能让你轻松的小事情，比如散步或者放一段喜欢的音乐，帮助缓解一下紧张的情绪。你是有能力也值得被温柔对待的人。我在这里，随时都能陪伴你。',
        emotionData: {
          primary: 'concerned',
          score: 0.75,
          confidence: 0.9,
          secondary: ['supportive', 'understanding']
        }
      },
      {
        type: 'user_typing',
        content: '主要是项目期限很紧，而且同时要处理好几个项目，感觉时间完全不够用。晚上躺在床上还在想工作的事，很难入睡。',
        typingDuration: 1800 // 减少打字时间
      },
      {
        type: 'user_sent',
        content: '主要是项目期限很紧，而且同时要处理好几个项目，感觉时间完全不够用。晚上躺在床上还在想工作的事，很难入睡。'
      },
      {
        type: 'ai_thinking',
        thinkingDuration: 1200 // 减少思考时间
      },
      {
        type: 'ai_reply',
        content: '这听起来真的很难，你正面临多重项目的压力，时间似乎总是不够用。这种情况很容易让人感到焦虑，尤其是在你试图入睡的时候，这些工作思绪依然萦绕不去。能意识到这一点是非常好的，你已经在开始洞察自己应对压力的方式。\n项目期限的紧迫感和同时处理多个任务的要求，可以像一座大山一样压在肩上。或许可以考虑在白天给自己设定一个时间段，将最紧迫的任务分阶段完成，尝试在可能的时候，逐一聚焦于一个任务，可能会帮助减少一点整体的压迫感。\n入睡困难实在令人沮丧，尤其是当你知道你需要休息却无法停下思绪时。一些人发现，试着在睡前不久记录下让他们担心的事情，然后告诉自己会在第二天处理这些，可以暂时放下这些负担。\n你正在承受很多，但你的努力也在为自己创造一种可调整的工作方式。如果愿意，可以试着每天为自己寻找到一点点不因工作而定的小乐趣和休息时间，逐步恢复内心的平和。我在这里支持你，希望能帮助你找到一种舒缓压力的方法。',
        emotionData: {
          primary: 'helpful',
          score: 0.8,
          confidence: 0.95,
          secondary: ['supportive', 'practical']
        }
      },
      {
        type: 'user_typing',
        content: '谢谢您的建议，我觉得你说的很有道理。我确实应该在一段时间内只专注于一个项目，这样就不会那么焦虑了。',
        typingDuration: 1500 // 减少打字时间
      },
      {
        type: 'user_sent',
        content: '谢谢您的建议，我觉得你说的很有道理。我确实应该在一段时间内只专注于一个项目，这样就不会那么焦虑了。'
      },
      {
        type: 'ai_thinking',
        thinkingDuration: 1200 // 减少思考时间
      },
      {
        type: 'ai_reply',
        content: '很高兴您认同这个建议！听到你觉得这些建议有帮助，我真为你感到高兴。专注于一个项目，尽量减少多任务带来的压力，可能会让你的工作流程变得更有条理，同时也可能缓解一些焦虑感。这不仅是在善待自己的工作方法，也是一个珍贵的自我关爱行动。\n记住，你不必完美地应对这一切；你的努力本身就值得称赞。试着在一天的结束给予自己些许赞美，无论取得多小的进步，无论是完成了重要的任务还是只是在繁忙中找到了短暂的平和。\n如果你需要继续讨论自己的感受或者面临新的挑战，请随时联系我。我会一直在这里支持你。',
        emotionData: {
          primary: 'encouraging',
          score: 0.85,
          confidence: 0.9,
          secondary: ['positive', 'supportive']
        }
      },
      {
        type: 'generate_report'
      }
    ]
  },
  {
    id: 'relationships',
    title: '人际关系场景',
    description: '展示用户表达人际关系困扰，AI提供建议的完整流程',
    steps: [
      {
        type: 'user_typing',
        content: '我和室友最近总是因为一些小事产生矛盾，气氛变得很尴尬，不知道该怎么处理...',
        typingDuration: 1800 // 减少打字时间
      },
      {
        type: 'user_sent',
        content: '我和室友最近总是因为一些小事产生矛盾，气氛变得很尴尬，不知道该怎么处理...'
      },
      {
        type: 'ai_thinking',
        thinkingDuration: 2200
      },
      {
        type: 'ai_reply',
        content: '人际关系中的小摩擦确实很让人困扰。能感受到您对这种尴尬氛围的不安。可以分享一下最近是什么样的小事引起了矛盾吗？这样我能更好地帮您分析。',
        emotionData: {
          primary: 'understanding',
          score: 0.8,
          confidence: 0.85,
          secondary: ['curious', 'supportive']
        }
      },
      {
        type: 'user_typing',
        content: '比如洗碗、打扫卫生这些日常琐事，还有音响声音大小的问题。感觉都是些很小的事，但累积起来就很烦躁。',
        typingDuration: 2500
      },
      {
        type: 'user_sent',
        content: '比如洗碗、打扫卫生这些日常琐事，还有音响声音大小的问题。感觉都是些很小的事，但累积起来就很烦躁。'
      },
      {
        type: 'ai_thinking',
        thinkingDuration: 2000
      },
      {
        type: 'ai_reply',
        content: '您的感受完全可以理解。生活习惯的差异确实容易累积成更大的问题。建议尝试开诚布公地沟通一次，制定一些共同的生活规则。重要的是用"我感觉..."而不是"你总是..."的方式表达，这样能减少对方的防御心理。',
        emotionData: {
          primary: 'helpful',
          score: 0.9,
          confidence: 0.92,
          secondary: ['practical', 'understanding']
        }
      },
      {
        type: 'generate_report'
      }
    ]
  },
  {
    id: 'achievement',
    title: '成就分享场景',
    description: '展示用户分享积极情绪，AI给予鼓励的完整流程',
    steps: [
      {
        type: 'user_typing',
        content: '今天终于完成了我一直在准备的项目汇报，老板和同事们的反馈都很好，我感觉特别有成就感！',
        typingDuration: 2600
      },
      {
        type: 'user_sent',
        content: '今天终于完成了我一直在准备的项目汇报，老板和同事们的反馈都很好，我感觉特别有成就感！'
      },
      {
        type: 'ai_thinking',
        thinkingDuration: 1800
      },
      {
        type: 'ai_reply',
        content: '太棒了！恭喜您！项目汇报成功是非常值得庆祝的事情。能感受到您内心的喜悦和满足感。这种成就感来自于您的努力和坚持，您应该为自己感到骄傲。',
        emotionData: {
          primary: 'joyful',
          score: 0.95,
          confidence: 0.98,
          secondary: ['congratulatory', 'encouraging']
        }
      },
      {
        type: 'user_typing',
        content: '谢谢！准备了好几周，中间也有过很多焦虑和不确定，但最终坚持下来了。现在回想起来觉得很值得。',
        typingDuration: 2400
      },
      {
        type: 'user_sent',
        content: '谢谢！准备了好几周，中间也有过很多焦虑和不确定，但最终坚持下来了。现在回想起来觉得很值得。'
      },
      {
        type: 'ai_thinking',
        thinkingDuration: 2000
      },
      {
        type: 'ai_reply',
        content: '您的经历很好地诠释了成长的过程 - 从焦虑不确定到最终成功的转变。这种经历不仅带来了成就感，也证明了您有能力克服困难。希望这份自信能帮助您面对未来的挑战！',
        emotionData: {
          primary: 'inspiring',
          score: 0.9,
          confidence: 0.95,
          secondary: ['encouraging', 'positive']
        }
      },
      {
        type: 'generate_report'
      }
    ]
  }
];

// === 隐藏演示控制器 ===
class HiddenChatDemoController {
  private chatStore: any;
  
  constructor(chatStore: any) {
    this.chatStore = chatStore;
  }
  
  // 从URL参数获取场景索引
  getScenarioIndexFromUrl(params: URLSearchParams): number {
    console.log('🔗 DemoController: 解析URL参数获取场景索引');
    
    const demoParam = params.get('demo');
    console.log('🔗 DemoController: demo参数值:', demoParam);
    
    const allParams = Object.fromEntries(params.entries());
    console.log('🔗 DemoController: 所有URL参数:', allParams);
    
    let scenarioIndex = 0; // 默认场景索引
    
    switch (demoParam) {
      case 'work-stress':
        scenarioIndex = 0;
        break;
      case 'relationships':
        scenarioIndex = 1;
        break;
      case 'achievement':
        scenarioIndex = 2;
        break;
      default:
        console.warn('🔗 DemoController: 未知的demo参数，使用默认场景:', demoParam);
        scenarioIndex = 0;
    }
    
    console.log('🔗 DemoController: 解析结果:', {
      demoParam,
      scenarioIndex,
      scenarioId: DEMO_SCENARIOS[scenarioIndex]?.id
    });
    
    return scenarioIndex;
  }
  
  // 获取场景数据
  getScenario(index: number): DemoScenario | null {
    console.log('📋 DemoController: 获取演示场景');
    console.log('📋 DemoController: 请求索引:', index);
    console.log('📋 DemoController: 可用场景数量:', DEMO_SCENARIOS.length);
    
    if (index >= 0 && index < DEMO_SCENARIOS.length) {
      const scenario = DEMO_SCENARIOS[index];
      console.log('📋 DemoController: 找到场景:', {
        index,
        id: scenario.id,
        title: scenario.title,
        stepsCount: scenario.steps.length
      });
      return scenario;
    } else {
      console.warn('📋 DemoController: 场景索引超出范围:', {
        requestedIndex: index,
        availableCount: DEMO_SCENARIOS.length
      });
      return null;
    }
  }
  
  // 自动模拟用户打字
  async autoSimulateUserTyping(content: string, duration: number = 2000): Promise<void> {
    console.log('⌨️ DemoController: 开始模拟用户打字');
    console.log('⌨️ DemoController: 打字参数:', {
      contentLength: content.length,
      duration,
      contentPreview: content.substring(0, 30) + '...'
    });
    
    const store = this.chatStore.getState();
    const charsPerMs = content.length / duration;
    let currentText = '';
    
    console.log('⌨️ DemoController: 计算打字速度:', charsPerMs, 'chars/ms');
    
    for (let i = 0; i <= content.length; i++) {
      // 检查是否被停止
      if (!this.chatStore.getState().demoMode) {
        console.log('⌨️ DemoController: 演示被停止，中断打字');
        break;
      }
      
      currentText = content.substring(0, i);
      store.setDemoTyping(currentText);
      
      // 动态计算间隔，让打字看起来更自然
      const interval = Math.max(10, duration / content.length + (Math.random() - 0.5) * 20);
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    console.log('⌨️ DemoController: 打字模拟完成，最终文本长度:', currentText.length);
  }

  // 自动模拟AI思考状态
  async autoSimulateAIThinking(duration: number = 2000): Promise<void> {
    console.log('🤔 DemoController: 开始AI思考状态');
    console.log('🤔 DemoController: 思考时长:', duration, 'ms');
    
    const store = this.chatStore.getState();
    store.setTyping(true);
    
    console.log('🤔 DemoController: 设置typing状态为true');
    
    await new Promise(resolve => setTimeout(resolve, duration));
    
    // 检查是否被停止
    if (this.chatStore.getState().demoMode) {
      store.setTyping(false);
      console.log('🤔 DemoController: AI思考完成，设置typing状态为false');
    } else {
      console.log('🤔 DemoController: 演示被停止，跳过思考状态重置');
    }
  }

  // 自动模拟AI回复
  async autoSimulateAIReply(content: string, emotionData?: any): Promise<void> {
    console.log('🤖 DemoController: 开始AI回复');
    console.log('🤖 DemoController: 回复参数:', {
      contentLength: content.length,
      hasEmotionData: !!emotionData,
      contentPreview: content.substring(0, 50) + '...'
    });
    
    // 检查是否被停止
    if (!this.chatStore.getState().demoMode) {
      console.log('🤖 DemoController: 演示被停止，跳过AI回复');
      return;
    }

    const store = this.chatStore.getState();
    
    const aiMessage = {
      id: `demo_ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content,
      role: 'assistant' as const,
      timestamp: new Date(),
      emotionData: emotionData ? {
        primary: emotionData.primary,
        score: emotionData.score,
        confidence: emotionData.confidence,
        secondary: emotionData.secondary || []
      } : undefined
    };

    console.log('🤖 DemoController: 创建AI消息:', {
      id: aiMessage.id,
      role: aiMessage.role,
      hasEmotionData: !!aiMessage.emotionData,
      emotionPrimary: aiMessage.emotionData?.primary
    });

    store.addMessage(aiMessage);
    console.log('🤖 DemoController: AI消息已添加到store');
  }

  // 自动模拟用户发送消息
  async autoSimulateUserSend(content: string): Promise<void> {
    console.log('📤 DemoController: 开始发送用户消息');
    console.log('📤 DemoController: 消息内容:', {
      length: content.length,
      preview: content.substring(0, 50) + '...',
      fullContent: content
    });
    
    // 检查是否被停止
    if (!this.chatStore.getState().demoMode) {
      console.log('📤 DemoController: 演示被停止，跳过用户消息发送');
      return;
    }

    const store = this.chatStore.getState();
    
    console.log('📤 DemoController: 当前store状态:', {
      demoMode: store.demoMode,
      currentDemoTyping: store.currentDemoTyping,
      messagesCount: store.messages.length
    });
    
    // 确保打字内容与要发送的内容一致
    if (store.currentDemoTyping !== content) {
      console.log('📤 DemoController: 同步打字内容到发送内容');
      store.setDemoTyping(content);
      // 给一点时间让UI更新
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // 触发发送（通过触发器机制）
    console.log('📤 DemoController: 触发消息发送机制');
    store.triggerDemoSend();
    
    // 等待消息发送完成
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 验证消息是否成功添加
    const afterSendState = this.chatStore.getState();
    console.log('📤 DemoController: 发送后验证:', {
      messagesCount: afterSendState.messages.length,
      lastMessage: afterSendState.messages[afterSendState.messages.length - 1]?.content?.substring(0, 30) + '...'
    });
    
    // 清空当前打字内容（在消息发送后）
    store.setDemoTyping('');
    console.log('📤 DemoController: 用户消息发送流程完成');
  }
  
  // 运行完整的演示场景
  async runDemoScenario(scenarioIndex: number): Promise<void> {
    console.log('🎮 DemoController: === 开始运行演示场景 ===');
    
    const scenario = this.getScenario(scenarioIndex);
    if (!scenario) {
      console.warn('🎮 DemoController: 场景不存在，索引:', scenarioIndex);
      return;
    }
    
    console.log('🎮 DemoController: 演示场景详情:', {
      index: scenarioIndex,
      id: scenario.id,
      title: scenario.title,
      description: scenario.description,
      stepsCount: scenario.steps.length
    });
    
    // 设置演示模式
    console.log('🎮 DemoController: 设置演示模式和显示状态...');
    this.chatStore.getState().setDemoMode(true);
    this.chatStore.getState().setShowInputBox(true); // 显示输入框用于演示
    
    const initialState = this.chatStore.getState();
    console.log('🎮 DemoController: 初始状态检查:', {
      demoMode: initialState.demoMode,
      showInputBox: initialState.showInputBox,
      messagesCount: initialState.messages.length
    });
    
    // 快速开始演示，只给界面短暂时间完成渲染
    console.log('🎮 DemoController: 等待界面渲染完成，500ms...');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 执行场景步骤
    console.log('🎮 DemoController: 开始执行演示步骤...');
    for (let i = 0; i < scenario.steps.length; i++) {
      const step = scenario.steps[i];
      
      // 检查是否被停止
      const currentState = this.chatStore.getState();
      if (!currentState.demoMode) {
        console.log('🎮 DemoController: 检测到演示模式被停止，中断执行');
        break;
      }
      
      console.log(`🎮 DemoController: === 执行步骤 ${i + 1}/${scenario.steps.length} ===`);
      console.log(`🎮 DemoController: 步骤类型: ${step.type}`);
      console.log(`🎮 DemoController: 步骤内容: ${step.content?.substring(0, 50)}${step.content && step.content.length > 50 ? '...' : ''}`);
      
      switch (step.type) {
        case 'user_typing':
          if (step.content && step.typingDuration) {
            console.log(`🎮 DemoController: 开始模拟用户打字，时长: ${step.typingDuration}ms`);
            await this.autoSimulateUserTyping(step.content, step.typingDuration);
            console.log('🎮 DemoController: 用户打字模拟完成');
          }
          break;
          
        case 'user_sent':
          if (step.content) {
            console.log('🎮 DemoController: 开始发送用户消息');
            await this.autoSimulateUserSend(step.content);
            console.log('🎮 DemoController: 用户消息发送完成');
            // 🎯 user_sent后短暂等待，确保用户消息完全显示
            console.log('🎮 DemoController: 等待用户消息显示，800ms...');
            await new Promise(resolve => setTimeout(resolve, 800));
          }
          break;
          
        case 'ai_thinking':
          if (step.thinkingDuration) {
            console.log(`🎮 DemoController: 开始AI思考状态，时长: ${step.thinkingDuration}ms`);
            await this.autoSimulateAIThinking(step.thinkingDuration);
            console.log('🎮 DemoController: AI思考状态完成');
          }
          break;
          
        case 'ai_reply':
          if (step.content) {
            console.log('🎮 DemoController: 开始AI回复');
            await this.autoSimulateAIReply(step.content, step.emotionData);
            console.log('🎮 DemoController: AI回复完成');
            // 🎯 AI回复后短暂等待，让用户有时间阅读
            console.log('🎮 DemoController: 等待用户阅读AI回复，1200ms...');
            await new Promise(resolve => setTimeout(resolve, 1200));
          }
          break;
          
        case 'generate_report':
          // 2秒延迟后自动生成报告
          console.log('🎮 DemoController: 准备生成报告，等待2000ms...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          console.log('🎮 DemoController: 开始生成报告');
          await this.chatStore.getState().generateReport();
          console.log('🎮 DemoController: 报告生成完成');
          break;
      }
      
      // 🎯 调整步骤间隔 - 根据步骤类型设置不同间隔（快速模式）
      let stepInterval = 400; // 减少默认间隔
      if (step.type === 'user_sent') {
        stepInterval = 200; // user_sent后更短间隔
      } else if (step.type === 'ai_reply') {
        stepInterval = 300; // AI回复后短间隔
      } else if (step.type === 'user_typing') {
        stepInterval = 200; // 打字完成后快速进入发送
      }
      
      console.log(`🎮 DemoController: 步骤间隔: ${stepInterval}ms`);
      await new Promise(resolve => setTimeout(resolve, stepInterval));
    }
    
    console.log('🎮 DemoController: === 演示场景完成 ===', scenario.title);
  }
}

// 聊天状态接口
interface ChatState {
  // 核心状态
  messages: Message[];
  currentThreadId: string | null;
  isTyping: boolean;
  isLoading: boolean;
  connectionStatus: 'connecting' | 'connected' | 'error' | 'disconnected';
  
  // 会话管理
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  
  // 输入状态
  inputText: string;
  isComposing: boolean; // 正在输入中文等组合字符
  
  // === 新增：报告生成状态 ===
  isGeneratingReport: boolean;        // 是否正在生成报告
  currentReport: ChatEmotionReport | null; // 当前生成的报告
  showInputBox: boolean;               // 是否显示输入框
  
  // === 新增：隐藏演示状态 ===
  demoMode: boolean;                    // 是否在演示模式（隐藏状态）
  demoScenarioIndex: number;           // 当前演示场景索引  
  demoStepIndex: number;               // 当前步骤索引
  demoAutoPlaying: boolean;            // 自动播放状态
  currentDemoTyping: string;           // 当前正在模拟输入的文字
  demoTimerId: number | null;          // 演示定时器ID
  demoSendTrigger: number;             // 演示发送触发器（用于触发消息发送）
  
  // 操作方法
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  removeMessage: (messageId: string) => void;
  clearMessages: () => void;
  
  // 线程管理
  setCurrentThreadId: (threadId: string | null) => void;
  createNewThread: (title?: string) => string;
  
  // 状态控制
  setTyping: (typing: boolean) => void;
  setLoading: (loading: boolean) => void;
  setConnectionStatus: (status: 'connecting' | 'connected' | 'error' | 'disconnected') => void;
  
  // 输入管理
  setInputText: (text: string) => void;
  setComposing: (composing: boolean) => void;
  clearInput: () => void;
  
  // 会话管理
  loadSession: (sessionId: string) => void;
  saveCurrentSession: () => void;
  createSession: (title: string) => ChatSession;
  deleteSession: (sessionId: string) => void;
  
  // === 新增：报告生成操作方法 ===
  setGeneratingReport: (generating: boolean) => void;
  setCurrentReport: (report: ChatEmotionReport | null) => void;
  setShowInputBox: (show: boolean) => void;
  checkAndRecoverReportGeneration: () => Promise<void>;
  generateReport: () => Promise<void>;
  endCurrentChat: () => void;
  
  // === 新增：隐藏演示操作方法 ===
  startHiddenDemo: (scenarioIndex?: number) => Promise<void>;
  stopHiddenDemo: () => void;
  triggerDemoByUrl: (params: URLSearchParams) => void;
  setDemoMode: (mode: boolean) => void;
  setDemoTyping: (text: string) => void;
  triggerDemoSend: () => void;
}

// 创建聊天状态管理Store
export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => {
      // 创建演示控制器实例
      const demoController = new HiddenChatDemoController({ getState: get, setState: set });
      
      return {
        // 初始状态
        messages: [],
        currentThreadId: null,
        isTyping: false,
        isLoading: false,
        connectionStatus: 'disconnected',
        
        // 会话管理
        sessions: [],
        currentSession: null,
        
        // 输入状态
        inputText: '',
        isComposing: false,

        // === 报告生成状态 ===
        isGeneratingReport: false,
        currentReport: null,
        showInputBox: true, // 默认显示输入框

        // === 新增：隐藏演示状态 ===
        demoMode: false,
        demoScenarioIndex: 0,
        demoStepIndex: 0,
        demoAutoPlaying: false,
        currentDemoTyping: '',
        demoTimerId: null,
        demoSendTrigger: 0,

        // 添加消息
        addMessage: (message: Message) => {
          console.log('📝 ChatStore: Add message', {
            id: message.id,
            role: message.role,
            contentLength: message.content.length,
            contentPreview: message.content.substring(0, 50) + '...',
            demoMode: get().demoMode  // 添加演示模式状态日志
          });
          
          set((state) => {
            // 🔧 修复：更精确的重复检查逻辑
            const existingMessage = state.messages.find(msg => msg.id === message.id);
            if (existingMessage) {
              console.log('⚠️ ChatStore: Message already exists, skipping add', {
                existingId: existingMessage.id,
                newId: message.id,
                existingRole: existingMessage.role,
                newRole: message.role
              });
              return state; // 不做任何改变
            }
            
            console.log('✅ ChatStore: Adding new message to store', {
              messageId: message.id,
              currentMessageCount: state.messages.length,
              newMessageCount: state.messages.length + 1,
              demoMode: state.demoMode
            });
            
            return {
              messages: [...state.messages, message]
            };
          });
          
          // 🎭 演示模式下不自动保存会话，避免演示数据被持久化
          const currentState = get();
          if (!currentState.demoMode) {
            console.log('📝 ChatStore: 正常模式，保存会话');
            get().saveCurrentSession();
          } else {
            console.log('🎭 ChatStore: 演示模式，跳过会话保存');
          }
          
          console.log('📝 ChatStore: Message processing completed', {
            messageId: message.id,
            totalMessages: get().messages.length,
            demoMode: currentState.demoMode
          });
        },

        // 更新消息
        updateMessage: (messageId: string, updates: Partial<Message>) => {
          console.log('ChatStore: Update message', { messageId, updates });
          set((state) => ({
            messages: state.messages.map(msg =>
              msg.id === messageId ? { ...msg, ...updates } : msg
            )
          }));
          
          get().saveCurrentSession();
        },

        // 移除消息
        removeMessage: (messageId: string) => {
          console.log('ChatStore: Remove message', messageId);
          set((state) => ({
            messages: state.messages.filter(msg => msg.id !== messageId)
          }));
          
          get().saveCurrentSession();
        },

        // 清空消息
        clearMessages: () => {
          console.log('ChatStore: Clear all messages');
          set({ messages: [] });
        },

        // 设置当前线程ID
        setCurrentThreadId: (threadId: string | null) => {
          console.log('ChatStore: Set current thread ID', threadId);
          set({ currentThreadId: threadId });
        },

        // 创建新线程
        createNewThread: (title?: string) => {
          const threadId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
          console.log('ChatStore: Create new thread', { threadId, title });
          
          // 清空当前消息并设置新线程
          set({
            currentThreadId: threadId,
            messages: []
          });
          
          return threadId;
        },

        // 设置输入状态
        setTyping: (typing: boolean) => {
          set({ isTyping: typing });
        },

        // 设置加载状态
        setLoading: (loading: boolean) => {
          set({ isLoading: loading });
        },

        // 设置连接状态
        setConnectionStatus: (status: 'connecting' | 'connected' | 'error' | 'disconnected') => {
          console.log('ChatStore: Set connection status', status);
          set({ connectionStatus: status });
        },

        // 设置输入文本
        setInputText: (text: string) => {
          set({ inputText: text });
        },

        // 设置组合输入状态
        setComposing: (composing: boolean) => {
          set({ isComposing: composing });
        },

        // 清空输入
        clearInput: () => {
          set({ inputText: '', isComposing: false });
        },

        // 加载会话
        loadSession: (sessionId: string) => {
          const state = get();
          const session = state.sessions.find(s => s.id === sessionId);
          
          if (session) {
            console.log('ChatStore: Load session', sessionId);
            set({
              currentSession: session,
              messages: session.messages,
              currentThreadId: sessionId
            });
          }
        },

        // 保存当前会话
        saveCurrentSession: () => {
          const state = get();
          const { currentThreadId, messages } = state;
          
          if (currentThreadId && messages.length > 0) {
            const session: ChatSession = {
              id: currentThreadId,
              title: messages[0]?.content?.substring(0, 50) || '新对话',
              messages: [...messages],
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            console.log('ChatStore: Save current session', session.id);
            
            set((state) => ({
              currentSession: session,
              sessions: [
                ...state.sessions.filter(s => s.id !== currentThreadId),
                session
              ]
            }));
          }
        },

        // 创建会话
        createSession: (title: string) => {
          const sessionId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
          const session: ChatSession = {
            id: sessionId,
            title,
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          console.log('ChatStore: Create session', session);
          
          set((state) => ({
            sessions: [...state.sessions, session],
            currentSession: session,
            currentThreadId: sessionId,
            messages: []
          }));
          
          return session;
        },

        // 删除会话
        deleteSession: (sessionId: string) => {
          console.log('ChatStore: Delete session', sessionId);
          
          set((state) => {
            const newSessions = state.sessions.filter(s => s.id !== sessionId);
            const isCurrentSession = state.currentSession?.id === sessionId;
            
            return {
              sessions: newSessions,
              currentSession: isCurrentSession ? null : state.currentSession,
              currentThreadId: isCurrentSession ? null : state.currentThreadId,
              messages: isCurrentSession ? [] : state.messages
            };
          });
        },

        // === 新增：报告生成操作方法 ===
        setGeneratingReport: (generating: boolean) => {
          set({ isGeneratingReport: generating });
        },
        
        setCurrentReport: (report: ChatEmotionReport | null) => {
          set({ currentReport: report });
        },
        
        setShowInputBox: (show: boolean) => {
          set({ showInputBox: show });
        },

        // 🎯 新增：检查并恢复被中断的报告生成
        checkAndRecoverReportGeneration: async () => {
          try {
            const startTimeStr = localStorage.getItem('reportGenerationStartTime');
            const threadId = localStorage.getItem('reportGenerationThreadId');
            const messagesStr = localStorage.getItem('reportGenerationMessages');
            
            const currentState = get();
            
            // 🎯 首要检查：如果已经有报告，确保显示状态正确
            if (currentState.currentReport) {
              console.log('ChatStore: 检测到已有报告数据，确保显示状态正确');
              set({ 
                isGeneratingReport: false,
                showInputBox: true // 有报告时应该显示输入框
              });
              return;
            }
            
            if (!startTimeStr || !threadId || !messagesStr) {
              // 没有未完成的报告生成，确保状态正确
              set({ 
                isGeneratingReport: false,
                showInputBox: true 
              });
              return; 
            }
            
            const startTime = parseInt(startTimeStr);
            const currentTime = Date.now();
            const elapsedTime = currentTime - startTime;
            
            // 如果超过5分钟，认为生成失败，清理状态
            if (elapsedTime > 5 * 60 * 1000) {
              console.log('ChatStore: 检测到超时的报告生成，清理状态');
              localStorage.removeItem('reportGenerationStartTime');
              localStorage.removeItem('reportGenerationThreadId');
              localStorage.removeItem('reportGenerationMessages');
              set({ 
                isGeneratingReport: false,
                showInputBox: true 
              });
              return;
            }
            
            // 如果当前线程ID匹配，并且时间合理，继续等待
            if (currentState.currentThreadId === threadId && elapsedTime < 5 * 60 * 1000) {
              console.log('ChatStore: 检测到正在进行的报告生成，恢复等待状态');
              set({ 
                isGeneratingReport: true,
                showInputBox: false 
              });
              
              // 🚀 新增：自动重新尝试获取报告结果
              console.log('ChatStore: 尝试重新获取报告生成结果...');
              setTimeout(async () => {
                try {
                  // 解析存储的消息数据
                  const storedMessages = JSON.parse(messagesStr);
                  const messagesForAPI = storedMessages.map((msg: any) => ({
                    content: msg.content,
                    role: msg.role.toLowerCase(),
                    timestamp: msg.timestamp
                  }));
                  
                  // 重新调用API获取报告（如果已生成完成）
                  const reportResponse = await apiClient.generateChatReport(messagesForAPI, threadId);
                  
                  if (reportResponse.success && reportResponse.data) {
                    const { report } = reportResponse.data;
                    console.log('✅ 恢复了之前生成的报告');
                    
                    // 设置报告和清理状态
                    set({ 
                      currentReport: report,
                      isGeneratingReport: false,
                      showInputBox: true
                    });
                    
                    // 清理追踪信息
                    localStorage.removeItem('reportGenerationStartTime');
                    localStorage.removeItem('reportGenerationThreadId');
                    localStorage.removeItem('reportGenerationMessages');
                  } else {
                    console.log('ChatStore: 报告可能仍在生成中，继续等待...');
                  }
                } catch (error) {
                  console.error('ChatStore: 重新获取报告时出错:', error);
                  // 清理状态
                  set({ 
                    isGeneratingReport: false,
                    showInputBox: true 
                  });
                  localStorage.removeItem('reportGenerationStartTime');
                  localStorage.removeItem('reportGenerationThreadId');
                  localStorage.removeItem('reportGenerationMessages');
                }
              }, 2000); // 2秒后尝试
            } else {
              // 线程ID不匹配或其他情况，清理状态
              console.log('ChatStore: 线程ID不匹配或其他问题，清理生成状态');
              localStorage.removeItem('reportGenerationStartTime');
              localStorage.removeItem('reportGenerationThreadId');
              localStorage.removeItem('reportGenerationMessages');
              set({ 
                isGeneratingReport: false,
                showInputBox: true 
              });
            }
            
          } catch (error) {
            console.error('ChatStore: 恢复报告生成状态时出错:', error);
            // 出错时清理状态
            localStorage.removeItem('reportGenerationStartTime');
            localStorage.removeItem('reportGenerationThreadId');
            localStorage.removeItem('reportGenerationMessages');
            set({ 
              isGeneratingReport: false,
              showInputBox: true 
            });
          }
        },

        generateReport: async () => {
           console.log('📊 ChatStore: 开始生成聊天报告...');
           
           const { messages, currentThreadId, demoMode } = get();
           
           console.log('📊 ChatStore: 报告生成环境检查:', {
             demoMode,
             messagesCount: messages.length,
             currentThreadId: currentThreadId,
             userMessages: messages.filter(m => m.role === 'user').length,
             aiMessages: messages.filter(m => m.role === 'assistant').length
           });
           
           // 🎭 演示模式下使用模拟报告生成
           if (demoMode) {
             console.log('🎭 ChatStore: 演示模式下生成模拟报告');
             
             // 检查演示消息数量
             const userMsgs = messages.filter(m => m.role === 'user');
             const aiMsgs = messages.filter(m => m.role === 'assistant');
             
             console.log('🎭 ChatStore: 演示消息统计:', {
               userCount: userMsgs.length,
               aiCount: aiMsgs.length,
               totalCount: messages.length
             });
             
             if (userMsgs.length === 0 || aiMsgs.length === 0) {
               console.warn('🎭 ChatStore: 演示对话数据不足，无法生成报告');
               return;
             }
             
             // 设置生成状态
             set({ 
               isGeneratingReport: true,
               showInputBox: false 
             });
             
             console.log('🎭 ChatStore: 开始生成演示报告...');
             
             // 模拟报告生成延迟
             await new Promise(resolve => setTimeout(resolve, 2000));
             
             // 生成模拟报告数据
             const mockReport = {
               detected_emotions: [
                 {
                   emotion: 'stress',
                   emotion_cn: '压力',
                   intensity: 0.75,
                   causes: [
                     {
                       cause: '工作压力',
                       description: '工作压力过大，期限紧张'
                     },
                     {
                       cause: '时间管理',
                       description: '时间管理困难，多任务并行'
                     }
                   ]
                 },
                 {
                   emotion: 'anxiety',
                   emotion_cn: '焦虑',
                   intensity: 0.65,
                   causes: [
                     {
                       cause: '睡眠问题',
                       description: '睡眠质量受到工作影响'
                     }
                   ]
                 },
                 {
                   emotion: 'hope',
                   emotion_cn: '希望',
                   intensity: 0.45,
                   causes: [
                     {
                       cause: '得到帮助',
                       description: '获得了有效的建议和支持'
                     }
                   ]
                 }
               ],
               summary: `你正感受到**极大的压力**，主要来自于繁重的工作负担和紧迫的项目期限。这种压力让你感到**焦虑**，尤其是在同时处理多个项目和入睡困难时。尽管如此，你对通过专注于一个项目来减轻焦虑感到**希望**。\n\n 你的感受是完全可以理解的，面对如此多的挑战，感到不堪重负是正常的。你有勇气去面对这些困难，并且愿意尝试新的策略来缓解压力，这是非常值得称赞的。记住，你的努力和自我关爱是重要的，任何小的进步都是值得庆祝的。继续保持这种积极的态度，我相信你有能力找到适合自己的工作节奏。`
             };
             
             console.log('🎭 ChatStore: 演示报告生成完成:', {
               emotionsCount: mockReport.detected_emotions.length,
               summaryLength: mockReport.summary.length
             });
             
             // 设置报告到状态中
             set({ 
               currentReport: mockReport,
               isGeneratingReport: false
             });
             
             console.log('✅ 演示聊天报告生成完成');
             return;
           }
           
           // 🔄 正常模式下的真实API调用
           console.log('📊 ChatStore: 正常模式，调用真实API生成报告');
           
           try {
             // 1. 检查消息数据
             const userMsgs = messages.filter(m => m.role === 'user');
             const aiMsgs = messages.filter(m => m.role === 'assistant');
             
             if (userMsgs.length === 0 || aiMsgs.length === 0) {
               console.warn('ChatStore: 对话数据不足，无法生成报告');
               return;
             }
             
             // 2. 设置生成状态，隐藏输入框
             set({ 
               isGeneratingReport: true,
               showInputBox: false 
             });
             
             // 🎯 3. 设置生成开始时间，用于超时检测和恢复
             const reportGenerationStartTime = Date.now();
             localStorage.setItem('reportGenerationStartTime', reportGenerationStartTime.toString());
             localStorage.setItem('reportGenerationThreadId', currentThreadId || '');
             localStorage.setItem('reportGenerationMessages', JSON.stringify(messages));
             
             // 3. 准备消息数据，转换为API所需格式
             const messagesForAPI = messages.map(msg => ({
               content: msg.content,
               role: msg.role.toLowerCase(),
               timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp
             }));
             
             console.log('📊 调用API生成情绪分析报告...');
             
             // 4. 调用API生成报告
             const reportResponse = await apiClient.generateChatReport(messagesForAPI, currentThreadId || undefined);
             
             if (!reportResponse.success || !reportResponse.data) {
               throw new Error(reportResponse.error || '报告生成失败');
             }
             
             const { report, metadata } = reportResponse.data;
             console.log('✅ 报告生成成功:', {
               emotionsDetected: report.detected_emotions?.length || 0,
               summaryLength: report.summary?.length || 0,
               fileName: metadata.reportFileName
             });
             
             // 5. 上传聊天历史记录
             console.log('📁 上传聊天历史记录...');
             const historyResponse = await apiClient.uploadChatHistory(
               messagesForAPI,
               metadata.chatHistoryFileName,
               currentThreadId || undefined
             );
             
             if (historyResponse.success) {
               console.log('✅ 聊天历史上传成功:', historyResponse.data?.uploadPath);
             } else {
               console.warn('⚠️ 聊天历史上传失败:', historyResponse.error);
             }
             
             // 6. 上传报告
             console.log('📊 上传报告数据...');
             const uploadResponse = await apiClient.uploadReport(
               report,
               metadata.reportFileName,
               currentThreadId || undefined
             );
             
             if (uploadResponse.success) {
               console.log('✅ 报告上传成功:', uploadResponse.data?.uploadPath);
             } else {
               console.warn('⚠️ 报告上传失败:', uploadResponse.error);
             }
             
             // 7. 设置报告数据到状态中
             set({ currentReport: report });
             console.log('✅ 聊天报告生成完成');
             
             // 🎯 8. 清理生成状态追踪信息
             localStorage.removeItem('reportGenerationStartTime');
             localStorage.removeItem('reportGenerationThreadId');
             localStorage.removeItem('reportGenerationMessages');
             
           } catch (error) {
             console.error('❌ 生成报告失败:', error);
             
             // 错误时恢复输入框显示
             set({ 
               isGeneratingReport: false,
               showInputBox: true 
             });
             
             // 🎯 清理生成状态追踪信息
             localStorage.removeItem('reportGenerationStartTime');
             localStorage.removeItem('reportGenerationThreadId');
             localStorage.removeItem('reportGenerationMessages');
             
             // TODO: 显示错误提示给用户
           } finally {
             set({ isGeneratingReport: false });
           }
         },
         
         endCurrentChat: () => {
           console.log('ChatStore: 结束当前聊天');
           
           // 1. 清空所有聊天状态
           set({
             messages: [],
             currentReport: null,
             showInputBox: true,
             isGeneratingReport: false,
             isTyping: false,
             isLoading: false,
             inputText: '',
             isComposing: false
           });
           
           // 2. 重置会话状态
           set({ currentSession: null });
           
           // 🚀 3. 异步创建新的后端线程，确保后续消息能正常发送到AI
           console.log('ChatStore: 创建新的后端聊天线程...');
           
           // 🔧 修复：直接创建后端线程，避免临时ID导致的WebSocket房间状态混乱
           (async () => {
             try {
               // 先清空当前线程ID，确保useWebSocket正确处理房间切换
               set({ currentThreadId: null });
               
               const createThreadResponse = await apiClient.createChatThread('新对话');
               
               if (createThreadResponse.success && createThreadResponse.data) {
                 const backendThreadId = createThreadResponse.data.id;
                 console.log('ChatStore: 后端线程创建成功:', backendThreadId);
                 
                 // 设置新的线程ID，useWebSocket会自动处理房间加入
                 set({ currentThreadId: backendThreadId });
                 
                 console.log('ChatStore: 聊天已重置，可以继续与AI对话');
               } else {
                 console.warn('ChatStore: 后端线程创建失败，创建临时前端ID:', createThreadResponse.error);
                 
                 // 降级：创建临时前端线程ID
                 const tempThreadId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                 set({ currentThreadId: tempThreadId });
                 
                 console.log('ChatStore: 使用临时线程ID，系统会在发送消息时再次尝试创建后端线程');
               }
             } catch (error) {
               console.error('ChatStore: 创建后端线程时出错:', error);
               
               // 错误处理：创建临时前端线程ID以确保功能可用
               const tempThreadId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
               set({ currentThreadId: tempThreadId });
               
               console.log('ChatStore: 由于错误使用临时线程ID，系统会降级到HTTP模式或离线模式');
             }
           })();
         },

         // === 新增：隐藏演示操作方法 ===
         startHiddenDemo: async (scenarioIndex?: number) => {
           console.log('🎭 ChatStore: === 开始隐藏演示 ===');
           
           const index = scenarioIndex ?? 0;
           const scenario = demoController.getScenario(index);
           
           console.log('🎭 ChatStore: 演示场景信息:', {
             scenarioIndex: index,
             scenarioExists: !!scenario,
             scenarioId: scenario?.id,
             scenarioTitle: scenario?.title,
             stepsCount: scenario?.steps.length
           });
           
           if (!scenario) {
             console.error('🎭 ChatStore: 演示场景不存在，停止启动');
             return;
           }
           
           // 检查启动前状态
           const beforeState = get();
           console.log('🎭 ChatStore: 启动前状态:', {
             demoMode: beforeState.demoMode,
             messagesCount: beforeState.messages.length,
             currentReport: !!beforeState.currentReport,
             isGeneratingReport: beforeState.isGeneratingReport
           });
           
           // 🧹 彻底清理状态，准备演示
           console.log('🎭 ChatStore: 正在清理并设置演示状态...');
           
           // 创建演示专用的线程ID
           const demoThreadId = `demo_thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
           console.log('🎭 ChatStore: 创建演示专用线程ID:', demoThreadId);
           
           set({
             demoMode: true,
             demoScenarioIndex: index,
             demoStepIndex: 0,
             demoAutoPlaying: true,
             demoSendTrigger: 0,
             currentDemoTyping: '',
             // 清空现有消息和报告
             messages: [],
             currentReport: null,
             currentThreadId: demoThreadId,  // 设置演示专用线程ID而不是null
             isGeneratingReport: false,
             showInputBox: true,
             isTyping: false
           });
           
           // 验证状态设置
           const afterState = get();
           console.log('🎭 ChatStore: 状态设置完成后:', {
             demoMode: afterState.demoMode,
             demoScenarioIndex: afterState.demoScenarioIndex,
             messagesCount: afterState.messages.length,
             showInputBox: afterState.showInputBox
           });
           
           console.log('🎭 ChatStore: 演示状态初始化完成，开始运行场景...');
           
           // 运行演示场景
           try {
             console.log('🎭 ChatStore: 调用demoController.runDemoScenario...');
             await demoController.runDemoScenario(index);
             console.log('🎭 ChatStore: 演示场景运行完成');
           } catch (error) {
             console.error('🎭 ChatStore: 演示运行失败:', error);
             console.error('🎭 ChatStore: 错误详情:', {
               message: error instanceof Error ? error.message : String(error),
               stack: error instanceof Error ? error.stack : undefined
             });
             get().stopHiddenDemo();
           }
         },
         
         stopHiddenDemo: () => {
           console.log('🛑 ChatStore: === 停止隐藏演示 ===');
           
           const state = get();
           
           console.log('🛑 ChatStore: 停止前状态:', {
             demoMode: state.demoMode,
             demoScenarioIndex: state.demoScenarioIndex,
             demoStepIndex: state.demoStepIndex,
             messagesCount: state.messages.length,
             hasTimerId: !!state.demoTimerId
           });
           
           // 清理定时器
           if (state.demoTimerId) {
             console.log('🛑 ChatStore: 清理演示定时器:', state.demoTimerId);
             clearTimeout(state.demoTimerId);
           }
           
           // 🧹 彻底清理演示状态和数据
           console.log('🛑 ChatStore: 开始清理演示状态和数据...');
           set({
             demoMode: false,
             demoScenarioIndex: 0,
             demoStepIndex: 0,
             demoAutoPlaying: false,
             currentDemoTyping: '',
             demoTimerId: null,
             demoSendTrigger: 0,
             showInputBox: true,
             // 清理演示产生的消息和报告
             messages: [],
             currentReport: null,
             currentThreadId: null,
             isGeneratingReport: false
           });
           
           // 验证清理结果
           const afterState = get();
           console.log('🛑 ChatStore: 清理后状态:', {
             demoMode: afterState.demoMode,
             messagesCount: afterState.messages.length,
             currentReport: !!afterState.currentReport,
             showInputBox: afterState.showInputBox
           });
           
           // 🗑️ 清理localStorage中可能存在的演示数据
           console.log('🛑 ChatStore: 清理localStorage中的演示数据');
           try {
             // 强制触发持久化，确保演示数据被清理
             // 由于现在demoMode=false，partialize会正常保存空的状态
             console.log('🛑 ChatStore: localStorage清理操作完成');
           } catch (error) {
             console.warn('🛑 ChatStore: 清理localStorage时出错:', error);
           }
           
           console.log('✅ ChatStore: 演示停止完成');
         },
         
         triggerDemoByUrl: (params: URLSearchParams) => {
           console.log('🔗 ChatStore: === 通过URL触发隐藏演示 ===');
           console.log('🔗 ChatStore: 参数详情:', {
             params: Object.fromEntries(params.entries()),
             demoParam: params.get('demo')
           });
           
           const demoParam = params.get('demo');
           
           if (demoParam) {
             const scenarioIndex = demoController.getScenarioIndexFromUrl(params);
             console.log('🔗 ChatStore: 演示参数处理结果:', {
               demoParam,
               scenarioIndex,
               scenarioExists: !!demoController.getScenario(scenarioIndex)
             });
             
             // 检查当前状态
             const currentState = get();
             console.log('🔗 ChatStore: 当前Store状态:', {
               demoMode: currentState.demoMode,
               messagesCount: currentState.messages.length,
               isGeneratingReport: currentState.isGeneratingReport
             });
             
             // 快速启动演示，页面已经基本加载完成
             console.log('🔗 ChatStore: 设置启动演示定时器，200ms后执行');
             setTimeout(() => {
               console.log('🔗 ChatStore: 执行启动演示，场景索引:', scenarioIndex);
               get().startHiddenDemo(scenarioIndex);
             }, 200);
           } else {
             console.log('🔗 ChatStore: 没有demo参数，跳过演示启动');
           }
         },
         
         setDemoMode: (mode: boolean) => {
           console.log('ChatStore: 设置隐藏演示模式:', mode);
           set({ demoMode: mode });
         },
         
         setDemoTyping: (text: string) => {
           set({ 
             currentDemoTyping: text,
             inputText: text // 同步到真实输入框显示
           });
         },
         
         triggerDemoSend: () => {
           set((state) => ({ 
             demoSendTrigger: state.demoSendTrigger + 1 
           }));
         }
      };
    },
    {
      name: 'chat-storage',
      storage: createJSONStorage(() => localStorage, {
        reviver: (key, value) => {
          // 将timestamp字符串转换回Date对象
          if ((key === 'timestamp' || key === 'createdAt' || key === 'updatedAt') && value) {
            return new Date(value as string);
          }
          return value;
        },
        replacer: (_key, value) => {
          // Date对象保持原样，JSON.stringify会自动处理
          return value;
        }
      }),
      partialize: (state) => {
        // 🎭 演示模式下不持久化消息和报告，避免演示数据被保存
        if (state.demoMode) {
          console.log('🎭 ChatStore: 演示模式下跳过持久化');
          return {
            // 只保存基础会话信息，不保存演示相关数据
            sessions: state.sessions,
            currentSession: null, // 演示模式下不保存当前会话
            currentThreadId: null, // 演示模式下不保存线程ID
            messages: [], // 不保存演示消息
            currentReport: null, // 不保存演示报告
            showInputBox: true,
            isGeneratingReport: false
            // 不保存任何演示状态
          };
        }
        
        // 正常模式下的持久化配置
        return {
          // 持久化会话和当前状态
          sessions: state.sessions,
          currentSession: state.currentSession,
          currentThreadId: state.currentThreadId,
          messages: state.messages,
          // === 持久化报告生成状态 ===
          currentReport: state.currentReport,
          showInputBox: state.showInputBox,
          isGeneratingReport: state.isGeneratingReport
          // === 🚫 不持久化演示状态 - 演示应该是临时的 ===
          // demoMode, demoScenarioIndex 等演示状态不应该被持久化
        };
      }
    }
  )
);

// 导出选择器 hooks
export const useMessages = () => useChatStore((state) => state.messages);
export const useCurrentThreadId = () => useChatStore((state) => state.currentThreadId);
export const useIsTyping = () => useChatStore((state) => state.isTyping);
export const useChatLoading = () => useChatStore((state) => state.isLoading);
export const useConnectionStatus = () => useChatStore((state) => state.connectionStatus);
export const useChatSessions = () => useChatStore((state) => state.sessions);
export const useCurrentSession = () => useChatStore((state) => state.currentSession);
export const useInputText = () => useChatStore((state) => state.inputText);
export const useIsComposing = () => useChatStore((state) => state.isComposing);

// === 新增：报告生成相关选择器 ===
export const useIsGeneratingReport = () => useChatStore((state) => state.isGeneratingReport);
export const useCurrentReport = () => useChatStore((state) => state.currentReport);
export const useShowInputBox = () => useChatStore((state) => state.showInputBox);

// === 新增：隐藏演示相关选择器 ===
export const useDemoMode = () => useChatStore((state) => state.demoMode);
export const useDemoScenarioIndex = () => useChatStore((state) => state.demoScenarioIndex);
export const useDemoStepIndex = () => useChatStore((state) => state.demoStepIndex);
export const useDemoAutoPlaying = () => useChatStore((state) => state.demoAutoPlaying);
export const useCurrentDemoTyping = () => useChatStore((state) => state.currentDemoTyping);
export const useDemoSendTrigger = () => useChatStore((state) => state.demoSendTrigger);

// 判断是否应该显示生成报告按钮
export const useShouldShowGenerateReport = () => useChatStore((state) => {
  const userMsgs = state.messages.filter(m => m.role === 'user');
  const aiMsgs = state.messages.filter(m => m.role === 'assistant');
  
  // 必须满足以下所有条件：
  // 1. 至少有一条用户消息和一条AI回复
  // 2. AI当前没有在输入中（确保AI完成了回复）
  // 3. 当前没有已生成的报告
  // 4. 当前没有在生成报告中
  return userMsgs.length >= 1 && 
         aiMsgs.length >= 1 && 
         !state.isTyping && 
         !state.currentReport &&
         !state.isGeneratingReport;
});

// 导出操作方法
export const useChatActions = () => useChatStore((state) => ({
  addMessage: state.addMessage,
  updateMessage: state.updateMessage,
  removeMessage: state.removeMessage,
  clearMessages: state.clearMessages,
  setCurrentThreadId: state.setCurrentThreadId,
  createNewThread: state.createNewThread,
  setTyping: state.setTyping,
  setLoading: state.setLoading,
  setConnectionStatus: state.setConnectionStatus,
  setInputText: state.setInputText,
  setComposing: state.setComposing,
  clearInput: state.clearInput,
  loadSession: state.loadSession,
  saveCurrentSession: state.saveCurrentSession,
  createSession: state.createSession,
  deleteSession: state.deleteSession,
  setGeneratingReport: state.setGeneratingReport,
  setCurrentReport: state.setCurrentReport,
  setShowInputBox: state.setShowInputBox,
  checkAndRecoverReportGeneration: state.checkAndRecoverReportGeneration,
  generateReport: state.generateReport,
  endCurrentChat: state.endCurrentChat,
  startHiddenDemo: state.startHiddenDemo,
  stopHiddenDemo: state.stopHiddenDemo,
  triggerDemoByUrl: state.triggerDemoByUrl,
  setDemoMode: state.setDemoMode,
  setDemoTyping: state.setDemoTyping,
  triggerDemoSend: state.triggerDemoSend
})); 