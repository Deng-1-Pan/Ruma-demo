import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { generateCacheKey, emotionAnalysisCache, emotionAggregationCache, MemoryCache } from '../utils/performanceUtils';
import {
  EmotionAnalysisState,
  EmotionAnalysisActions,
  EmotionAnalysisParams,
  EmotionSummaryData,
  EmotionAnalysisResult,
  TimeRange,
  EmotionAggregation,
  EmotionTrend,
  CalendarEmotionData,
  EmotionKnowledgeGraph,
  EmotionGraphNode,
  EmotionGraphEdge,
  EmotionStatistics,
  EmotionType,
  EmotionCategory,
  AlgorithmConfig
} from '../types/emotion';
import { EmotionInfo } from '../types/history';
import historyService from '../services/historyService';

// 创建专用的summary数据缓存
const summaryDataCache = new MemoryCache<EmotionSummaryData[]>();

// OSS情绪数据接口 (扩展EmotionInfo以支持原因信息)
interface OSSEmotionInfo extends EmotionInfo {
  emotion_cn?: string;
  causes?: Array<{
    cause: string;
    description?: string;
  }>;
}

// 算法配置常量 (基于创意设计)
const ALGORITHM_CONFIG: AlgorithmConfig = {
  timeWindow: {
    slidingWindowSize: 7,     // 7天滑动窗口
    decayFactor: 0.1,         // 指数衰减因子
    aggregationInterval: 24   // 24小时聚合间隔
  },
  trendAnalysis: {
    smoothingFactor: 0.3,     // 指数平滑因子
    movingAverageWindow: 7,   // 7天移动平均
    trendThreshold: 0.1       // 10%变化阈值
  },
  anomalyDetection: {
    zscore_threshold: 2.0,    // Z-score阈值
    outlierFactor: 1.5        // 异常值因子
  },
  performance: {
    batchSize: 100,           // 🚀 性能优化：50 → 100，减少网络请求次数
    maxCacheSize: 2000,       // 🚀 性能优化：1000 → 2000，增加缓存容量
    cacheTTL: 1800            // 🚀 性能优化：300s → 1800s (30分钟)，减少重复计算
  }
};

// 🎨 完整的情绪配置系统 (基于emotion_database_cn.json的174种情绪)
// 情绪中英文映射 - 完整覆盖174种情绪
const EMOTION_CHINESE_MAP: Record<string, string> = {
  // 基于emotion_database.json和emotion_database_cn.json的完整映射
  'Happiness': '快乐',
  'Satisfaction': '满足',
  'Joy': '喜悦',
  'Loss': '失落',
  'Loneliness': '孤独',
  'Depression': '抑郁',
  'Despair': '绝望',
  'Irritability': '易怒',
  'Indignation': '愤慨',
  'Excitement': '兴奋',
  'Anger': '愤怒',
  'Anxiety': '焦虑',
  'Fear': '恐惧',
  'Panic': '惊慌',
  'Sense of Fear': '恐惧感',
  'Shock': '震惊',
  'Confusion': '困惑',
  'Unexpected': '意外',
  'Amazement': '惊奇',
  'Dislike': '厌恶',
  'Aversion': '反感',
  'Dissatisfaction': '不满',
  'Annoyance': '烦恼',
  'Sense of Security': '安全感',
  'Dependence': '依赖',
  'Loyalty': '忠诚',
  'Peace of Mind': '安心',
  'Hope': '希望',
  'Desire': '渴望',
  'Expectation': '期待',
  'Guilt': '内疚',
  'Embarrassment': '尴尬',
  'Regret': '后悔',
  'Shamefulness': '羞耻',
  'Sense of Achievement': '成就感',
  'Pride': '自豪',
  'Confidence': '自信',
  'Tension': '紧张',
  'Unease': '不安',
  'Worry': '担忧',
  'Trouble': '烦恼',
  'Helplessness': '无助',
  'Loss of Interest': '失去兴趣',
  'Dejection': '沮丧',
  'Tranquility': '宁静',
  'Relaxation': '放松',
  'Serenity': '安详',
  'Comfort': '舒适',
  'Bewilderment': '迷惑',
  'Doubt': '怀疑',
  'Tiredness': '疲倦',
  'Exhaustion': '精疲力竭',
  'Weakness': '虚弱',
  'Isolation': '孤立',
  'Separation': '分离',
  'Neglect': '忽视',
  'Yearning': '渴望',
  'Pursuit': '追求',
  'Aspiration': '抱负',
  'Loss of Control': '失控',
  'Stability': '稳定',
  'Relief': '宽慰',
  'Thanks': '感谢',
  'Appreciation': '感激',
  'Contentment': '满足',
  'Displeased': '不悦',
  'Uncertainty': '不确定',
  'Pain': '痛苦',
  'Interest': '感兴趣',
  'Disappointment': '失望',
  'Gratification': '欣慰',
  'Glee': '欢乐',
  'Playfulness': '玩乐',
  'Grief': '哀伤',
  'Lament': '惋惜',
  'Melancholy': '惆怅',
  'Humiliation': '侮辱感',
  'Hostility': '敌意',
  'Jealousy': '嫉妒',
  'Hatred': '仇恨',
  'Irritation': '恼怒',
  'Startle': '惊吓',
  'Phobia': '恐惧症',
  'Rejection': '排斥',
  'Contempt': '轻蔑',
  'Moral disgust': '道德反感',
  'Nausea': '生理厌恶',
  'Self-disgust': '自我厌恶',
  'Guilt-like Shame': '羞愧',
  'Exposure': '暴露感',
  'Remorse': '惭愧',
  'Self-blame': '自责',
  'Contrition': '忏悔',
  'Moral Wrongness': '犯错感',
  'Self-respect': '自尊',
  'Glory': '荣耀',
  'Admiration': '崇敬',
  'Thankfulness': '报答',
  'Feeling remembered': '被记得',
  'Cared for': '被在意',
  'Possessiveness': '占有欲',
  'Injustice': '不公感',
  'Threat': '威胁感',
  'Assurance': '放心',
  'Dependability': '信赖',
  'Understanding': '理解',
  'Acceptance': '包容',
  'Sense of safety': '安心感',
  'Care': '关爱',
  'Tenderness': '温柔',
  'Intimacy': '亲密',
  'Worship': '崇拜',
  'Protective instinct': '守护感',
  'Commitment': '投入',
  'Neededness': '被需要',
  'Likedness': '被喜欢',
  'Curiosity': '好奇',
  'Dread': '危机预感',
  'Fear of missing out': '错过感',
  'Imbalance': '失衡感',
  'Threshold anxiety': '临界感',
  'Indecision': '犹豫',
  'Uncertainty drift': '动荡感',
  'Lack of orientation': '方向迷失',
  'Victory': '胜利感',
  'Inferiority': '自卑',
  'Self-Doubt': '自我怀疑',
  'Inner Conflict': '内在冲突',
  'Emptiness': '空虚',
  'Belongingness': '归属感',
  'Misrepresentation': '被误解',
  'Fragmentation': '分裂感',
  'Identity Crisis': '找不到自己',
  'Doubted': '被质疑',
  'Labeled': '被标签化',
  'Cool-headedness': '冷静',
  'Harmony': '和谐',
  'Emotional Numbness': '情绪钝化',
  'Blankness': '空白',
  'Meaninglessness': '无意义',
  'Apathy': '漠然',
  'Emotional inertia': '慢热感',
  'Mental idling': '空转感',
  'Absurdity': '宇宙荒谬感',
  'Nihilism': '虚无感',
  'Lack of Purpose': '目的缺失',
  'Passingness': '时间流逝感',
  'Replaceability': '被替代感',
  'Self-dissolution': '身份消解',
  'Digital detachment': '虚拟剥离',
  'Cold Sweat': '冷汗',
  'Palpitations': '心悸',
  'Shortness of Breath': '呼吸紧迫',
  'Queasiness': '呕吐感',
  'Weeping': '哭泣',
  'Trembling': '颤抖',
  'Withdrawnness': '缩手',
  'Blank-out': '突然呆滞',
  
  // OSS数据中的实际情绪类型
  'Distress': '痛苦',
  'Stress': '压力',
  'Gratitude': '感激',
  
  // 小写版本映射（向后兼容）
  'happiness': '快乐',
  'satisfaction': '满足',
  'joy': '喜悦',
  'loss': '失落',
  'loneliness': '孤独',
  'depression': '抑郁',
  'despair': '绝望',
  'anger': '愤怒',
  'anxiety': '焦虑',
  'fear': '恐惧',
  'confusion': '困惑',
  'hope': '希望',
  'excitement': '兴奋',
  'confidence': '自信',
  'guilt': '内疚',
  'shame': '羞耻',
  'pride': '自豪',
  'relief': '宽慰',
  'gratitude': '感激',
  'disappointment': '失望',
  'stress': '压力',
  'curiosity': '好奇',
  'love': '爱',
  'trust': '信任',
  'surprise': '惊奇',
  'disgust': '厌恶',
  'contempt': '轻蔑',
  'envy': '嫉妒',
  'jealousy': '嫉妒',
  'boredom': '无聊',
  'frustration': '挫折',
  'frustrated': '沮丧',
  'anxious': '焦虑',
  'hopeful': '希望',
  'embarrassment': '尴尬',
  'regret': '后悔',
  'nostalgia': '怀念',
  'awe': '敬畏',
  'compassion': '同情',
  'empathy': '共情',
  'admiration': '钦佩',
  'appreciation': '欣赏',
  'contentment': '满足',
  'serenity': '宁静',
  'peace': '安详',
  'comfort': '舒适',
  'security': '安全感',
  'loyalty': '忠诚',
  'neutral': '中性',
  'unknown': '未知'
};

