// 演示聊天数据
export const demoChatThreads = [
  {
    id: 'thread_001',
    title: '工作压力讨论',
    createdAt: '2025-01-29T08:30:00.000Z',
    updatedAt: '2025-01-29T09:15:00.000Z'
  },
  {
    id: 'thread_002', 
    title: '情感支持对话',
    createdAt: '2025-01-29T10:00:00.000Z',
    updatedAt: '2025-01-29T10:45:00.000Z'
  }
];

export const demoMessages = [
  {
    id: 'msg_001',
    content: '你好，我最近工作压力很大，感觉有些焦虑',
    role: 'user',
    timestamp: '2025-01-29T08:30:00.000Z',
    emotionData: {
      primary: 'anxious',
      score: 0.75,
      confidence: 0.85,
      secondary: ['stressed', 'overwhelmed']
    }
  },
  {
    id: 'msg_002',
    content: '我理解你现在的感受。工作压力确实会带来焦虑，这是很正常的反应。可以告诉我具体是什么让你感到压力吗？',
    role: 'assistant',
    timestamp: '2025-01-29T08:31:00.000Z',
    emotionData: {
      primary: 'supportive',
      score: 0.9,
      confidence: 0.95,
      secondary: ['understanding', 'caring']
    }
  },
  {
    id: 'msg_003',
    content: '主要是最近项目deadline很紧，同时还要处理很多突发的需求变更',
    role: 'user',
    timestamp: '2025-01-29T08:32:00.000Z',
    emotionData: {
      primary: 'frustrated',
      score: 0.7,
      confidence: 0.8,
      secondary: ['stressed', 'overwhelmed']
    }
  },
  {
    id: 'msg_004',
    content: '听起来你面对的确实是很有挑战性的情况。处理紧急deadline和频繁的需求变更会让人感到失控。让我们一起想想如何应对这种情况。你觉得最让你困扰的是时间管理，还是不确定性？',
    role: 'assistant',
    timestamp: '2025-01-29T08:33:00.000Z',
    emotionData: {
      primary: 'supportive',
      score: 0.85,
      confidence: 0.9,
      secondary: ['understanding', 'helpful']
    }
  }
];

export const demoAIResponses = [
  '我很理解你的感受，这确实是一个值得关注的问题。',
  '让我们一起探讨一下这个情况，找到一些解决方案。',
  '你的感受是完全可以理解的，很多人都会遇到类似的困扰。',
  '我们可以从另一个角度来看待这个问题。',
  '这种情况下，保持冷静是很重要的。让我们想想有什么方法可以帮助你。'
];

export const demoChatReport = {
  summary: "本次对话中，用户主要表达了工作压力带来的焦虑情绪。通过分析可以看出，用户面临的主要挑战是时间管理和应对突发需求变更。在对话过程中，AI提供了理解和支持，帮助用户分析问题的根源。用户的情绪从最初的焦虑和沮丧，逐渐转向更加理性的思考。建议继续关注用户的工作压力管理需求。",
  emotions: {
    dominant: { name: "焦虑", intensity: 0.75, color: "#ff9c6e" },
    secondary: [
      { name: "压力", intensity: 0.65, color: "#ff7875" },
      { name: "沮丧", intensity: 0.55, color: "#ffa940" }
    ]
  },
  insights: [
    "用户主要关注工作效率和时间管理",
    "对突发变化的适应能力需要提升", 
    "需要更多情绪调节技巧"
  ],
  recommendations: [
    "制定更灵活的工作计划",
    "学习压力管理技巧",
    "建立更好的沟通机制"
  ],
  timeline: [
    { time: "08:30", emotion: "anxious", intensity: 0.75 },
    { time: "08:32", emotion: "frustrated", intensity: 0.7 },
    { time: "08:33", emotion: "hopeful", intensity: 0.4 }
  ]
}; 