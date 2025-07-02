// 情绪分析页面专用类型定义

import { EmotionInfo } from './history';

// 基础情绪类型 (来源于emotion_database.json)
export type EmotionType = 
  | 'happiness' | 'satisfaction' | 'joy' | 'hope' | 'excitement' | 'confidence'  // 积极情绪
  | 'sadness' | 'anxiety' | 'anger' | 'fear' | 'confusion' | 'guilt'           // 消极情绪
  | 'neutral';                                                                  // 中性情绪

// 情绪分类
export type EmotionCategory = 'active' | 'passive' | 'neutral';

// 情绪强度等级
export type EmotionIntensity = 'low' | 'medium' | 'high';

// 时间范围类型
export type TimeRange = 'week' | 'month' | 'quarter' | 'year';

// 分析视图类型
export type AnalysisView = 'summary' | 'records';

// 情绪聚合数据结构
export interface EmotionAggregation {
  emotion: EmotionType;
  emotion_cn: string;
  category: EmotionCategory;
  count: number;
  totalIntensity: number;
  averageIntensity: number;
  percentage: number;
  lastOccurrence: Date;
  trend: 'rising' | 'falling' | 'stable';
}

// 情绪时间序列数据点
export interface EmotionTimePoint {
  date: string;           // YYYY-MM-DD格式
  emotions: EmotionInfo[];
  dominantEmotion: EmotionType;
  averageIntensity: number;
  activeEmotionRatio: number;  // 主动情绪占比
  passiveEmotionRatio: number; // 被动情绪占比
  recordCount: number;    // 当日记录数
}

// 情绪趋势分析数据
export interface EmotionTrend {
  timePoints: EmotionTimePoint[];
  overallTrend: 'improving' | 'declining' | 'stable';
  moodStability: number;      // 情绪稳定性指数 (0-1)
  positivityRatio: number;    // 积极情绪占比 (0-1)
  weeklyComparison: number;   // 相比上周的变化值
  insights: EmotionInsight[];
}

// 情绪洞察
export interface EmotionInsight {
  type: 'positive' | 'negative' | 'neutral';
  message: string;
  severity: 'low' | 'medium' | 'high';
  suggestions?: string[];
}

// 日历热图数据点
export interface CalendarEmotionData {
  date: string;           // YYYY-MM-DD格式
  emotions: {
    emotion: EmotionType;
    intensity: number;
    color: string;
  }[];
  dominantEmotion: EmotionType;
  recordCount: number;
  summary?: string;
}

// 情绪知识图谱节点
export interface EmotionGraphNode {
  id: string;
  type: 'emotion' | 'cause' | 'trigger';
  label: string;
  emotion?: EmotionType;
  weight: number;         // 节点权重
  color: string;
  // 扩展属性用于D3.js布局
  x?: number;            // 节点X坐标
  y?: number;            // 节点Y坐标
  fx?: number | null;     // 固定X坐标（拖拽时使用）
  fy?: number | null;     // 固定Y坐标（拖拽时使用）
  vx?: number;           // X方向速度
  vy?: number;           // Y方向速度
  size: number;          // 节点大小
  intensity?: number;    // 情绪强度（仅情绪节点）
  description?: string;  // 节点描述
  relatedCauses?: string[];  // 相关原因列表（仅情绪节点）
  affectedEmotions?: string[]; // 影响的情绪列表（仅原因节点）
}

// 情绪知识图谱边
export interface EmotionGraphEdge {
  source: string | EmotionGraphNode;
  target: string | EmotionGraphNode;
  relationship: 'causes' | 'triggers' | 'correlates';
  weight: number;         // 关系强度
  // 扩展属性用于可视化
  color: string;         // 边的颜色
  width: number;         // 边的宽度
  label?: string;        // 边的标签
  description?: string;  // 关系描述
}

// 情绪知识图谱
export interface EmotionKnowledgeGraph {
  nodes: EmotionGraphNode[];
  edges: EmotionGraphEdge[];
  statistics: {
    totalNodes: number;
    totalEdges: number;
    dominantCauses: string[];
    // 扩展统计信息
    emotionNodeCount: number;     // 情绪节点数量
    causeNodeCount: number;       // 原因节点数量
    avgConnections: number;       // 平均连接数
    maxWeight: number;           // 最大权重
    strongestConnections: Array<{ source: string; target: string; weight: number }>; // 最强连接
    clusters: Array<{ nodes: string[]; centralEmotion: string }>; // 情绪聚类
  };
  // 图谱配置
  config?: {
    width: number;
    height: number;
    nodeRadius: { min: number; max: number };
    linkDistance: number;
    linkStrength: number;
    chargeStrength: number;
    colors: {
      emotionNode: string;
      causeNode: string;
      selectedNode: string;
      link: string;
      selectedLink: string;
    };
  };
}