// 情绪颜色配置 - 基于174种情绪的完整配色方案
const EMOTION_COLORS: Record<string, string> = {
  // 1-20: 基础情绪（快乐系列）
  'Happiness': '#52c41a', 'happiness': '#52c41a',
  'Satisfaction': '#73d13d', 'satisfaction': '#73d13d', 
  'Joy': '#95de64', 'joy': '#95de64',
  'Loss': '#8c8c8c', 'loss': '#8c8c8c',
  'Loneliness': '#595959', 'loneliness': '#595959',
  'Depression': '#434343', 'depression': '#434343',
  'Despair': '#262626', 'despair': '#262626',
  'Irritability': '#ff7875', 'irritability': '#ff7875',
  'Indignation': '#ff4d4f', 'indignation': '#ff4d4f',
  'Excitement': '#ffa940', 'excitement': '#ffa940',
  'Anger': '#f5222d', 'anger': '#f5222d',
  'Anxiety': '#faad14', 'anxiety': '#faad14',
  'Fear': '#fa541c', 'fear': '#fa541c',
  'Panic': '#fa8c16', 'panic': '#fa8c16',
  'Sense of Fear': '#d4380d',
  'Shock': '#ad4e00',
  'Confusion': '#8c8c8c', 'confusion': '#8c8c8c',
  'Unexpected': '#722ed1',
  'Amazement': '#531dab',
  'Dislike': '#b37feb',
  
  // 21-40: 安全感与期待系列
  'Aversion': '#d3adf7',
  'Dissatisfaction': '#efdbff',
  'Annoyance': '#f9f0ff',
  'Sense of Security': '#b7eb8f',
  'Dependence': '#d9f7be',
  'Loyalty': '#f6ffed',
  'Peace of Mind': '#87e8de',
  'Hope': '#fa8c16', 'hope': '#fa8c16',
  'Desire': '#69c0ff',
  'Expectation': '#91d5ff',
  'Guilt': '#bae7ff', 'guilt': '#bae7ff',
  'Embarrassment': '#e6f7ff', 'embarrassment': '#e6f7ff',
  'Regret': '#1890ff', 'regret': '#1890ff',
  'Shamefulness': '#096dd9',
  'Sense of Achievement': '#0050b3',
  'Pride': '#003a8c', 'pride': '#003a8c',
  'Confidence': '#002766', 'confidence': '#002766',
  'Tension': '#ff9c6e',
  'Unease': '#ffbb96',
  'Worry': '#ffd591',
  
  // 41-60: 困扰与平静系列
  'Trouble': '#ffe7ba',
  'Helplessness': '#fff1b8',
  'Loss of Interest': '#fffbe6',
  'Dejection': '#d9d9d9',
  'Tranquility': '#b5f5ec',
  'Relaxation': '#5cdbd3',
  'Serenity': '#36cfc9', 'serenity': '#36cfc9',
  'Comfort': '#13c2c2', 'comfort': '#13c2c2',
  'Bewilderment': '#08979c',
  'Doubt': '#006d75',
  'Tiredness': '#00474f',
  'Exhaustion': '#002329',
  'Weakness': '#f0f0f0', 'weakness': '#f0f0f0',
  'Isolation': '#d9d9d9',
  'Separation': '#bfbfbf',
  'Neglect': '#a6a6a6',
  'Yearning': '#873800',
  'Pursuit': '#ad4e00',
  'Aspiration': '#d46b08',
  'Loss of Control': '#fa8c16',
  
  // 61-80: 稳定与感激系列
  'Stability': '#ffc53d',
  'Relief': '#ffd666', 'relief': '#ffd666',
  'Thanks': '#ffe58f',
  'Appreciation': '#fff1b8', 'appreciation': '#fff1b8',
  'Contentment': '#fffbe6', 'contentment': '#fffbe6',
  'Displeased': '#eb2f96',
  'Uncertainty': '#f759ab',
  'Pain': '#ff85c0',
  'Interest': '#ffadd6',
  'Disappointment': '#1890ff', 'disappointment': '#1890ff',
  'Gratification': '#ffc9db',
  'Glee': '#ffd6e7',
  'Playfulness': '#ffedeb',
  'Grief': '#fff2e8',
  'Lament': '#fff7e6',
  'Melancholy': '#feffe6',
  'Humiliation': '#fcffe6',
  'Hostility': '#f4ffb8',
  'Jealousy': '#eaff8f', 'jealousy': '#eaff8f',
  'Hatred': '#d9ff7a',
  
  // 81-100: 愤怒与恐惧系列
  'Irritation': '#c9ff5b',
  'Startle': '#bae637',
  'Phobia': '#a0d911',
  'Rejection': '#7cb305',
  'Contempt': '#5b8c00', 'contempt': '#5b8c00',
  'Moral disgust': '#3f6600',
  'Nausea': '#254000',
  'Self-disgust': '#135200',
  'Guilt-like Shame': '#092b00',
  'Exposure': '#061f00',
  'Remorse': '#030b00',
  'Self-blame': '#87e8de',
  'Contrition': '#5cdbd3',
  'Moral Wrongness': '#36cfc9',
  'Self-respect': '#13c2c2',
  'Glory': '#08979c',
  'Admiration': '#006d75',
  'Thankfulness': '#00474f',
  'Feeling remembered': '#002329',
  'Cared for': '#722ed1',
  
  // 101-120: 关系与情感系列
  'Possessiveness': '#531dab',
  'Injustice': '#391085',
  'Threat': '#22075e',
  'Assurance': '#120338',
  'Dependability': '#030852',
  'Understanding': '#061178', 'understanding': '#061178',
  'Acceptance': '#0d1a78', 'acceptance': '#0d1a78',
  'Sense of safety': '#112378',
  'Care': '#152c78',
  'Tenderness': '#1d3557',
  'Intimacy': '#23417c',
  'Worship': '#2954a3',
  'Protective instinct': '#3366cc',
  'Commitment': '#4080ff',
  'Neededness': '#6699ff',
  'Likedness': '#80b3ff',
  'Curiosity': '#99ccff', 'curiosity': '#99ccff',
  'Dread': '#b3d9ff',
  'Fear of missing out': '#cce5ff',
  'Imbalance': '#e6f2ff',
  
  // 121-140: 决策与身份系列
  'Threshold anxiety': '#fff0f6',
  'Indecision': '#ffd6ec',
  'Uncertainty drift': '#ffb3d9',
  'Lack of orientation': '#ff80c0',
  'Victory': '#ff4da6', 'victory': '#ff4da6',
  'Inferiority': '#e6005c',
  'Self-Doubt': '#cc0052',
  'Inner Conflict': '#b30047',
  'Emptiness': '#99003d', 'emptiness': '#99003d',
  'Belongingness': '#800033',
  'Misrepresentation': '#660029',
  'Fragmentation': '#4d001f',
  'Identity Crisis': '#330014',
  'Doubted': '#1a000a',
  'Labeled': '#0d0005',
  'Cool-headedness': '#001a33',
  'Harmony': '#003366',
  'Emotional Numbness': '#004d99',
  'Blankness': '#0066cc',
  'Meaninglessness': '#1a80ff',
  
  // 141-160: 存在与虚无系列
  'Apathy': '#4d99ff', 'apathy': '#4d99ff',
  'Emotional inertia': '#80b3ff',
  'Mental idling': '#b3d1ff',
  'Absurdity': '#e6f0ff',
  'Nihilism': '#f0f8ff',
  'Lack of Purpose': '#fff8f0',
  'Passingness': '#ffe6d9',
  'Replaceability': '#ffd4b3',
  'Self-dissolution': '#ffc299',
  'Digital detachment': '#ffb380',
  'Cold Sweat': '#ffa366',
  'Palpitations': '#ff944d',
  'Shortness of Breath': '#ff8533',
  'Queasiness': '#ff751a',
  'Weeping': '#ff6600',
  'Trembling': '#e65c00',
  'Withdrawnness': '#cc5200',
  'Blank-out': '#b34700',
  
  // OSS数据中的具体情绪
  'Distress': '#722ed1',
  'Stress': '#ff7a45', 'stress': '#ff7a45',
  'Gratitude': '#73d13d', 'gratitude': '#73d13d',
  
  // 其他常见情绪
  'surprise': '#fa8c16', 'boredom': '#595959',
  'envy': '#52c41a', 'disgust': '#ff7a45',
  'shame': '#096dd9', 'trust': '#13c2c2',
  'love': '#c41d7f', 'peace': '#f6ffed',
  'frustration': '#40a9ff', 'nostalgia': '#ffc9db',
  'awe': '#531dab', 'compassion': '#73d13d',
  'empathy': '#87e8de', 'optimism': '#ffe7ba',
  
  // 默认颜色
  'neutral': '#d9d9d9',
  'unknown': '#f0f0f0'
};

