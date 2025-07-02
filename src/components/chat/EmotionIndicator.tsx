import React from 'react';
import { Tag, Tooltip } from 'antd';
import { SmileOutlined, FrownOutlined, MehOutlined, HeartOutlined } from '@ant-design/icons';
import { EmotionData } from '../../types';

interface EmotionIndicatorProps {
  emotion: EmotionData;
  size?: 'small' | 'default';
  showScore?: boolean;
}

const EmotionIndicator: React.FC<EmotionIndicatorProps> = ({ 
  emotion, 
  size = 'small', 
  showScore = false 
}) => {
  const getEmotionColor = (emotionType: string) => {
    switch (emotionType.toLowerCase()) {
      case 'positive':
      case 'happy':
      case 'joy':
        return 'var(--emotion-positive)';
      case 'negative':
      case 'sad':
      case 'angry':
        return 'var(--emotion-negative)';
      case 'excited':
      case 'enthusiastic':
        return 'var(--emotion-excited)';
      case 'calm':
      case 'peaceful':
        return 'var(--emotion-calm)';
      default:
        return 'var(--emotion-neutral)';
    }
  };

  const getEmotionIcon = (emotionType: string) => {
    switch (emotionType.toLowerCase()) {
      case 'positive':
      case 'happy':
      case 'joy':
        return <SmileOutlined />;
      case 'negative':
      case 'sad':
      case 'angry':
        return <FrownOutlined />;
      case 'excited':
      case 'enthusiastic':
        return <HeartOutlined />;
      default:
        return <MehOutlined />;
    }
  };

  const getEmotionText = (emotionType: string) => {
    const emotionMap: { [key: string]: string } = {
      'positive': '积极',
      'negative': '消极',
      'happy': '开心',
      'sad': '悲伤',
      'angry': '愤怒',
      'excited': '兴奋',
      'calm': '平静',
      'neutral': '中性'
    };
    return emotionMap[emotionType.toLowerCase()] || emotionType;
  };

  const emotionColor = getEmotionColor(emotion.primary);
  const emotionIcon = getEmotionIcon(emotion.primary);
  const emotionText = getEmotionText(emotion.primary);

  const tooltipContent = (
    <div>
      <div><strong>主要情绪:</strong> {emotionText}</div>
      <div><strong>强度:</strong> {(emotion.score * 100).toFixed(0)}%</div>
      <div><strong>置信度:</strong> {(emotion.confidence * 100).toFixed(0)}%</div>
      {emotion.secondary && emotion.secondary.length > 0 && (
        <div><strong>次要情绪:</strong> {emotion.secondary.map(getEmotionText).join(', ')}</div>
      )}
    </div>
  );

  return (
    <Tooltip title={tooltipContent} placement="top">
      <Tag
        icon={emotionIcon}
        color={emotionColor}
        style={{
          borderColor: emotionColor,
          fontSize: size === 'small' ? '11px' : '12px',
          margin: '0 4px 0 0',
          cursor: 'help'
        }}
      >
        {emotionText}
        {showScore && ` (${(emotion.score * 100).toFixed(0)}%)`}
      </Tag>
    </Tooltip>
  );
};

export default EmotionIndicator; 