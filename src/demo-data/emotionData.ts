// 情绪分析演示数据
export const demoEmotionAnalysis = {
  totalSessions: 15,
  timeRange: {
    start: '2025-01-01T00:00:00.000Z',
    end: '2025-01-29T23:59:59.000Z'
  },
  coreMetrics: {
    conversationCount: 15,
    averageEmotionIntensity: 0.68,
    primaryEmotion: "平静",
    emotionTrend: "稳定上升",
    emotionStability: 0.75,
    positiveEmotionRatio: 0.62
  },
  emotionDistribution: [
    { emotion: "平静", count: 25, percentage: 0.35, color: "#52c41a" },
    { emotion: "快乐", count: 18, percentage: 0.25, color: "#fadb14" },
    { emotion: "焦虑", count: 12, percentage: 0.17, color: "#ff9c6e" },
    { emotion: "沮丧", count: 8, percentage: 0.11, color: "#ffa940" },
    { emotion: "愤怒", count: 5, percentage: 0.07, color: "#ff7875" },
    { emotion: "恐惧", count: 3, percentage: 0.04, color: "#b37feb" }
  ],
  emotionTrends: [
    { date: '2025-01-01', emotions: { "平静": 0.6, "快乐": 0.3, "焦虑": 0.1 } },
    { date: '2025-01-03', emotions: { "平静": 0.7, "快乐": 0.2, "焦虑": 0.1 } },
    { date: '2025-01-05', emotions: { "平静": 0.5, "快乐": 0.3, "焦虑": 0.2 } },
    { date: '2025-01-07', emotions: { "平静": 0.8, "快乐": 0.15, "焦虑": 0.05 } },
    { date: '2025-01-10', emotions: { "平静": 0.6, "快乐": 0.25, "焦虑": 0.15 } },
    { date: '2025-01-12', emotions: { "平静": 0.65, "快乐": 0.3, "焦虑": 0.05 } },
    { date: '2025-01-15', emotions: { "平静": 0.7, "快乐": 0.2, "焦虑": 0.1 } },
    { date: '2025-01-18', emotions: { "平静": 0.75, "快乐": 0.2, "焦虑": 0.05 } },
    { date: '2025-01-20', emotions: { "平静": 0.6, "快乐": 0.35, "焦虑": 0.05 } },
    { date: '2025-01-22', emotions: { "平静": 0.8, "快乐": 0.15, "焦虑": 0.05 } },
    { date: '2025-01-25', emotions: { "平静": 0.65, "快乐": 0.3, "焦虑": 0.05 } },
    { date: '2025-01-27', emotions: { "平静": 0.7, "快乐": 0.25, "焦虑": 0.05 } },
    { date: '2025-01-29', emotions: { "平静": 0.75, "快乐": 0.2, "焦虑": 0.05 } }
  ],
  emotionNetwork: {
    nodes: [
      {
        id: "emotion_calm",
        type: "emotion",
        label: "平静",
        size: 60,
        color: "#52c41a",
        intensity: 0.8,
        x: 0,
        y: 0
      },
      {
        id: "cause_meditation",
        type: "cause",
        label: "冥想练习",
        size: 25,
        color: "#87e8de",
        intensity: 0.6
      },
      {
        id: "cause_good_sleep",
        type: "cause", 
        label: "充足睡眠",
        size: 22,
        color: "#87e8de",
        intensity: 0.55
      },
      {
        id: "emotion_happy",
        type: "emotion",
        label: "快乐",
        size: 45,
        color: "#fadb14", 
        intensity: 0.7,
        x: 100,
        y: 100
      },
      {
        id: "cause_achievement",
        type: "cause",
        label: "工作成就",
        size: 20,
        color: "#fff1b8",
        intensity: 0.5
      },
      {
        id: "emotion_anxious",
        type: "emotion", 
        label: "焦虑",
        size: 35,
        color: "#ff9c6e",
        intensity: 0.6,
        x: -100,
        y: 100
      },
      {
        id: "cause_deadline",
        type: "cause",
        label: "工作压力",
        size: 18,
        color: "#ffd8bf",
        intensity: 0.45
      }
    ],
    edges: [
      {
        id: "edge_1",
        source: "emotion_calm",
        target: "cause_meditation",
        strength: 0.8,
        type: "triggered_by"
      },
      {
        id: "edge_2", 
        source: "emotion_calm",
        target: "cause_good_sleep",
        strength: 0.7,
        type: "triggered_by"
      },
      {
        id: "edge_3",
        source: "emotion_happy",
        target: "cause_achievement", 
        strength: 0.6,
        type: "triggered_by"
      },
      {
        id: "edge_4",
        source: "emotion_anxious",
        target: "cause_deadline",
        strength: 0.75,
        type: "triggered_by"
      }
    ]
  }
};

export const demoHistoryData = [
  {
    id: 'history_001',
    title: '工作压力讨论',
    timestamp: '2025-01-29T08:30:00.000Z',
    summary: '讨论了工作压力和时间管理问题',
    primaryEmotion: 'anxious',
    emotionScore: 0.75,
    messageCount: 8
  },
  {
    id: 'history_002', 
    title: '情感支持对话',
    timestamp: '2025-01-28T14:20:00.000Z',
    summary: '获得了情感支持和理解',
    primaryEmotion: 'supportive',
    emotionScore: 0.85,
    messageCount: 12
  },
  {
    id: 'history_003',
    title: '日常情绪分享',
    timestamp: '2025-01-27T19:45:00.000Z', 
    summary: '分享了日常生活中的小确幸',
    primaryEmotion: 'happy',
    emotionScore: 0.8,
    messageCount: 6
  }
]; 