// 情绪emoji配置 - 基于174种情绪的完整表情符号
const EMOTION_EMOJIS: Record<string, string> = {
  // 1-20: 基础情绪
  'Happiness': '😊', 'happiness': '😊',
  'Satisfaction': '😌', 'satisfaction': '😌',
  'Joy': '😄', 'joy': '😄',
  'Loss': '😔', 'loss': '😔',
  'Loneliness': '😞', 'loneliness': '😞',
  'Depression': '😩', 'depression': '😩',
  'Despair': '😨', 'despair': '😨',
  'Irritability': '😤', 'irritability': '😤',
  'Indignation': '😠',
  'Excitement': '🤗', 'excitement': '🤗',
  'Anger': '😡', 'anger': '😡',
  'Anxiety': '😰', 'anxiety': '😰',
  'Fear': '😨', 'fear': '😨',
  'Panic': '😱', 'panic': '😱',
  'Sense of Fear': '😱',
  'Shock': '😲',
  'Confusion': '😕', 'confusion': '😕',
  'Unexpected': '😯',
  'Amazement': '😮',
  'Dislike': '😒',
  
  // 21-40: 安全感与期待
  'Aversion': '😖',
  'Dissatisfaction': '😤',
  'Annoyance': '😫',
  'Sense of Security': '🛡️',
  'Dependence': '🤝',
  'Loyalty': '💙',
  'Peace of Mind': '☮️',
  'Hope': '✨', 'hope': '✨',
  'Desire': '💭',
  'Expectation': '🤞',
  'Guilt': '😔', 'guilt': '😔',
  'Embarrassment': '😳', 'embarrassment': '😳',
  'Regret': '😞', 'regret': '😞',
  'Shamefulness': '😳',
  'Sense of Achievement': '🏆',
  'Pride': '😌', 'pride': '😌',
  'Confidence': '💪', 'confidence': '💪',
  'Tension': '😬',
  'Unease': '😟',
  'Worry': '😟',
  
  // 41-60: 困扰与平静
  'Trouble': '😣',
  'Helplessness': '😔',
  'Loss of Interest': '😶',
  'Dejection': '😞',
  'Tranquility': '😌',
  'Relaxation': '😎',
  'Serenity': '🧘', 'serenity': '🧘',
  'Comfort': '🤗', 'comfort': '🤗',
  'Bewilderment': '🤔',
  'Doubt': '🤨',
  'Tiredness': '😴',
  'Exhaustion': '😵',
  'Weakness': '😮‍💨', 'weakness': '😮‍💨',
  'Isolation': '😶',
  'Separation': '💔',
  'Neglect': '😔',
  'Yearning': '😍',
  'Pursuit': '🏃',
  'Aspiration': '🎯',
  'Loss of Control': '😵‍💫',
  
  // 61-80: 稳定与感激
  'Stability': '⚖️',
  'Relief': '😅', 'relief': '😅',
  'Thanks': '🙏',
  'Appreciation': '👏', 'appreciation': '👏',
  'Contentment': '😊', 'contentment': '😊',
  'Displeased': '😠',
  'Uncertainty': '🤷',
  'Pain': '😣',
  'Interest': '🤔',
  'Disappointment': '😞', 'disappointment': '😞',
  'Gratification': '😌',
  'Glee': '😄',
  'Playfulness': '😄',
  'Grief': '😭',
  'Lament': '😢',
  'Melancholy': '😔',
  'Humiliation': '😳',
  'Hostility': '😤',
  'Jealousy': '😒', 'jealousy': '😒',
  'Hatred': '😡',
  
  // 81-100: 愤怒与恐惧
  'Irritation': '😤',
  'Startle': '😲',
  'Phobia': '😱',
  'Rejection': '❌',
  'Contempt': '😏', 'contempt': '😏',
  'Moral disgust': '🤢',
  'Nausea': '🤮',
  'Self-disgust': '😖',
  'Guilt-like Shame': '😳',
  'Exposure': '😰',
  'Remorse': '😔',
  'Self-blame': '😞',
  'Contrition': '🙏',
  'Moral Wrongness': '😔',
  'Self-respect': '💪',
  'Glory': '👑',
  'Admiration': '😍',
  'Thankfulness': '🙏',
  'Feeling remembered': '💭',
  'Cared for': '🤗',
  
  // 101-120: 关系与情感
  'Possessiveness': '🤝',
  'Injustice': '⚖️',
  'Threat': '⚠️',
  'Assurance': '🤝',
  'Dependability': '💪',
  'Understanding': '🤝', 'understanding': '🤝',
  'Acceptance': '🤗', 'acceptance': '🤗',
  'Sense of safety': '🛡️',
  'Care': '❤️',
  'Tenderness': '💕',
  'Intimacy': '💑',
  'Worship': '🙏',
  'Protective instinct': '🛡️',
  'Commitment': '💍',
  'Neededness': '🤗',
  'Likedness': '😊',
  'Curiosity': '🤔', 'curiosity': '🤔',
  'Dread': '😰',
  'Fear of missing out': '😰',
  'Imbalance': '⚖️',
  
  // 121-140: 决策与身份
  'Threshold anxiety': '😰',
  'Indecision': '🤷',
  'Uncertainty drift': '🌊',
  'Lack of orientation': '🧭',
  'Victory': '🏆', 'victory': '🏆',
  'Inferiority': '😔',
  'Self-Doubt': '🤔',
  'Inner Conflict': '😵‍💫',
  'Emptiness': '🕳️', 'emptiness': '🕳️',
  'Belongingness': '🏠',
  'Misrepresentation': '😤',
  'Fragmentation': '💔',
  'Identity Crisis': '🔍',
  'Doubted': '🤨',
  'Labeled': '🏷️',
  'Cool-headedness': '😎',
  'Harmony': '☯️',
  'Emotional Numbness': '😶',
  'Blankness': '😶',
  'Meaninglessness': '🤷',
  
  // 141-160: 存在与虚无
  'Apathy': '😑', 'apathy': '😑',
  'Emotional inertia': '😴',
  'Mental idling': '🧠',
  'Absurdity': '🤪',
  'Nihilism': '🕳️',
  'Lack of Purpose': '🤷',
  'Passingness': '⏰',
  'Replaceability': '🔄',
  'Self-dissolution': '💭',
  'Digital detachment': '📱',
  'Cold Sweat': '😅',
  'Palpitations': '💓',
  'Shortness of Breath': '😮‍💨',
  'Queasiness': '🤢',
  'Weeping': '😭',
  'Trembling': '😰',
  'Withdrawnness': '🤏',
  'Blank-out': '😶',
  
  // OSS数据中的具体情绪
  'Distress': '😣',
  'Stress': '😫', 'stress': '😫',
  'Gratitude': '🙏', 'gratitude': '🙏',
  
  // 其他常见情绪
  'surprise': '😲', 'boredom': '😴',
  'envy': '😒', 'disgust': '🤢',
  'shame': '😳', 'trust': '🤝',
  'love': '❤️', 'peace': '☮️',
  'frustration': '😤', 'nostalgia': '😌',
  'awe': '😮', 'compassion': '🤗',
  'empathy': '🤝', 'optimism': '☀️',
  
  // 默认表情
  'neutral': '😐',
  'unknown': '❓'
};

