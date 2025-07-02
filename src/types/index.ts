// 用户类型
export interface User {
  id: string;
  name: string;
  avatar?: string;
  isOnline?: boolean;
}

// 情绪数据类型
export interface EmotionData {
  primary: string; // 主要情绪
  score: number; // 情绪强度 0-1
  confidence: number; // 置信度 0-1
  secondary?: string[]; // 次要情绪
}

// 消息类型
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date | string; // 支持Date对象和字符串（为了兼容序列化）
  emotionData?: EmotionData;
  status?: 'sending' | 'sent' | 'error';
}

// 聊天会话类型
export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

// 历史记录类型
export interface ChatHistory {
  id: string;
  title: string;
  messages: Message[];
  messageCount: number;
  lastMessage?: Message;
  createdAt: Date;
  updatedAt: Date;
  emotionSummary?: {
    dominant: string;
    averageScore: number;
    distribution: Record<string, number>;
  };
  // 云端历史记录元数据（用于云端数据）
  cloudMetadata?: import('./history').HistoryMetadata;
}

// 历史记录筛选条件
export interface HistoryFilter {
  dateRange?: [Date, Date];
  emotion?: string;
  keyword?: string;
  sortBy?: 'date' | 'emotion' | 'messageCount';
  sortOrder?: 'asc' | 'desc';
}

// 情绪统计数据
export interface EmotionStats {
  totalSessions: number;
  averageScore: number;
  dominantEmotion: string;
  emotionDistribution: Record<string, number>;
  trends: {
    date: string;
    emotion: string;
    score: number;
  }[];
}

// 聊天状态类型
export interface ChatState {
  currentSession: ChatSession | null;
  sessions: ChatSession[];
  isTyping: boolean;
  isLoading: boolean;
}

// 主题类型
export type Theme = 'light' | 'dark';

// 界面状态类型
export interface UIState {
  theme: Theme;
  sidebarVisible: boolean;
  currentPage: 'chat' | 'history' | 'emotion-analysis';
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 情绪分析响应类型
export interface EmotionAnalysisResponse {
  emotions: EmotionData;
  suggestions: string[];
  trends?: {
    date: string;
    emotion: string;
    score: number;
  }[];
}

// === 可视化相关类型定义 ===

// 情绪趋势数据
export interface EmotionTrendData {
  date: string;
  emotion: string;
  score: number;
  timestamp: Date;
}

// 情绪分布数据
export interface EmotionDistributionData {
  emotion: string;
  count: number;
  percentage: number;
}

// 情绪配置
export interface EmotionConfig {
  name: string;
  color: string;
  icon: string;
}

// 情绪洞察数据
export interface EmotionInsights {
  moodStability: number; // 情绪稳定性 0-1
  positivityRatio: number; // 积极情绪占比 0-1
  recentTrend: 'improving' | 'declining' | 'stable'; // 最近趋势
  weeklyComparison: number; // 周对比变化
}

// 情绪报告数据
export interface EmotionReportData {
  trends: EmotionTrendData[];
  distribution: Record<string, number>;
  totalSessions: number;
  averageScore: number;
  dominantEmotion: string;
  suggestions: string[];
  insights: EmotionInsights;
}

// 时间范围类型
export type TimeRange = 'week' | 'month' | 'quarter' | 'year';

// 图表组件通用接口
export interface ChartProps {
  height?: number;
  title?: string;
  showControls?: boolean;
}

// 情绪趋势图表属性
export interface EmotionChartProps extends ChartProps {
  data: EmotionTrendData[];
  timeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
}

// 情绪分布图表属性
export interface EmotionDistributionProps extends ChartProps {
  data: Record<string, number>;
  showStats?: boolean;
}

// 情绪报告组件属性
export interface EmotionReportProps {
  data: EmotionReportData;
  timeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
}

// 数据导出类型
export interface ExportData {
  format: 'json' | 'csv' | 'pdf';
  dateRange?: [Date, Date];
  includeCharts?: boolean;
  includeRawData?: boolean;
}

// 可视化主题配置
export interface VisualizationTheme {
  primary: string;
  success: string;
  warning: string;
  error: string;
  neutral: string;
  gradient: {
    start: string;
    end: string;
  };
} 