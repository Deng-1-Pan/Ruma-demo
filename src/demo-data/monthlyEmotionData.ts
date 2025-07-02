import { EmotionSummaryData } from '../types/emotion';
import { EmotionInfo } from '../types/history';

// 扩展EmotionInfo以支持原因信息 (和emotionAnalysisStore.ts中的OSSEmotionInfo保持一致)
interface ExtendedEmotionInfo extends EmotionInfo {
  emotion_cn?: string;
  causes?: Array<{
    cause: string;
    description?: string;
  }>;
}

// 修改后的EmotionSummaryData接口以支持扩展的情绪数据
interface ExtendedEmotionSummaryData {
  timestamp: string;
  thread_id?: string;
  summary?: string;
  detected_emotions: ExtendedEmotionInfo[];
  knowledge_graph?: any;
  metadata?: {
    model_version?: string;
    analysis_version?: string;
    processing_time?: number;
  };
}

// 一个月的情绪分析假数据 (每天1-3次对话)
export const monthlyEmotionData: ExtendedEmotionSummaryData[] = [
  // 第1天 - 1次对话
  {
    timestamp: "2025-06-01T09:15:22",
    thread_id: "thread_001",
    summary: "用户因为新项目启动感到兴奋和紧张，对未来充满期待但也有些担忧团队协作能力。",
    detected_emotions: [
      {
        emotion: "Excitement",
        emotion_cn: "兴奋",
        intensity: 70,
        causes: [
          {
            cause: "新项目启动",
            description: "对新项目的机会和挑战感到兴奋。"
          }
        ]
      },
      {
        emotion: "Anxiety",
        emotion_cn: "焦虑",
        intensity: 40,
        causes: [
          {
            cause: "团队协作担忧",
            description: "对团队能否有效协作存在担忧。"
          }
        ]
      }
    ]
  },
  // 第2天 - 2次对话
  {
    timestamp: "2025-06-02T08:30:15",
    thread_id: "thread_002",
    summary: "用户分享了昨晚的好梦，心情愉悦，对新的一天充满希望。",
    detected_emotions: [
      {
        emotion: "Happiness",
        emotion_cn: "快乐",
        intensity: 85,
        causes: [
          {
            cause: "美好的梦境",
            description: "昨晚的好梦让心情变得愉悦。"
          }
        ]
      },
      {
        emotion: "Hope",
        emotion_cn: "希望",
        intensity: 75,
        causes: [
          {
            cause: "新的一天",
            description: "对新的一天充满希望和期待。"
          }
        ]
      }
    ]
  },
  {
    timestamp: "2025-06-02T19:45:30",
    thread_id: "thread_003",
    summary: "工作中遇到了技术难题，感到沮丧和困惑，但仍保持解决问题的决心。",
    detected_emotions: [
      {
        emotion: "Dejection",
        emotion_cn: "沮丧",
        intensity: 60,
        causes: [
          {
            cause: "技术难题",
            description: "工作中遇到的技术问题让人感到沮丧。"
          }
        ]
      },
      {
        emotion: "Confusion",
        emotion_cn: "困惑",
        intensity: 55,
        causes: [
          {
            cause: "问题复杂性",
            description: "复杂的问题让人感到困惑不解。"
          }
        ]
      }
    ]
  },
  // 第3天 - 3次对话
  {
    timestamp: "2025-06-03T07:20:10",
    thread_id: "thread_004",
    summary: "早晨锻炼后感觉精力充沛，对健康生活方式感到满意。",
    detected_emotions: [
      {
        emotion: "Satisfaction",
        emotion_cn: "满足",
        intensity: 80,
        causes: [
          {
            cause: "晨练效果",
            description: "早晨锻炼带来的精力和满足感。"
          }
        ]
      },
      {
        emotion: "Confidence",
        emotion_cn: "自信",
        intensity: 70,
        causes: [
          {
            cause: "健康状态",
            description: "良好的身体状态增强了自信心。"
          }
        ]
      }
    ]
  },
  {
    timestamp: "2025-06-03T14:15:22",
    thread_id: "thread_005",
    summary: "午餐时与同事的愉快交流，感受到团队的温暖和支持。",
    detected_emotions: [
      {
        emotion: "Joy",
        emotion_cn: "喜悦",
        intensity: 75,
        causes: [
          {
            cause: "同事交流",
            description: "与同事的愉快交流带来喜悦。"
          }
        ]
      },
      {
        emotion: "Belongingness",
        emotion_cn: "归属感",
        intensity: 85,
        causes: [
          {
            cause: "团队支持",
            description: "感受到团队的温暖和归属感。"
          }
        ]
      }
    ]
  },
  {
    timestamp: "2025-06-03T21:30:45",
    thread_id: "thread_006",
    summary: "晚上看电影时被感人情节触动，产生了深深的感动和反思。",
    detected_emotions: [
      {
        emotion: "Gratitude",
        emotion_cn: "感激",
        intensity: 80,
        causes: [
          {
            cause: "电影感悟",
            description: "电影的感人情节让人心生感激。"
          }
        ]
      },
      {
        emotion: "Melancholy",
        emotion_cn: "惆怅",
        intensity: 45,
        causes: [
          {
            cause: "深度思考",
            description: "对人生的深度思考带来些许惆怅。"
          }
        ]
      }
    ]
  },
  // 第4天 - 1次对话
  {
    timestamp: "2025-06-04T16:40:18",
    thread_id: "thread_007",
    summary: "收到朋友的好消息，为朋友感到高兴，同时也有些羡慕。",
    detected_emotions: [
      {
        emotion: "Happiness",
        emotion_cn: "快乐",
        intensity: 70,
        causes: [
          {
            cause: "朋友好消息",
            description: "朋友的好消息让人感到高兴。"
          }
        ]
      },
      {
        emotion: "Jealousy",
        emotion_cn: "嫉妒",
        intensity: 25,
        causes: [
          {
            cause: "对比心理",
            description: "与朋友的对比产生轻微的羡慕情绪。"
          }
        ]
      }
    ]
  },
  // 第5天 - 2次对话  
  {
    timestamp: "2025-06-05T10:25:30",
    thread_id: "thread_008",
    summary: "周五的工作总结让人感到充实，对一周的成果感到骄傲。",
    detected_emotions: [
      {
        emotion: "Pride",
        emotion_cn: "自豪",
        intensity: 85,
        causes: [
          {
            cause: "工作成果",
            description: "一周工作的成果让人感到自豪。"
          }
        ]
      },
      {
        emotion: "Sense of Achievement",
        emotion_cn: "成就感",
        intensity: 90,
        causes: [
          {
            cause: "目标完成",
            description: "完成工作目标带来的成就感。"
          }
        ]
      }
    ]
  },
  {
    timestamp: "2025-06-05T20:15:45",
    thread_id: "thread_009",
    summary: "周末计划被取消，感到失望但也理解现实情况。",
    detected_emotions: [
      {
        emotion: "Disappointment",
        emotion_cn: "失望",
        intensity: 50,
        causes: [
          {
            cause: "计划取消",
            description: "周末计划的取消让人失望。"
          }
        ]
      },
      {
        emotion: "Understanding",
        emotion_cn: "理解",
        intensity: 65,
        causes: [
          {
            cause: "现实考虑",
            description: "对现实情况的理解和接受。"
          }
        ]
      }
    ]
  }
  // ... 继续添加更多天的数据
];