// 情绪分类映射 (基于emotion_database.json的主动/被动标签)
const EMOTION_CATEGORY_MAP: Record<string, EmotionCategory> = {
  // 主动情绪 (Active)
  'Happiness': 'active', 'happiness': 'active',
  'Joy': 'active', 'joy': 'active',
  'Indignation': 'active',
  'Excitement': 'active', 'excitement': 'active',
  'Anger': 'active', 'anger': 'active',
  'Hope': 'active', 'hope': 'active',
  'Desire': 'active',
  'Expectation': 'active',
  'Sense of Achievement': 'active',
  'Pride': 'active', 'pride': 'active',
  'Confidence': 'active', 'confidence': 'active',
  'Yearning': 'active',
  'Pursuit': 'active',
  'Aspiration': 'active',
  'Thanks': 'active',
  'Appreciation': 'active', 'appreciation': 'active',
  'Interest': 'active',
  'Disappointment': 'active', 'disappointment': 'active',
  'Glee': 'active',
  'Playfulness': 'active',
  'Hostility': 'active',
  'Hatred': 'active',
  'Rejection': 'active',
  'Contempt': 'active', 'contempt': 'active',
  'Contrition': 'active',
  'Self-respect': 'active',
  'Glory': 'active',
  'Thankfulness': 'active',
  'Possessiveness': 'active',
  'Acceptance': 'active', 'acceptance': 'active',
  'Care': 'active',
  'Tenderness': 'active',
  'Protective instinct': 'active',
  'Commitment': 'active',
  'Curiosity': 'active', 'curiosity': 'active',
  'Cool-headedness': 'active',
  'Victory': 'active', 'victory': 'active',
  
  // 被动情绪 (Passive)
  'Satisfaction': 'passive', 'satisfaction': 'passive',
  'Loss': 'passive', 'loss': 'passive',
  'Loneliness': 'passive', 'loneliness': 'passive',
  'Depression': 'passive', 'depression': 'passive',
  'Despair': 'passive', 'despair': 'passive',
  'Irritability': 'passive', 'irritability': 'passive',
  'Anxiety': 'passive', 'anxiety': 'passive',
  'Fear': 'passive', 'fear': 'passive',
  'Panic': 'passive', 'panic': 'passive',
  'Sense of Fear': 'passive',
  'Shock': 'passive',
  'Confusion': 'passive', 'confusion': 'passive',
  'Unexpected': 'passive',
  'Amazement': 'passive',
  'Dislike': 'passive',
  'Aversion': 'passive',
  'Dissatisfaction': 'passive',
  'Annoyance': 'passive',
  'Sense of Security': 'passive',
  'Dependence': 'passive',
  'Loyalty': 'passive',
  'Peace of Mind': 'passive',
  'Guilt': 'passive', 'guilt': 'passive',
  'Embarrassment': 'passive', 'embarrassment': 'passive',
  'Regret': 'passive', 'regret': 'passive',
  'Shamefulness': 'passive',
  'Tension': 'passive',
  'Unease': 'passive',
  'Worry': 'passive',
  'Trouble': 'passive',
  'Helplessness': 'passive',
  'Loss of Interest': 'passive',
  'Dejection': 'passive',
  'Tranquility': 'passive',
  'Relaxation': 'passive',
  'Serenity': 'passive', 'serenity': 'passive',
  'Comfort': 'passive', 'comfort': 'passive',
  'Bewilderment': 'passive',
  'Doubt': 'passive',
  'Tiredness': 'passive',
  'Exhaustion': 'passive',
  'Weakness': 'passive', 'weakness': 'passive',
  'Isolation': 'passive',
  'Separation': 'passive',
  'Neglect': 'passive',
  'Loss of Control': 'passive',
  'Stability': 'passive',
  'Relief': 'passive', 'relief': 'passive',
  'Contentment': 'passive', 'contentment': 'passive',
  'Displeased': 'passive',
  'Uncertainty': 'passive',
  'Pain': 'passive',
  'Gratification': 'passive',
  'Grief': 'passive',
  'Lament': 'passive',
  'Melancholy': 'passive',
  'Humiliation': 'passive',
  'Jealousy': 'passive', 'jealousy': 'passive',
  'Irritation': 'passive',
  'Startle': 'passive',
  'Phobia': 'passive',
  'Moral disgust': 'passive',
  'Nausea': 'passive',
  'Self-disgust': 'passive',
  'Guilt-like Shame': 'passive',
  'Exposure': 'passive',
  'Remorse': 'passive',
  'Self-blame': 'passive',
  'Moral Wrongness': 'passive',
  'Admiration': 'passive',
  'Feeling remembered': 'passive',
  'Cared for': 'passive',
  'Injustice': 'passive',
  'Threat': 'passive',
  'Assurance': 'passive',
  'Dependability': 'passive',
  'Understanding': 'passive', 'understanding': 'passive',
  'Sense of safety': 'passive',
  'Intimacy': 'passive',
  'Worship': 'passive',
  'Neededness': 'passive',
  'Likedness': 'passive',
  'Dread': 'passive',
  'Fear of missing out': 'passive',
  'Imbalance': 'passive',
  'Threshold anxiety': 'passive',
  'Indecision': 'passive',
  'Uncertainty drift': 'passive',
  'Lack of orientation': 'passive',
  'Inferiority': 'passive',
  'Self-Doubt': 'passive',
  'Inner Conflict': 'passive',  
  'Emptiness': 'passive', 'emptiness': 'passive',
  'Belongingness': 'passive',
  'Misrepresentation': 'passive',
  'Fragmentation': 'passive',
  'Identity Crisis': 'passive',
  'Doubted': 'passive',
  'Labeled': 'passive',
  'Harmony': 'passive',
  'Emotional Numbness': 'passive',
  'Blankness': 'passive',
  'Meaninglessness': 'passive',
  'Apathy': 'passive', 'apathy': 'passive',
  'Emotional inertia': 'passive',
  'Mental idling': 'passive',
  'Absurdity': 'passive',
  'Nihilism': 'passive',
  'Lack of Purpose': 'passive',
  'Passingness': 'passive',
  'Replaceability': 'passive',
  'Self-dissolution': 'passive',
  'Digital detachment': 'passive',
  'Cold Sweat': 'passive',
  'Palpitations': 'passive',
  'Shortness of Breath': 'passive',
  'Queasiness': 'passive',
  'Weeping': 'passive',
  'Trembling': 'passive',
  'Withdrawnness': 'passive',
  'Blank-out': 'passive',
  
  // OSS数据中的情绪分类
  'Distress': 'passive',
  'Stress': 'passive', 'stress': 'passive',
  'Gratitude': 'passive', 'gratitude': 'passive',
  
  // 其他常见情绪分类
  'surprise': 'passive',
  'boredom': 'passive',
  'envy': 'passive',
  'disgust': 'passive',
  'shame': 'passive',
  'trust': 'passive',
  'love': 'active',
  'peace': 'passive',
  'frustration': 'passive',
  'nostalgia': 'passive',
  'awe': 'passive',
  'compassion': 'active',
  'empathy': 'passive',
  'optimism': 'active',
  
  // 中性情绪
  'neutral': 'neutral',
  'unknown': 'neutral'
};

// 导出配置供其他组件使用
export { EMOTION_COLORS, EMOTION_EMOJIS, EMOTION_CATEGORY_MAP, EMOTION_CHINESE_MAP };

interface EmotionAnalysisStore extends EmotionAnalysisState, EmotionAnalysisActions {}

