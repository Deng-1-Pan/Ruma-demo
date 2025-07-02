import React, { useMemo, useState } from 'react';
import { Calendar, Tooltip, Card, Typography, Badge } from 'antd';
import type { Dayjs } from 'dayjs';
import { CalendarEmotionData } from '../../types/emotion';
import { EMOTION_COLORS, EMOTION_CHINESE_MAP } from '../../stores/emotionAnalysisStore';

const { Title } = Typography;

interface EmotionCalendarProps {
  data: CalendarEmotionData[];
  title?: string;
  size?: 'small' | 'medium' | 'large';
  onDateSelect?: (date: string, emotions: CalendarEmotionData) => void;
  className?: string;
}

// 响应式尺寸配置 (基于创意设计)
const CELL_SIZE_CONFIG = {
  small: { width: 32, height: 32, dotSize: 6 },
  medium: { width: 36, height: 36, dotSize: 7 },
  large: { width: 40, height: 40, dotSize: 8 }
};

// 情绪强度到透明度映射
const INTENSITY_OPACITY_MAP = {
  high: 1.0,
  medium: 0.7,
  low: 0.4
};

const EmotionCalendar: React.FC<EmotionCalendarProps> = ({
  data,
  title = '情绪日历',
  size = 'medium',
  onDateSelect,
  className
}) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // 将数据转换为日期索引的Map
  const emotionDataMap = useMemo(() => {
    const map = new Map<string, CalendarEmotionData>();
    data.forEach(item => {
      map.set(item.date, item);
    });
    return map;
  }, [data]);

  // 获取指定日期的情绪数据
  const getDateEmotions = (date: Dayjs): CalendarEmotionData | null => {
    const dateStr = date.format('YYYY-MM-DD');
    return emotionDataMap.get(dateStr) || null;
  };

  // 获取情绪强度等级
  const getIntensityLevel = (intensity: number): 'low' | 'medium' | 'high' => {
    if (intensity >= 70) return 'high';
    if (intensity >= 40) return 'medium';
    return 'low';
  };

  // 生成情绪圆点指示器
  const renderEmotionDots = (emotions: CalendarEmotionData['emotions']): React.ReactNode => {
    if (!emotions || emotions.length === 0) return null;

    const config = CELL_SIZE_CONFIG[size];
    
    // 最多显示3个主要情绪
    const topEmotions = emotions
      .sort((a, b) => b.intensity - a.intensity)
      .slice(0, 3);

    return (
      <div 
        className="emotion-dots"
        style={{
          position: 'absolute',
          top: 2,
          right: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 1
        }}
      >
        {topEmotions.map((emotion, index) => {
          const intensityLevel = getIntensityLevel(emotion.intensity);
          const opacity = INTENSITY_OPACITY_MAP[intensityLevel];
          
          return (
            <div
              key={`${emotion.emotion}-${index}`}
              style={{
                width: config.dotSize,
                height: config.dotSize,
                borderRadius: '50%',
                backgroundColor: emotion.color,
                opacity,
                border: '1px solid rgba(255, 255, 255, 0.8)',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
              }}
            />
          );
        })}
      </div>
    );
  };

  // 生成工具提示内容
  const renderTooltipContent = (emotions: CalendarEmotionData): React.ReactNode => {
    const { emotions: emotionList, dominantEmotion, recordCount, summary } = emotions;
    
    return (
      <div style={{ minWidth: 200 }}>
        <div style={{ marginBottom: 8 }}>
          <strong>日期：{emotions.date}</strong>
        </div>
        
        <div style={{ marginBottom: 8 }}>
          <span>记录数量：</span>
          <Badge count={recordCount} style={{ backgroundColor: '#52c41a' }} />
        </div>
        
        <div style={{ marginBottom: 8 }}>
          <span>主要情绪：</span>
          <span 
            style={{ 
              color: EMOTION_COLORS[dominantEmotion],
              fontWeight: 'bold',
              textShadow: '0px 0px 1px rgba(0,0,0,0.3)',
              backgroundColor: 'rgba(255,255,255,0.7)',
              padding: '0 4px',
              borderRadius: '2px'
            }}
          >
            {getEmotionChinese(dominantEmotion)}
          </span>
        </div>
        
        {emotionList && emotionList.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ marginBottom: 4 }}>情绪详情：</div>
            {emotionList.slice(0, 5).map((emotion, index) => (
              <div 
                key={index}
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  marginBottom: 2
                }}
              >
                <span style={{ 
                  color: emotion.color,
                  textShadow: '0px 0px 1px rgba(0,0,0,0.3)',
                  fontWeight: 500,
                  backgroundColor: 'rgba(255,255,255,0.7)',
                  padding: '0 4px',
                  borderRadius: '2px'
                }}>
                  {getEmotionChinese(emotion.emotion)}
                </span>
                <span>{emotion.intensity.toFixed(1)}</span>
              </div>
            ))}
            {emotionList.length > 5 && (
              <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                还有 {emotionList.length - 5} 个情绪...
              </div>
            )}
          </div>
        )}
        
        {summary && (
          <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
            {summary}
          </div>
        )}
      </div>
    );
  };

  // 自定义日期单元格渲染
  const dateCellRender = (date: Dayjs) => {
    const emotions = getDateEmotions(date);
    const dateStr = date.format('YYYY-MM-DD');
    const isSelected = selectedDate === dateStr;
    const config = CELL_SIZE_CONFIG[size];
    
    if (!emotions || emotions.recordCount === 0) {
      return (
        <div 
          style={{
            width: config.width,
            height: config.height,
            position: 'relative'
          }}
        />
      );
    }

    const cellContent = (
      <div
        className={`emotion-calendar-cell ${isSelected ? 'selected' : ''}`}
        style={{
          width: config.width,
          height: config.height,
          position: 'relative',
          borderRadius: 4,
          border: isSelected ? '2px solid #1890ff' : '1px solid #d9d9d9',
          backgroundColor: isSelected ? '#e6f7ff' : '#fff',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isSelected ? '0 0 0 2px rgba(24, 144, 255, 0.2)' : 'none'
        }}
        onClick={() => {
          setSelectedDate(dateStr);
          onDateSelect?.(dateStr, emotions);
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.borderColor = '#40a9ff';
          e.currentTarget.style.backgroundColor = isSelected ? '#e6f7ff' : '#f0f9ff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.borderColor = isSelected ? '#1890ff' : '#d9d9d9';
          e.currentTarget.style.backgroundColor = isSelected ? '#e6f7ff' : '#fff';
        }}
      >
        {renderEmotionDots(emotions.emotions)}
        
        {/* 记录数量指示器 */}
        {emotions.recordCount > 0 && (
          <div 
            style={{
              position: 'absolute',
              bottom: 2,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '10px',
              color: '#666',
              fontWeight: 'bold'
            }}
          >
            {emotions.recordCount}
          </div>
        )}
      </div>
    );

    return (
      <Tooltip
        title={renderTooltipContent(emotions)}
        placement="top"
        overlayClassName="emotion-calendar-tooltip"
      >
        {cellContent}
      </Tooltip>
    );
  };

  // 生成日历头部月份切换
  const headerRender = ({ value, onChange }: any) => {
    const start = 0;
    const end = 12;
    const monthOptions = [];

    const localeData = value.localeData();
    const months = [];
    for (let i = 0; i < 12; i++) {
      // 🔧 修复：每次创建新的dayjs对象，而不是修改同一个对象
      const monthInstance = value.clone().month(i);
      months.push(localeData.monthsShort(monthInstance));
    }

    for (let i = start; i < end; i++) {
      monthOptions.push(
        <option key={i} value={i} className="month-item">
          {months[i]}
        </option>
      );
    }

    const year = value.year();
    const month = value.month();
    const options = [];
    for (let i = year - 10; i < year + 10; i += 1) {
      options.push(
        <option key={i} value={i} className="year-item">
          {i}
        </option>
      );
    }

    return (
      <div style={{ padding: 8, display: 'flex', justifyContent: 'center', gap: 8 }}>
        <select
          size={1}
          value={year}
          onChange={(e) => {
            const newValue = value.clone().year(parseInt(e.target.value, 10));
            onChange(newValue);
          }}
          style={{ 
            padding: '4px 8px',
            border: '1px solid #d9d9d9',
            borderRadius: 4,
            backgroundColor: '#fff'
          }}
        >
          {options}
        </select>
        
        <select
          size={1}
          value={month}
          onChange={(e) => {
            const newValue = value.clone().month(parseInt(e.target.value, 10));
            onChange(newValue);
          }}
          style={{ 
            padding: '4px 8px',
            border: '1px solid #d9d9d9',
            borderRadius: 4,
            backgroundColor: '#fff'
          }}
        >
          {monthOptions}
        </select>
      </div>
    );
  };

  return (
    <Card 
      className={className}
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>
            {title}
          </Title>
          
          {/* 图例 */}
          <div style={{ display: 'flex', gap: 16, fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div 
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: '#52c41a',
                  opacity: 0.4
                }}
              />
              <span>低强度</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div 
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: '#52c41a',
                  opacity: 0.7
                }}
              />
              <span>中强度</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div 
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: '#52c41a',
                  opacity: 1.0
                }}
              />
              <span>高强度</span>
            </div>
          </div>
        </div>
      }
      style={{ width: '100%' }}
    >
      <style>
        {`
          .ant-tooltip.emotion-calendar-tooltip .ant-tooltip-inner {
            background-color: #ffffff;
            color: rgba(0, 0, 0, 0.85);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          }
          
          .ant-tooltip.emotion-calendar-tooltip .ant-tooltip-arrow-content {
            background-color: #ffffff;
          }
          
          .ant-picker-calendar-date-content {
            height: auto !important;
          }
          
          .ant-picker-cell {
            padding: 2px !important;
          }
          
          .ant-picker-cell-inner {
            padding: 0 !important;
            height: auto !important;
            line-height: normal !important;
          }
        `}
      </style>
      
      <Calendar
        dateCellRender={dateCellRender}
        headerRender={headerRender}
        mode="month"
        style={{ 
          width: '100%',
          minHeight: size === 'small' ? 300 : size === 'medium' ? 350 : 400
        }}
      />
      
      {selectedDate && (
        <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
          <Typography.Text strong>
            已选择日期：{selectedDate}
          </Typography.Text>
          {emotionDataMap.get(selectedDate) && (
            <div style={{ marginTop: 8 }}>
              <Typography.Text>
                {emotionDataMap.get(selectedDate)!.summary || '暂无详细信息'}
              </Typography.Text>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

// 获取情绪的中文名称
const getEmotionChinese = (emotion: string): string => {
  return EMOTION_CHINESE_MAP[emotion] || EMOTION_CHINESE_MAP[emotion.toLowerCase()] || emotion;
};

export default EmotionCalendar; 