// 从emotion_database.json中选择的情绪类型
const emotionDatabase = [
  { emotion: "Happiness", emotion_cn: "快乐" },
  { emotion: "Satisfaction", emotion_cn: "满足" },
  { emotion: "Joy", emotion_cn: "喜悦" },
  { emotion: "Loss", emotion_cn: "失落" },
  { emotion: "Loneliness", emotion_cn: "孤独" },
  { emotion: "Depression", emotion_cn: "抑郁" },
  { emotion: "Anxiety", emotion_cn: "焦虑" },
  { emotion: "Fear", emotion_cn: "恐惧" },
  { emotion: "Anger", emotion_cn: "愤怒" },
  { emotion: "Excitement", emotion_cn: "兴奋" },
  { emotion: "Hope", emotion_cn: "希望" },
  { emotion: "Disappointment", emotion_cn: "失望" },
  { emotion: "Confidence", emotion_cn: "自信" },
  { emotion: "Doubt", emotion_cn: "怀疑" },
  { emotion: "Pride", emotion_cn: "自豪" },
  { emotion: "Guilt", emotion_cn: "内疚" },
  { emotion: "Gratitude", emotion_cn: "感激" },
  { emotion: "Confusion", emotion_cn: "困惑" },
  { emotion: "Relief", emotion_cn: "宽慰" },
  { emotion: "Curiosity", emotion_cn: "好奇" },
  { emotion: "Embarrassment", emotion_cn: "尴尬" },
  { emotion: "Jealousy", emotion_cn: "嫉妒" },
  { emotion: "Comfort", emotion_cn: "舒适" },
  { emotion: "Worry", emotion_cn: "担忧" },
  { emotion: "Tranquility", emotion_cn: "宁静" },
  { emotion: "Dejection", emotion_cn: "沮丧" },
  { emotion: "Belongingness", emotion_cn: "归属感" },
  { emotion: "Melancholy", emotion_cn: "惆怅" },
  { emotion: "Understanding", emotion_cn: "理解" },
  { emotion: "Sense of Achievement", emotion_cn: "成就感" }
];