export const useEmotionAnalysisStore = create<EmotionAnalysisStore>()(
  devtools(
    persist(
      (set, get) => ({
        // State
        summaryData: [],
        analysisResult: null,
        currentTimeRange: 'month',
        customDateRange: null,
        isLoading: false,
        error: null,
        lastUpdated: null,
        cacheKey: null,

        // Actions
        loadSummaryData: async (params?: EmotionAnalysisParams) => {
          const state = get();
          const timeRange = params?.timeRange || state.currentTimeRange;
          const startDate = params?.startDate || state.customDateRange?.[0];
          const endDate = params?.endDate || state.customDateRange?.[1];

          // 生成高级缓存键
          const cacheKey = generateCacheKey('emotion_analysis', {
            timeRange,
            startDate: startDate?.getTime(),
            endDate: endDate?.getTime()
          });
          
          // 检查多级缓存
          const cachedResult = emotionAnalysisCache.get(cacheKey);
          if (cachedResult) {
            console.log('Using cached emotion analysis result from performance cache');
            set({
              analysisResult: cachedResult,
              isLoading: false,
              cacheKey
            });
            return;
          }

          // 检查本地缓存
          if (state.cacheKey === cacheKey && state.analysisResult && state.lastUpdated) {
            const cacheAge = Date.now() - state.lastUpdated.getTime();
            if (cacheAge < ALGORITHM_CONFIG.performance.cacheTTL * 1000) {
              console.log('Using local cached emotion analysis result');
              return;
            }
          }

          set({ isLoading: true, error: null });

          try {
            // 1. 加载OSS summary数据 (带缓存)
            const summaryDataCacheKey = generateCacheKey('summary_data', {
              timeRange,
              startDate: startDate?.getTime(),
              endDate: endDate?.getTime()
            });
            
            let summaryData: EmotionSummaryData[] = [];
            const cachedSummaryData = summaryDataCache.get(summaryDataCacheKey);
            
            if (cachedSummaryData) {
              console.log('Using cached summary data');
              summaryData = cachedSummaryData;
            } else {
              console.log('Loading fresh summary data from OSS');
              summaryData = await loadSummaryDataFromOSS(timeRange, startDate, endDate);
              summaryDataCache.set(summaryDataCacheKey, summaryData);
            }
            
            // 2. 聚合和分析数据 (带缓存)
            const analysisResult = await analyzeEmotionData(summaryData, timeRange, startDate, endDate);

            // 缓存分析结果
            emotionAnalysisCache.set(cacheKey, analysisResult);

            set({
              summaryData,
              analysisResult,
              currentTimeRange: timeRange,
              isLoading: false,
              lastUpdated: new Date(),
              cacheKey
            });

            console.log('Emotion analysis completed and cached successfully');

          } catch (error: any) {
            console.error('Failed to load emotion analysis data:', error);
            set({
              error: error.message || 'Failed to load emotion data',
              isLoading: false
            });
          }
        },

        setTimeRange: (range: TimeRange) => {
          console.log('🎯 EmotionAnalysisStore: setTimeRange调用', {
            from: get().currentTimeRange,
            to: range,
            currentDataCount: get().summaryData?.length || 0,
            hasAnalysisResult: !!get().analysisResult
          });
          
          // 🎯 修复：清除相关缓存，确保重新计算
          const oldCacheKey = get().cacheKey;
          if (oldCacheKey) {
            emotionAnalysisCache.delete(oldCacheKey);
            console.log('🎯 清除旧的分析结果缓存:', oldCacheKey);
          }
          
          // 清除summary数据缓存（因为时间范围变了）
          summaryDataCache.clear();
          console.log('🎯 清除summary数据缓存');
          
          set({ 
            currentTimeRange: range, 
            customDateRange: null,
            cacheKey: null, // 重置缓存键
            analysisResult: null // 清空旧的分析结果
          });
          
          // 自动重新加载数据
          console.log('🎯 EmotionAnalysisStore: 开始重新加载数据');
          get().loadSummaryData({ timeRange: range });
        },

        setCustomDateRange: (range: [Date, Date] | null) => {
          set({ customDateRange: range });
          if (range) {
            // 自动重新加载数据
            get().loadSummaryData({ 
              timeRange: get().currentTimeRange,
              startDate: range[0],
              endDate: range[1]
            });
          }
        },

        refreshData: async () => {
          // 清除缓存并重新加载
          set({ cacheKey: null });
          await get().loadSummaryData();
        },

        clearCache: () => {
          // 清理内存缓存
          emotionAnalysisCache.clear();
          emotionAggregationCache.clear();
          summaryDataCache.clear();

          set({
            summaryData: [],
            analysisResult: null,
            cacheKey: null,
            lastUpdated: null,
            error: null
          });
        },

        exportData: async (format: 'json' | 'csv' | 'excel') => {
          const { analysisResult } = get();
          if (!analysisResult) {
            throw new Error('No data to export');
          }

          // TODO: 实现数据导出功能
          console.log(`Exporting emotion analysis data in ${format} format`);
          throw new Error('Export functionality not implemented yet');
        }
      }),
      {
        name: 'emotion-analysis-store',
        partialize: (state) => ({
          currentTimeRange: state.currentTimeRange,
          customDateRange: state.customDateRange
        })
      }
    ),
    { name: 'emotion-analysis-store' }
  )
);

// 辅助函数：从OSS加载summary数据
async function loadSummaryDataFromOSS(
  timeRange: TimeRange,
  startDate?: Date,
  endDate?: Date
): Promise<EmotionSummaryData[]> {
  try {
    // 在开发环境中使用假数据
    if (process.env.NODE_ENV === 'development') {
      // 动态导入假数据
      const { generateMonthlyData } = await import('../demo-data/monthlyEmotionData');
      const allFakeData = generateMonthlyData();
      
      // 计算日期范围
      const dateRange = calculateDateRange(timeRange, startDate, endDate);
      
      // 过滤假数据到指定时间范围
      const filteredData = allFakeData.filter(item => {
        const itemDate = new Date(item.timestamp);
        return itemDate >= dateRange.start && itemDate <= dateRange.end;
      });
      
      console.log(`📊 Demo模式: 加载了 ${filteredData.length} 条假数据 (时间范围: ${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()})`);
      return filteredData;
    }
    
    // 生产环境使用真实OSS数据
    const dateRange = calculateDateRange(timeRange, startDate, endDate);
    
    // 使用新的getEmotionSummaries方法
    const response = await historyService.getEmotionSummaries({
      timeRange,
      startDate: dateRange.start.toISOString().split('T')[0],
      endDate: dateRange.end.toISOString().split('T')[0],
      limit: ALGORITHM_CONFIG.performance.batchSize
    });

    if (!response.success) {
      throw new Error(response.message || 'Failed to load emotion summaries');
    }

    // 转换为EmotionSummaryData格式
    const summaryData: EmotionSummaryData[] = response.data.map(item => ({
      timestamp: item.timestamp,
      summary: item.summary,
      detected_emotions: item.detected_emotions || [],
      knowledge_graph: item.knowledge_graph,
      metadata: {
        processing_time: Date.now()
      }
    }));

    console.log(`Successfully loaded ${summaryData.length} emotion summary records`);
    return summaryData;

  } catch (error) {
    console.error('Failed to load summary data from OSS:', error);
    throw error;
  }
}