// Summary数据结构 (OSS中的_summary文件)
export interface EmotionSummaryData {
  timestamp: string;
  thread_id?: string;
  summary?: string;
  detected_emotions: EmotionInfo[];
  knowledge_graph?: any;
  metadata?: {
    model_version?: string;
    analysis_version?: string;
    processing_time?: number;
  };
}

// 情绪分析聚合结果
export interface EmotionAnalysisResult {
  timeRange: TimeRange;
  dateRange: [Date, Date];
  aggregations: EmotionAggregation[];
  trends: EmotionTrend;
  calendar: CalendarEmotionData[];
  knowledgeGraph: EmotionKnowledgeGraph;
  statistics: EmotionStatistics;
  suggestions: string[];
}

// 情绪统计信息
export interface EmotionStatistics {
  totalRecords: number;
  totalEmotions: number;
  dominantEmotion: EmotionType;
  averageIntensity: number;
  moodStability: number;
  positivityRatio: number;
  emotionDiversity: number;    // 情绪多样性指数
  recentTrend: 'improving' | 'declining' | 'stable';
  weeklyChange: number;
}

// 情绪色彩映射配置
export type EmotionColorConfig = {
  [key in EmotionType]: {
    primary: string;
    secondary: string;
    opacity: {
      high: number;
      medium: number;
      low: number;
    };
  };
};

// 响应式配置
export interface ResponsiveConfig {
  mobile: {
    tabPosition: 'top' | 'bottom';
    showAllCharts: boolean;
    calendarSize: 'small' | 'medium' | 'large';
    chartContainerCols: { span: number };
  };
  tablet: {
    tabPosition: 'top' | 'bottom';
    showAllCharts: boolean;
    calendarSize: 'small' | 'medium' | 'large';
    chartContainerCols: { span: number };
  };
  desktop: {
    tabPosition: 'top' | 'bottom';
    showAllCharts: boolean;
    calendarSize: 'small' | 'medium' | 'large';
    chartContainerCols: { span: number };
  };
}

// 情绪分析查询参数
export interface EmotionAnalysisParams {
  timeRange: TimeRange;
  startDate?: Date;
  endDate?: Date;
  emotionTypes?: EmotionType[];
  minIntensity?: number;
  includeKnowledgeGraph?: boolean;
  aggregationLevel?: 'daily' | 'weekly' | 'monthly';
}

// 情绪分析Store状态
export interface EmotionAnalysisState {
  summaryData: EmotionSummaryData[];
  analysisResult: EmotionAnalysisResult | null;
  currentTimeRange: TimeRange;
  customDateRange: [Date, Date] | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  cacheKey: string | null;
}

// 情绪分析Store动作
export interface EmotionAnalysisActions {
  loadSummaryData: (params?: EmotionAnalysisParams) => Promise<void>;
  setTimeRange: (range: TimeRange) => void;
  setCustomDateRange: (range: [Date, Date] | null) => void;
  refreshData: () => Promise<void>;
  clearCache: () => void;
  exportData: (format: 'json' | 'csv' | 'excel') => Promise<void>;
}

// 算法配置
export interface AlgorithmConfig {
  // 时间窗口设置
  timeWindow: {
    slidingWindowSize: number;    // 滑动窗口大小 (天)
    decayFactor: number;          // 指数衰减因子
    aggregationInterval: number;  // 聚合间隔 (小时)
  };
  
  // 趋势分析设置
  trendAnalysis: {
    smoothingFactor: number;      // 指数平滑因子
    movingAverageWindow: number;  // 移动平均窗口
    trendThreshold: number;       // 趋势变化阈值
  };
  
  // 异常检测设置
  anomalyDetection: {
    zscore_threshold: number;     // Z-score阈值
    outlierFactor: number;        // 异常值因子
  };
  
  // 性能优化设置
  performance: {
    batchSize: number;            // 批处理大小
    maxCacheSize: number;         // 最大缓存项数
    cacheTTL: number;             // 缓存生存时间 (秒)
  };
} 