const emotionCauses = [
  "工作压力", "人际关系", "健康状况", "家庭事务", "学习成长",
  "财务状况", "天气变化", "新闻事件", "运动锻炼", "娱乐活动",
  "睡眠质量", "饮食习惯", "社交活动", "个人目标", "时间管理",
  "技术挑战", "团队合作", "创意灵感", "生活节奏", "情感支持",
  "环境变化", "突发事件", "回忆往事", "未来规划", "自我反思"
];

const summaryTemplates = [
  "工作中遇到了{cause}，让人感到{emotion}",
  "今天的{cause}带来了{emotion}的感受",
  "因为{cause}的影响，产生了{emotion}的情绪",
  "在处理{cause}时，体验到了{emotion}",
  "受到{cause}的启发，感受到{emotion}",
  "面对{cause}的挑战，产生了{emotion}的心情",
  "通过{cause}的体验，获得了{emotion}的感觉",
  "在{cause}的过程中，深深感受到{emotion}"
];

// 生成完整历史数据的辅助函数 (3月 + 4月 + 5月 + 6月 + 7月 + 8月)
export function generateMonthlyData(): EmotionSummaryData[] {
  const allData: ExtendedEmotionSummaryData[] = [...monthlyEmotionData];
  let threadId = 10; // 从已有数据的thread_009继续
  
  // 生成3月的数据 (从第1天到第31天)
  for (let day = 1; day <= 31; day++) {
    const conversationsPerDay = Math.floor(Math.random() * 3) + 1; // 1-3次对话
    
    for (let conv = 0; conv < conversationsPerDay; conv++) {
      const hour = Math.floor(Math.random() * 16) + 7; // 7-22点之间
      const minute = Math.floor(Math.random() * 60);
      const second = Math.floor(Math.random() * 60);
      
      const emotionCount = Math.floor(Math.random() * 3) + 1; // 1-3种情绪
      const selectedEmotions: ExtendedEmotionInfo[] = [];
      const usedEmotions = new Set();
      
      for (let i = 0; i < emotionCount; i++) {
        let emotionIndex;
        let selectedEmotion;
        do {
          emotionIndex = Math.floor(Math.random() * emotionDatabase.length);
          selectedEmotion = emotionDatabase[emotionIndex];
        } while (usedEmotions.has(selectedEmotion.emotion) && usedEmotions.size < emotionDatabase.length);
        
        usedEmotions.add(selectedEmotion.emotion);
        
        const intensity = Math.floor(Math.random() * 70) + 30; // 30-100强度
        const causeIndex = Math.floor(Math.random() * emotionCauses.length);
        const cause = emotionCauses[causeIndex];
        
        selectedEmotions.push({
          emotion: selectedEmotion.emotion,
          emotion_cn: selectedEmotion.emotion_cn,
          intensity,
          causes: [
            {
              cause: cause,
              description: `${cause}对${selectedEmotion.emotion_cn}情绪产生的影响。`
            }
          ]
        });
      }
      
      const templateIndex = Math.floor(Math.random() * summaryTemplates.length);
      const template = summaryTemplates[templateIndex];
      const primaryEmotion = selectedEmotions[0];
      const primaryCause = primaryEmotion.causes?.[0]?.cause || "日常生活";
      
      const summary = template
        .replace('{cause}', primaryCause)
        .replace('{emotion}', primaryEmotion.emotion_cn || primaryEmotion.emotion);
      
      threadId++;
      allData.push({
        timestamp: `2025-03-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`,
        thread_id: `thread_${threadId.toString().padStart(3, '0')}`,
        summary: summary,
        detected_emotions: selectedEmotions
      });
    }
  }
  
  // 生成4月的数据 (从第1天到第30天)
  for (let day = 1; day <= 30; day++) {
    const conversationsPerDay = Math.floor(Math.random() * 3) + 1; // 1-3次对话
    
    for (let conv = 0; conv < conversationsPerDay; conv++) {
      const hour = Math.floor(Math.random() * 16) + 7; // 7-22点之间
      const minute = Math.floor(Math.random() * 60);
      const second = Math.floor(Math.random() * 60);
      
      const emotionCount = Math.floor(Math.random() * 3) + 1; // 1-3种情绪
      const selectedEmotions: ExtendedEmotionInfo[] = [];
      const usedEmotions = new Set();
      
      for (let i = 0; i < emotionCount; i++) {
        let emotionIndex;
        let selectedEmotion;
        do {
          emotionIndex = Math.floor(Math.random() * emotionDatabase.length);
          selectedEmotion = emotionDatabase[emotionIndex];
        } while (usedEmotions.has(selectedEmotion.emotion) && usedEmotions.size < emotionDatabase.length);
        
        usedEmotions.add(selectedEmotion.emotion);
        
        const intensity = Math.floor(Math.random() * 70) + 30; // 30-100强度
        const causeIndex = Math.floor(Math.random() * emotionCauses.length);
        const cause = emotionCauses[causeIndex];
        
        selectedEmotions.push({
          emotion: selectedEmotion.emotion,
          emotion_cn: selectedEmotion.emotion_cn,
          intensity,
          causes: [
            {
              cause: cause,
              description: `${cause}对${selectedEmotion.emotion_cn}情绪产生的影响。`
            }
          ]
        });
      }
      
      const templateIndex = Math.floor(Math.random() * summaryTemplates.length);
      const template = summaryTemplates[templateIndex];
      const primaryEmotion = selectedEmotions[0];
      const primaryCause = primaryEmotion.causes?.[0]?.cause || "日常生活";
      
      const summary = template
        .replace('{cause}', primaryCause)
        .replace('{emotion}', primaryEmotion.emotion_cn || primaryEmotion.emotion);
      
      threadId++;
      allData.push({
        timestamp: `2025-04-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`,
        thread_id: `thread_${threadId.toString().padStart(3, '0')}`,
        summary: summary,
        detected_emotions: selectedEmotions
      });
    }
  }
  
  // 生成5月的数据 (从第1天到第31天)
  for (let day = 1; day <= 31; day++) {
    const conversationsPerDay = Math.floor(Math.random() * 3) + 1; // 1-3次对话
    
    for (let conv = 0; conv < conversationsPerDay; conv++) {
      const hour = Math.floor(Math.random() * 16) + 7; // 7-22点之间
      const minute = Math.floor(Math.random() * 60);
      const second = Math.floor(Math.random() * 60);
      
      const emotionCount = Math.floor(Math.random() * 3) + 1; // 1-3种情绪
      const selectedEmotions: ExtendedEmotionInfo[] = [];
      const usedEmotions = new Set();
      
      for (let i = 0; i < emotionCount; i++) {
        let emotionIndex;
        let selectedEmotion;
        do {
          emotionIndex = Math.floor(Math.random() * emotionDatabase.length);
          selectedEmotion = emotionDatabase[emotionIndex];
        } while (usedEmotions.has(selectedEmotion.emotion) && usedEmotions.size < emotionDatabase.length);
        
        usedEmotions.add(selectedEmotion.emotion);
        
        const intensity = Math.floor(Math.random() * 70) + 30; // 30-100强度
        const causeIndex = Math.floor(Math.random() * emotionCauses.length);
        const cause = emotionCauses[causeIndex];
        
        selectedEmotions.push({
          emotion: selectedEmotion.emotion,
          emotion_cn: selectedEmotion.emotion_cn,
          intensity,
          causes: [
            {
              cause: cause,
              description: `${cause}对${selectedEmotion.emotion_cn}情绪产生的影响。`
            }
          ]
        });
      }
      
      const templateIndex = Math.floor(Math.random() * summaryTemplates.length);
      const template = summaryTemplates[templateIndex];
      const primaryEmotion = selectedEmotions[0];
      const primaryCause = primaryEmotion.causes?.[0]?.cause || "日常生活";
      
      const summary = template
        .replace('{cause}', primaryCause)
        .replace('{emotion}', primaryEmotion.emotion_cn || primaryEmotion.emotion);
      
      threadId++;
      allData.push({
        timestamp: `2025-05-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`,
        thread_id: `thread_${threadId.toString().padStart(3, '0')}`,
        summary: summary,
        detected_emotions: selectedEmotions
      });
    }
  }
  
  // 生成6月剩余的天数数据 (从第6天到第30天)
  for (let day = 6; day <= 30; day++) {
    const conversationsPerDay = Math.floor(Math.random() * 3) + 1; // 1-3次对话
    
    for (let conv = 0; conv < conversationsPerDay; conv++) {
      const hour = Math.floor(Math.random() * 16) + 7; // 7-22点之间
      const minute = Math.floor(Math.random() * 60);
      const second = Math.floor(Math.random() * 60);
      
      const emotionCount = Math.floor(Math.random() * 3) + 1; // 1-3种情绪
      const selectedEmotions: ExtendedEmotionInfo[] = [];
      const usedEmotions = new Set();
      
      for (let i = 0; i < emotionCount; i++) {
        let emotionIndex;
        let selectedEmotion;
        do {
          emotionIndex = Math.floor(Math.random() * emotionDatabase.length);
          selectedEmotion = emotionDatabase[emotionIndex];
        } while (usedEmotions.has(selectedEmotion.emotion) && usedEmotions.size < emotionDatabase.length);
        
        usedEmotions.add(selectedEmotion.emotion);
        
        const intensity = Math.floor(Math.random() * 70) + 30; // 30-100强度
        const causeIndex = Math.floor(Math.random() * emotionCauses.length);
        const cause = emotionCauses[causeIndex];
        
        selectedEmotions.push({
          emotion: selectedEmotion.emotion,
          emotion_cn: selectedEmotion.emotion_cn,
          intensity,
          causes: [
            {
              cause: cause,
              description: `${cause}对${selectedEmotion.emotion_cn}情绪产生的影响。`
            }
          ]
        });
      }
      
      const templateIndex = Math.floor(Math.random() * summaryTemplates.length);
      const template = summaryTemplates[templateIndex];
      const primaryEmotion = selectedEmotions[0];
      const primaryCause = primaryEmotion.causes?.[0]?.cause || "日常生活";
      
      const summary = template
        .replace('{cause}', primaryCause)
        .replace('{emotion}', primaryEmotion.emotion_cn || primaryEmotion.emotion);
      
      threadId++;
      allData.push({
        timestamp: `2025-06-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`,
        thread_id: `thread_${threadId.toString().padStart(3, '0')}`,
        summary: summary,
        detected_emotions: selectedEmotions
      });
    }
  }
  
  // 生成7月的数据 (从第1天到第31天)
  for (let day = 1; day <= 31; day++) {
    const conversationsPerDay = Math.floor(Math.random() * 3) + 1; // 1-3次对话
    
    for (let conv = 0; conv < conversationsPerDay; conv++) {
      const hour = Math.floor(Math.random() * 16) + 7; // 7-22点之间
      const minute = Math.floor(Math.random() * 60);
      const second = Math.floor(Math.random() * 60);
      
      const emotionCount = Math.floor(Math.random() * 3) + 1; // 1-3种情绪
      const selectedEmotions: ExtendedEmotionInfo[] = [];
      const usedEmotions = new Set();
      
      for (let i = 0; i < emotionCount; i++) {
        let emotionIndex;
        let selectedEmotion;
        do {
          emotionIndex = Math.floor(Math.random() * emotionDatabase.length);
          selectedEmotion = emotionDatabase[emotionIndex];
        } while (usedEmotions.has(selectedEmotion.emotion) && usedEmotions.size < emotionDatabase.length);
        
        usedEmotions.add(selectedEmotion.emotion);
        
        const intensity = Math.floor(Math.random() * 70) + 30; // 30-100强度
        const causeIndex = Math.floor(Math.random() * emotionCauses.length);
        const cause = emotionCauses[causeIndex];
        
        selectedEmotions.push({
          emotion: selectedEmotion.emotion,
          emotion_cn: selectedEmotion.emotion_cn,
          intensity,
          causes: [
            {
              cause: cause,
              description: `${cause}对${selectedEmotion.emotion_cn}情绪产生的影响。`
            }
          ]
        });
      }
      
      const templateIndex = Math.floor(Math.random() * summaryTemplates.length);
      const template = summaryTemplates[templateIndex];
      const primaryEmotion = selectedEmotions[0];
      const primaryCause = primaryEmotion.causes?.[0]?.cause || "日常生活";
      
      const summary = template
        .replace('{cause}', primaryCause)
        .replace('{emotion}', primaryEmotion.emotion_cn || primaryEmotion.emotion);
      
      threadId++;
      allData.push({
        timestamp: `2025-07-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`,
        thread_id: `thread_${threadId.toString().padStart(3, '0')}`,
        summary: summary,
        detected_emotions: selectedEmotions
      });
    }
  }
  
  // 生成8月的数据 (从第1天到第31天)
  for (let day = 1; day <= 31; day++) {
    const conversationsPerDay = Math.floor(Math.random() * 3) + 1; // 1-3次对话
    
    for (let conv = 0; conv < conversationsPerDay; conv++) {
      const hour = Math.floor(Math.random() * 16) + 7; // 7-22点之间
      const minute = Math.floor(Math.random() * 60);
      const second = Math.floor(Math.random() * 60);
      
      const emotionCount = Math.floor(Math.random() * 3) + 1; // 1-3种情绪
      const selectedEmotions: ExtendedEmotionInfo[] = [];
      const usedEmotions = new Set();
      
      for (let i = 0; i < emotionCount; i++) {
        let emotionIndex;
        let selectedEmotion;
        do {
          emotionIndex = Math.floor(Math.random() * emotionDatabase.length);
          selectedEmotion = emotionDatabase[emotionIndex];
        } while (usedEmotions.has(selectedEmotion.emotion) && usedEmotions.size < emotionDatabase.length);
        
        usedEmotions.add(selectedEmotion.emotion);
        
        const intensity = Math.floor(Math.random() * 70) + 30; // 30-100强度
        const causeIndex = Math.floor(Math.random() * emotionCauses.length);
        const cause = emotionCauses[causeIndex];
        
        selectedEmotions.push({
          emotion: selectedEmotion.emotion,
          emotion_cn: selectedEmotion.emotion_cn,
          intensity,
          causes: [
            {
              cause: cause,
              description: `${cause}对${selectedEmotion.emotion_cn}情绪产生的影响。`
            }
          ]
        });
      }
      
      const templateIndex = Math.floor(Math.random() * summaryTemplates.length);
      const template = summaryTemplates[templateIndex];
      const primaryEmotion = selectedEmotions[0];
      const primaryCause = primaryEmotion.causes?.[0]?.cause || "日常生活";
      
      const summary = template
        .replace('{cause}', primaryCause)
        .replace('{emotion}', primaryEmotion.emotion_cn || primaryEmotion.emotion);
      
      threadId++;
      allData.push({
        timestamp: `2025-08-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`,
        thread_id: `thread_${threadId.toString().padStart(3, '0')}`,
        summary: summary,
        detected_emotions: selectedEmotions
      });
    }
  }
  
  // 按时间排序并转换为EmotionSummaryData类型
  return allData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) as EmotionSummaryData[];
} 