// 辅助函数：计算日期范围
function calculateDateRange(
  timeRange: TimeRange,
  startDate?: Date,
  endDate?: Date
): { start: Date; end: Date } {
  if (startDate && endDate) {
    return { start: startDate, end: endDate };
  }

  const now = new Date();
  const end = new Date(now);
  let start: Date;

  switch (timeRange) {
    case 'week':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'quarter':
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return { start, end };
}

// 核心算法：分析情绪数据 (基于创意设计的算法)
async function analyzeEmotionData(
  summaryData: EmotionSummaryData[],
  timeRange: TimeRange,
  startDate?: Date,
  endDate?: Date
): Promise<EmotionAnalysisResult> {
  const dateRange = calculateDateRange(timeRange, startDate, endDate);
  
  // 🚀 性能优化：添加结果缓存机制
  const cacheKey = generateCacheKey('emotion_analysis_data', {
    timeRange,
    startDate: dateRange.start.toISOString(),
    endDate: dateRange.end.toISOString(),
    dataHash: summaryData.map(s => s.timestamp).join(',').slice(0, 50)
  });
  
  // 检查缓存
  const cachedResult = emotionAnalysisCache.get(cacheKey);
  if (cachedResult) {
    console.log('🚀 analyzeEmotionData: 命中缓存，直接返回结果');
    return cachedResult;
  }
  
  console.log('🚀 analyzeEmotionData: 缓存未命中，开始计算');
  const startTime = performance.now();
  
  // 🎯 修复：确保数据按时间范围正确过滤
  const filteredData = summaryData.filter(summary => {
    const summaryDate = new Date(summary.timestamp || (summary as any).key);
    if (isNaN(summaryDate.getTime())) {
      console.warn('跳过无效日期的数据:', summary);
      return false;
    }
    return summaryDate >= dateRange.start && summaryDate <= dateRange.end;
  });
  
  console.log('🎯 analyzeEmotionData: 数据过滤结果', {
    timeRange,
    dateRange: [dateRange.start.toLocaleDateString(), dateRange.end.toLocaleDateString()],
    originalCount: summaryData.length,
    filteredCount: filteredData.length,
    firstFiltered: filteredData[0]?.timestamp,
    lastFiltered: filteredData[filteredData.length - 1]?.timestamp
  });
  
  // 1. 聚合情绪数据 - 使用过滤后的数据
  const aggregations = aggregateEmotions(filteredData);
  
  // 2. 计算时间趋势 - 使用过滤后的数据
  const trends = calculateEmotionTrends(filteredData, dateRange);
  
  // 3. 生成日历数据 - 使用过滤后的数据
  const calendar = generateCalendarData(filteredData, dateRange);
  
  // 4. 构建知识图谱 - 使用过滤后的数据
  const knowledgeGraph = buildKnowledgeGraph(filteredData);
  
  // 5. 计算统计信息 - 使用过滤后的数据和聚合结果
  const statistics = calculateStatistics(filteredData, aggregations);
  
  // 6. 生成建议
  const suggestions = generateSuggestions(statistics, trends);

  const result: EmotionAnalysisResult = {
    timeRange,
    dateRange: [dateRange.start, dateRange.end],
    aggregations,
    trends,
    calendar,
    knowledgeGraph,
    statistics,
    suggestions
  };
  
  // 🚀 性能优化：将结果存入缓存
  emotionAnalysisCache.set(cacheKey, result);
  
  const endTime = performance.now();
  console.log(`🚀 analyzeEmotionData: 计算完成，用时 ${(endTime - startTime).toFixed(2)}ms，已缓存`);

  console.log('🎯 analyzeEmotionData: 最终统计结果', {
    totalRecords: statistics.totalRecords,
    totalEmotions: statistics.totalEmotions,
    dominantEmotion: statistics.dominantEmotion,
    averageIntensity: statistics.averageIntensity,
    moodStability: statistics.moodStability,
    positivityRatio: statistics.positivityRatio,
    aggregationsCount: aggregations.length
  });

  return result;
}

// 聚合情绪数据
function aggregateEmotions(summaryData: EmotionSummaryData[]): EmotionAggregation[] {
  // 使用临时接口来跟踪occurrences
  interface TempEmotionData {
    emotion: string;
    chinese: string;
    category: EmotionCategory;
    count: number;
    totalIntensity: number;
    lastOccurrence: Date;
    occurrences: Date[];
  }
  
  const emotionMap = new Map<string, TempEmotionData>();

  // 收集所有情绪数据
  summaryData.forEach(summary => {
    const timestamp = new Date(summary.timestamp);
    
    summary.detected_emotions.forEach(emotion => {
      const key = emotion.emotion;
      
      let current = emotionMap.get(key) || {
        emotion: key,
        chinese: getEmotionChinese(key),
        category: EMOTION_CATEGORY_MAP[key] || 'neutral',
        count: 0,
        totalIntensity: 0,
        lastOccurrence: timestamp,
        occurrences: []
      };
      
      current.count += 1;
      // 🎯 修复：标准化intensity值，如果>1则认为是百分数形式
      let normalizedIntensity = emotion.intensity;
      if (normalizedIntensity > 1) {
        normalizedIntensity = normalizedIntensity / 100;
      }
      normalizedIntensity = Math.min(Math.max(normalizedIntensity, 0), 1);
      
      current.totalIntensity += normalizedIntensity;
      current.lastOccurrence = timestamp > current.lastOccurrence ? timestamp : current.lastOccurrence;
      current.occurrences.push(timestamp);
      
      emotionMap.set(key, current);
    });
  });

  const totalEmotions = Array.from(emotionMap.values()).reduce((sum, data) => sum + data.count, 0);

  // 转换为最终的EmotionAggregation格式
  const aggregations: EmotionAggregation[] = Array.from(emotionMap.values()).map(data => {
    const averageIntensity = data.count > 0 ? data.totalIntensity / data.count : 0;
    return {
      emotion: data.emotion as EmotionType,
      emotion_cn: data.chinese,
      category: data.category,
      count: data.count,
      totalIntensity: data.totalIntensity,
      averageIntensity,
      percentage: totalEmotions > 0 ? (data.count / totalEmotions) * 100 : 0,
      lastOccurrence: data.lastOccurrence,
      trend: calculateEmotionTrend(data.occurrences)
    };
  });

  return aggregations.sort((a, b) => b.count - a.count);
}

// 计算情绪趋势
function calculateEmotionTrends(
  summaryData: EmotionSummaryData[],
  dateRange: { start: Date; end: Date }
): EmotionTrend {
  // 按日期分组数据
  const dailyData = groupDataByDate(summaryData, dateRange);
  
  // 计算每日情绪指标
  const timePoints = dailyData.map(dayData => {
    const emotions = dayData.emotions;
    const dominantEmotion = findDominantEmotion(emotions);
    const averageIntensity = calculateAverageIntensity(emotions);
    const { activeRatio, passiveRatio } = calculateEmotionRatios(emotions);
    
    return {
      date: dayData.date,
      emotions,
      dominantEmotion,
      averageIntensity,
      activeEmotionRatio: activeRatio,
      passiveEmotionRatio: passiveRatio,
      recordCount: dayData.records.length
    };
  });

  // 计算整体趋势指标
  const overallTrend = calculateOverallTrend(timePoints);
  const moodStability = calculateMoodStability(timePoints);
  const positivityRatio = calculatePositivityRatio(timePoints);
  const weeklyComparison = calculateWeeklyComparison(timePoints);
  const insights = generateInsights(timePoints, overallTrend, moodStability);

  return {
    timePoints,
    overallTrend,
    moodStability,
    positivityRatio,
    weeklyComparison,
    insights
  };
}

// 生成日历数据
function generateCalendarData(
  summaryData: EmotionSummaryData[],
  dateRange: { start: Date; end: Date }
): CalendarEmotionData[] {
  const dailyData = groupDataByDate(summaryData, dateRange);
  
  return dailyData.map(dayData => {
    const emotions = dayData.emotions.map(emotion => {
      // 🎯 修复：标准化intensity值，如果>1则认为是百分数形式
      let normalizedIntensity = emotion.intensity;
      if (normalizedIntensity > 1) {
        normalizedIntensity = normalizedIntensity / 100;
      }
      normalizedIntensity = Math.min(Math.max(normalizedIntensity, 0), 1);
      
      return {
        emotion: emotion.emotion as EmotionType,
        intensity: normalizedIntensity,
        color: EMOTION_COLORS[emotion.emotion as EmotionType] || EMOTION_COLORS.neutral
      };
    });
    
    const dominantEmotion = findDominantEmotion(dayData.emotions);
    
    return {
      date: dayData.date,
      emotions,
      dominantEmotion,
      recordCount: dayData.records.length,
      summary: generateDailySummary(dayData.emotions)
    };
  });
}

// 构建情绪知识图谱 - 基于Obsidian设计理念
function buildKnowledgeGraph(summaryData: EmotionSummaryData[]): EmotionKnowledgeGraph {
  console.log('🧠 Building knowledge graph from summary data:', summaryData.length);
  
  const nodes: EmotionGraphNode[] = [];
  const edges: EmotionGraphEdge[] = [];
  
  // 用于跟踪节点和边，避免重复
  const emotionNodes = new Map<string, EmotionGraphNode>();
  const causeNodes = new Map<string, EmotionGraphNode>();
  const edgeMap = new Map<string, EmotionGraphEdge>();
  
  // 统计数据
  const emotionWeights = new Map<string, { intensity: number; count: number; causes: Set<string> }>();
  const causeWeights = new Map<string, { count: number; emotions: Set<string>; totalIntensity: number }>();
  
  // 第一步：遍历所有情绪数据，收集统计信息
  summaryData.forEach(summary => {
    if (!summary.detected_emotions || !Array.isArray(summary.detected_emotions)) return;
    
    summary.detected_emotions.forEach(emotionInfo => {
      // 将EmotionInfo转换为OSSEmotionInfo以支持causes属性
      const ossEmotionInfo = emotionInfo as OSSEmotionInfo;
      const emotion = ossEmotionInfo.emotion || '';
      // const emotionCn = ossEmotionInfo.emotion_cn || getEmotionChinese(emotion);
      const intensity = Math.max(0, Math.min(100, ossEmotionInfo.intensity || 0)); // 确保0-100范围
      
      // 统计情绪权重
      if (!emotionWeights.has(emotion)) {
        emotionWeights.set(emotion, { intensity: 0, count: 0, causes: new Set() });
      }
      const emotionStat = emotionWeights.get(emotion)!;
      emotionStat.intensity += intensity;
      emotionStat.count += 1;
      
      // 处理情绪的原因
      const causes = ossEmotionInfo.causes || [];
      causes.forEach(causeInfo => {
        const cause = causeInfo.cause || '';
        if (!cause.trim()) return;
        
        // 统计原因权重
        if (!causeWeights.has(cause)) {
          causeWeights.set(cause, { count: 0, emotions: new Set(), totalIntensity: 0 });
        }
        const causeStat = causeWeights.get(cause)!;
        causeStat.count += 1;
        causeStat.emotions.add(emotion);
        causeStat.totalIntensity += intensity;
        
        // 记录关联关系
        emotionStat.causes.add(cause);
      });
    });
  });
  
  // 第二步：创建情绪节点
  emotionWeights.forEach((stat, emotion) => {
    const emotionCn = getEmotionChinese(emotion);
    const avgIntensity = stat.intensity / stat.count;
    
    const emotionNode: EmotionGraphNode = {
      id: `emotion_${emotion}`,
      type: 'emotion',
      label: emotionCn,
      emotion: emotion as EmotionType,
      weight: stat.count, // 出现次数作为权重
      size: Math.max(30, Math.min(80, avgIntensity * 0.8 + 30)), // 30-80像素范围
      intensity: avgIntensity,
      color: EMOTION_COLORS[emotion] || '#52c41a',
      description: `${emotionCn} (${emotion}) - 平均强度: ${avgIntensity.toFixed(1)}%`,
      relatedCauses: Array.from(stat.causes)
    };
    
    emotionNodes.set(emotion, emotionNode);
    nodes.push(emotionNode);
  });
  
  // 第三步：创建原因节点
  causeWeights.forEach((stat, cause) => {
    // const avgIntensity = stat.totalIntensity / stat.count;
    
    const causeNode: EmotionGraphNode = {
      id: `cause_${encodeURIComponent(cause)}`,
      type: 'cause',
      label: cause,
      weight: stat.count,
      size: Math.max(25, Math.min(60, stat.count * 4 + 25)), // 25-60像素范围
      color: '#1890ff',
      description: `触发原因: ${cause} - 影响${stat.emotions.size}种情绪`,
      affectedEmotions: Array.from(stat.emotions)
    };
    
    causeNodes.set(cause, causeNode);
    nodes.push(causeNode);
  });
  
  // 第四步：创建边连接
  summaryData.forEach(summary => {
    if (!summary.detected_emotions || !Array.isArray(summary.detected_emotions)) return;
    
    summary.detected_emotions.forEach(emotionInfo => {
      // 将EmotionInfo转换为OSSEmotionInfo以支持causes属性
      const ossEmotionInfo = emotionInfo as OSSEmotionInfo;
      const emotion = ossEmotionInfo.emotion || '';
      const intensity = ossEmotionInfo.intensity || 0;
      
      const causes = ossEmotionInfo.causes || [];
      causes.forEach(causeInfo => {
        const cause = causeInfo.cause || '';
        if (!cause.trim()) return;
        
        const edgeKey = `${emotion}->${cause}`;
        
        if (!edgeMap.has(edgeKey)) {
          const emotionNode = emotionNodes.get(emotion);
          const causeNode = causeNodes.get(cause);
          
          if (emotionNode && causeNode) {
            const edge: EmotionGraphEdge = {
              source: emotionNode.id,
              target: causeNode.id,
              relationship: 'causes',
              weight: intensity / 100, // 标准化到0-1
              color: '#d9d9d9',
              width: Math.max(1, Math.min(8, intensity / 12.5)), // 1-8像素宽度
              label: `${intensity.toFixed(0)}%`,
              description: `${getEmotionChinese(emotion)} ← ${cause}`
            };
            
            edgeMap.set(edgeKey, edge);
            edges.push(edge);
          }
        } else {
          // 更新现有边的权重（累加多次出现）
          const existingEdge = edgeMap.get(edgeKey)!;
          existingEdge.weight = Math.min(1, existingEdge.weight + intensity / 100);
          existingEdge.width = Math.max(1, Math.min(8, existingEdge.weight * 8));
        }
      });
    });
  });
  
  // 第五步：计算统计信息
  const emotionNodeCount = emotionNodes.size;
  const causeNodeCount = causeNodes.size;
  const totalConnections = edges.length;
  const avgConnections = totalConnections > 0 ? totalConnections / nodes.length : 0;
  const maxWeight = Math.max(...nodes.map(n => n.weight), 0);
  
  // 找出最强连接
  const strongestConnections = edges
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .map(edge => ({
      source: typeof edge.source === 'string' ? edge.source : edge.source.id,
      target: typeof edge.target === 'string' ? edge.target : edge.target.id,
      weight: edge.weight
    }));
  
  // 找出主导原因
  const dominantCauses = Array.from(causeWeights.entries())
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 5)
    .map(([cause]) => cause);
  
  // 构建简单聚类（基于共同原因）
  const clusters: Array<{ nodes: string[]; centralEmotion: string }> = [];
  const processedEmotions = new Set<string>();
  
  emotionWeights.forEach((stat, emotion) => {
    if (processedEmotions.has(emotion)) return;
    
    // 找到与当前情绪有共同原因的其他情绪
    const relatedEmotions = [emotion];
    emotionWeights.forEach((otherStat, otherEmotion) => {
      if (otherEmotion === emotion || processedEmotions.has(otherEmotion)) return;
      
      // 计算共同原因的重叠度
      const commonCauses = Array.from(stat.causes).filter(cause => otherStat.causes.has(cause));
      if (commonCauses.length >= 2) { // 至少2个共同原因
        relatedEmotions.push(otherEmotion);
        processedEmotions.add(otherEmotion);
      }
    });
    
    if (relatedEmotions.length > 1) {
      clusters.push({
        nodes: relatedEmotions.map(e => `emotion_${e}`),
        centralEmotion: emotion
      });
    }
    
    processedEmotions.add(emotion);
  });
  
  console.log('🧠 Knowledge graph built:', {
    nodes: nodes.length,
    edges: edges.length,
    emotionNodes: emotionNodeCount,
    causeNodes: causeNodeCount,
    clusters: clusters.length
  });
  
  return {
    nodes,
    edges,
    statistics: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      emotionNodeCount,
      causeNodeCount,
      avgConnections,
      maxWeight,
      dominantCauses,
      strongestConnections,
      clusters
    },
    config: {
      width: 800,
      height: 600,
      nodeRadius: { min: 25, max: 80 },
      linkDistance: 150,
      linkStrength: 0.3,
      chargeStrength: -400,
      colors: {
        emotionNode: '#52c41a',
        causeNode: '#1890ff',
        selectedNode: '#ff4d4f',
        link: '#d9d9d9',
        selectedLink: '#ff4d4f'
      }
    }
  };
}

