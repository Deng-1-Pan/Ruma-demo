// 历史记录元数据接口
export interface HistoryMetadata {
  key: string;                    // OSS key或本地文件路径
  type: 'chat' | 'report';       // 历史记录类型
  timestamp: string;              // 格式化时间戳 (YYYY-MM-DD HH:mm:ss)
  filename: string;               // 文件名
  thread_id?: string;             // 会话ID (如果有)
  size: number;                   // 文件大小 (字节)
  last_modified: number;          // 最后修改时间 (Unix时间戳)
  is_local: boolean;              // 是否为本地文件
}

// 聊天历史记录内容接口
export interface ChatHistoryData {
  messages: Array<{
    role: string;
    content: string;
    created_at?: string;
    timestamp?: string;
  }>;
  timestamp: string;              // 创建时间
  report_generated?: boolean;     // 是否已生成报告
  report_fully_generated?: boolean; // 报告是否完全生成
  summary_data?: any;             // 摘要数据 (如果有)
}

// 情绪报告数据接口
export interface EmotionReportData {
  emotions?: EmotionInfo[];        // 情绪信息数组
  detected_emotions?: EmotionInfo[]; // 检测到的情绪 (兼容旧格式)
  timestamp: string;               // 创建时间
  summary?: string;                // 情绪分析总结
  knowledge_graph?: any;           // 知识图谱数据
}

// 情绪信息接口
export interface EmotionInfo {
  emotion: string;                 // 情绪英文名
  emotion_cn?: string;             // 情绪中文名
  intensity: number;               // 情绪强度 (0-100)
  timestamp?: Date | string;       // 情绪检测时间戳
  report_key?: string;             // 来源报告的key
  report_time?: Date | string;     // 报告时间
}

// 历史记录响应接口
export interface HistoryResponse {
  success: boolean;
  data: HistoryMetadata[];
  warning?: string;                // 警告信息 (如切换到本地存储)
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// 历史记录详情响应接口
export interface HistoryDetailResponse {
  success: boolean;
  data: ChatHistoryData | EmotionReportData | null;
  error?: string;
}

// 批量历史记录响应接口
export interface HistoryBatchResponse {
  success: boolean;
  data: { [key: string]: ChatHistoryData | EmotionReportData };
  loadedCount: number;
  requestedCount: number;
}

// 情绪时间轴数据接口
export interface EmotionTimelineData {
  detected_emotions: EmotionInfo[];
}

// 情绪时间轴响应接口
export interface EmotionTimelineResponse {
  success: boolean;
  data: EmotionTimelineData | null;
  message?: string;
  statistics?: {
    totalEmotions: number;
    averageIntensity: number;
    dominantEmotion: string;
    emotionDistribution: Record<string, number>;
    reportCount: number;
  };
}

// 历史记录统计响应接口
export interface HistoryStatsResponse {
  success: boolean;
  data: {
    totalRecords: number;
    chatRecords: number;
    reportRecords: number;
    totalSizeBytes: number;
    totalSizeMB: number;
    latestActivity: string | null;
    recordsByDate: Record<string, number>;
    isCloudConnected: boolean;
  };
  warning?: string;
}

// 历史记录查询参数接口
export interface HistoryQueryParams {
  page?: number;
  limit?: number;
  type?: 'chat' | 'report' | 'all';
  startDate?: string;
  endDate?: string;
  threadId?: string;
}

// 历史记录加载选项接口
export interface HistoryLoadOptions {
  maxItems?: number;
  includeContent?: boolean;
  sortBy?: 'timestamp' | 'size' | 'type';
  sortOrder?: 'asc' | 'desc';
}

// 历史记录状态接口
export interface HistoryState {
  metadata: HistoryMetadata[];
  loadedItems: { [key: string]: ChatHistoryData | EmotionReportData };
  isLoading: boolean;
  error: string | null;
  warning: string | null;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  stats?: HistoryStatsResponse['data'];
  timelineData?: EmotionTimelineData;
}

// 历史记录过滤器接口 (扩展自现有的)
export interface HistoryFilter {
  sortBy: 'date' | 'emotion' | 'messageCount';
  sortOrder: 'asc' | 'desc';
  dateRange?: [Date, Date];
  emotion?: string;
  keyword?: string;
  type?: 'chat' | 'report' | 'all';
} 