// 计算统计信息
function calculateStatistics(
  summaryData: EmotionSummaryData[],
  aggregations: EmotionAggregation[]
): EmotionStatistics {
  const totalRecords = summaryData.length;
  const totalEmotions = aggregations.reduce((sum, agg) => sum + agg.count, 0);
  const dominantEmotion = aggregations[0]?.emotion || 'neutral';
  const averageIntensity = aggregations.reduce((sum, agg) => sum + agg.averageIntensity, 0) / aggregations.length;
  
  // 计算各种指标
  const moodStability = calculateMoodStabilityFromAggregations(aggregations);
  const positivityRatio = calculatePositivityRatioFromAggregations(aggregations);
  const emotionDiversity = aggregations.length / 13; // 基于13种基础情绪类型
  const recentTrend = aggregations[0]?.trend === 'rising' ? 'improving' : 
                     aggregations[0]?.trend === 'falling' ? 'declining' : 'stable';
  
  return {
    totalRecords,
    totalEmotions,
    dominantEmotion,
    averageIntensity,
    moodStability,
    positivityRatio,
    emotionDiversity,
    recentTrend,
    weeklyChange: 0 // TODO: 实现周变化计算
  };
}

// 生成建议
function generateSuggestions(statistics: EmotionStatistics, trends: EmotionTrend): string[] {
  const suggestions: string[] = [];
  
  // 基于整体趋势的建议
  if (trends.overallTrend === 'declining') {
    suggestions.push('注意到您最近的情绪状态有下降趋势，建议适当调整生活节奏');
  } else if (trends.overallTrend === 'improving') {
    suggestions.push('您的情绪状态正在好转，请保持当前的积极状态');
  }
  
  // 基于积极情绪比例的建议
  if (statistics.positivityRatio < 0.3) {
    suggestions.push('建议增加一些让自己开心的活动，提升整体情绪状态');
  } else if (statistics.positivityRatio > 0.7) {
    suggestions.push('您保持着很好的积极心态，继续保持！');
  }
  
  // 基于情绪稳定性的建议
  if (statistics.moodStability < 0.5) {
    suggestions.push('您的情绪波动较大，建议尝试冥想或规律作息来提高稳定性');
  }

  return suggestions.length > 0 ? suggestions : ['继续记录您的情绪变化，我们将提供更个性化的建议'];
}

// ============ 辅助函数 ============

/**
 * 从OSS key中解析时间戳
 * key的格式: '.../0fc1d2c3_20250416_232933_summary.json'
 */
function parseTimestampFromKey(key: string): string {
  if (!key) return new Date().toISOString();

  const match = key.match(/_(\d{8})_(\d{6})_summary\.json$/);
  if (!match) {
    const date = new Date(key);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
    console.warn(`Could not parse timestamp from key: ${key}`);
    return new Date().toISOString();
  }

  const [, datePart, timePart] = match;
  const year = datePart.substring(0, 4);
  const month = datePart.substring(4, 6);
  const day = datePart.substring(6, 8);
  const hour = timePart.substring(0, 2);
  const minute = timePart.substring(2, 4);
  const second = timePart.substring(4, 6);

  return `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
}

function getEmotionChinese(emotion: string): string {
  return EMOTION_CHINESE_MAP[emotion] || emotion;
}

function calculateEmotionTrend(occurrences: Date[]): 'rising' | 'falling' | 'stable' {
  if (occurrences.length < 2) return 'stable';
  
  const midpoint = Math.floor(occurrences.length / 2);
  const firstHalf = occurrences.slice(0, midpoint).length;
  const secondHalf = occurrences.slice(midpoint).length;
  
  if (secondHalf > firstHalf * 1.2) return 'rising';
  if (secondHalf < firstHalf * 0.8) return 'falling';
  return 'stable';
}

function groupDataByDate(summaryData: EmotionSummaryData[], dateRange: { start: Date; end: Date }) {
  const dailyMap = new Map<string, { records: EmotionSummaryData[]; emotions: EmotionInfo[] }>();
  
  // 初始化日期范围
  for (let d = new Date(dateRange.start); d <= dateRange.end; d.setDate(d.getDate() + 1)) {
    const dateKey = d.toISOString().split('T')[0];
    dailyMap.set(dateKey, { records: [], emotions: [] });
  }
  
  // 分组数据
  summaryData.forEach(summary => {
    const timestampStr = summary.timestamp || (summary as any).key;
    const date = new Date(parseTimestampFromKey(timestampStr));

    if (isNaN(date.getTime())) {
      console.warn(`Skipping summary with invalid date:`, summary);
      return;
    }

    const dateKey = date.toISOString().split('T')[0];
    
    if (dailyMap.has(dateKey)) {
      const dayData = dailyMap.get(dateKey)!;
      dayData.records.push(summary);
      dayData.emotions.push(...summary.detected_emotions);
    }
  });
  
  return Array.from(dailyMap.entries()).map(([date, data]) => ({
    date,
    records: data.records,
    emotions: data.emotions
  }));
}

function findDominantEmotion(emotions: EmotionInfo[]): EmotionType {
  if (emotions.length === 0) return 'neutral';
  
  const emotionCounts = emotions.reduce((counts, emotion) => {
    counts[emotion.emotion] = (counts[emotion.emotion] || 0) + emotion.intensity;
    return counts;
  }, {} as Record<string, number>);
  
  const dominant = Object.entries(emotionCounts).reduce((max, [emotion, intensity]) =>
    intensity > max.intensity ? { emotion, intensity } : max,
    { emotion: 'neutral', intensity: 0 }
  );
  
  return dominant.emotion as EmotionType;
}

function calculateAverageIntensity(emotions: EmotionInfo[]): number {
  if (emotions.length === 0) return 0;
  
  // 🎯 修复：如果intensity已经是百分数（>1），则除以100转换为0-1范围
  const normalizedIntensities = emotions.map(emotion => {
    let intensity = emotion.intensity;
    // 如果intensity大于1，假设它是百分数形式，转换为0-1范围
    if (intensity > 1) {
      intensity = intensity / 100;
    }
    return Math.min(Math.max(intensity, 0), 1); // 确保在0-1范围内
  });
  
  return normalizedIntensities.reduce((sum, intensity) => sum + intensity, 0) / normalizedIntensities.length;
}

function calculateEmotionRatios(emotions: EmotionInfo[]): { activeRatio: number; passiveRatio: number } {
  if (emotions.length === 0) return { activeRatio: 0, passiveRatio: 0 };
  
  let activeCount = 0;
  let passiveCount = 0;
  
  emotions.forEach(emotion => {
    const category = EMOTION_CATEGORY_MAP[emotion.emotion];
    if (category === 'active') activeCount++;
    else if (category === 'passive') passiveCount++;
  });
  
  const total = emotions.length;
  return {
    activeRatio: activeCount / total,
    passiveRatio: passiveCount / total
  };
}

function calculateOverallTrend(timePoints: any[]): 'improving' | 'declining' | 'stable' {
  if (timePoints.length < 2) return 'stable';
  
  const firstHalf = timePoints.slice(0, Math.floor(timePoints.length / 2));
  const secondHalf = timePoints.slice(Math.floor(timePoints.length / 2));
  
  const firstAvg = firstHalf.reduce((sum, point) => sum + point.averageIntensity, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, point) => sum + point.averageIntensity, 0) / secondHalf.length;
  
  const change = (secondAvg - firstAvg) / firstAvg;
  
  if (change > 0.1) return 'improving';
  if (change < -0.1) return 'declining';
  return 'stable';
}

function calculateMoodStability(timePoints: any[]): number {
  if (timePoints.length < 2) return 1;
  
  const intensities = timePoints.map(point => point.averageIntensity);
  const mean = intensities.reduce((sum, val) => sum + val, 0) / intensities.length;
  const variance = intensities.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intensities.length;
  
  // 返回稳定性指数 (方差的倒数，归一化到0-1)
  return variance > 0 ? Math.min(1, 1 / (variance * 10)) : 1;
}

function calculatePositivityRatio(timePoints: any[]): number {
  if (timePoints.length === 0) return 0;
  
  const positivePoints = timePoints.filter(point => point.activeEmotionRatio > point.passiveEmotionRatio);
  return positivePoints.length / timePoints.length;
}

function calculateWeeklyComparison(timePoints: any[]): number {
  if (timePoints.length < 14) return 0;
  
  const recent = timePoints.slice(-7);
  const previous = timePoints.slice(-14, -7);
  
  const recentAvg = recent.reduce((sum, point) => sum + point.averageIntensity, 0) / recent.length;
  const previousAvg = previous.reduce((sum, point) => sum + point.averageIntensity, 0) / previous.length;
  
  return recentAvg - previousAvg;
}

function generateInsights(_timePoints: any[], overallTrend: string, moodStability: number): any[] {
  const insights = [];
  
  if (overallTrend === 'declining') {
    insights.push({
      type: 'negative',
      message: '最近情绪状态有下降趋势',
      severity: 'medium',
      suggestions: ['适当调整作息', '增加户外活动', '与朋友交流']
    });
  }
  
  if (moodStability < 0.5) {
    insights.push({
      type: 'neutral',
      message: '情绪波动较大',
      severity: 'low',
      suggestions: ['尝试冥想练习', '保持规律作息']
    });
  }
  
  return insights;
}

function generateDailySummary(emotions: EmotionInfo[]): string {
  if (emotions.length === 0) return '今日无情绪记录';
  
  const dominant = findDominantEmotion(emotions);
  const avgIntensity = calculateAverageIntensity(emotions);
  const emotionChinese = getEmotionChinese(dominant);
  
  return `主要情绪：${emotionChinese}，平均强度：${avgIntensity.toFixed(1)}`;
}

function calculateMoodStabilityFromAggregations(aggregations: EmotionAggregation[]): number {
  if (aggregations.length === 0) return 1;
  
  const intensities = aggregations.map(agg => agg.averageIntensity);
  const mean = intensities.reduce((sum, val) => sum + val, 0) / intensities.length;
  const variance = intensities.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intensities.length;
  
  return variance > 0 ? Math.min(1, 1 / (variance * 10)) : 1;
}

function calculatePositivityRatioFromAggregations(aggregations: EmotionAggregation[]): number {
  const totalCount = aggregations.reduce((sum, agg) => sum + agg.count, 0);
  if (totalCount === 0) return 0;
  
  const positiveCount = aggregations
    .filter(agg => agg.category === 'active' || ['happiness', 'joy', 'satisfaction', 'hope', 'excitement', 'confidence'].includes(agg.emotion))
    .reduce((sum, agg) => sum + agg.count, 0);
  
  return positiveCount / totalCount;
}

// 导出store和相关类型
export type { EmotionAnalysisStore };
export { ALGORITHM_CONFIG }; 