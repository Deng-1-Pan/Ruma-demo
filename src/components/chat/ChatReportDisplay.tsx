import React, { useMemo } from 'react';
import { Card, Typography, Row, Col, Space, Divider } from 'antd';
import { HeartOutlined, BulbOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import EmotionDistribution from '../visualization/EmotionDistribution';
import InteractiveEmotionGraph from '../visualization/InteractiveEmotionGraph';
import type { EmotionGraphNode, EmotionGraphEdge } from '../../types/emotion';
import './ChatReportDisplay.css';

const { Title, Text } = Typography;

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

interface ChatReportDisplayProps {
  report: ChatEmotionReport;
  className?: string;
}

const ChatReportDisplay: React.FC<ChatReportDisplayProps> = ({
  report,
  className
}) => {
  // 转换情绪分布数据为EmotionDistribution组件所需格式
  const emotionDistributionData = useMemo(() => {
    const distribution: Record<string, number> = {};
    
    // 从detected_emotions计算分布
    if (report.detected_emotions) {
      report.detected_emotions.forEach((emotionInfo) => {
        const emotion = emotionInfo.emotion;
        distribution[emotion] = (distribution[emotion] || 0) + 1;
      });
    }
    
    return distribution;
  }, [report]);

  // 转换情绪图谱数据为InteractiveEmotionGraph组件所需格式
  const knowledgeGraphData = useMemo(() => {
    // 基于detected_emotions生成简单的知识图谱
    const nodes: EmotionGraphNode[] = [];
    const edges: EmotionGraphEdge[] = [];
    
    // 为每个检测到的情绪创建节点
    if (report.detected_emotions) {
      report.detected_emotions.forEach((emotionInfo, index) => {
        // 情绪节点
        nodes.push({
          id: `emotion_${emotionInfo.emotion}`,
          type: 'emotion',
          label: emotionInfo.emotion_cn || emotionInfo.emotion,
          emotion: emotionInfo.emotion as any,
          weight: emotionInfo.intensity / 100 || 0.5,
          color: '#1890ff',
          size: 30 + (emotionInfo.intensity / 100 || 0.5) * 20,
          intensity: emotionInfo.intensity / 100
        });
        
        // 原因节点
        if (emotionInfo.causes && emotionInfo.causes.length > 0) {
          emotionInfo.causes.forEach((causeInfo, causeIndex) => {
            const causeId = `cause_${index}_${causeIndex}`;
            nodes.push({
              id: causeId,
              type: 'cause',
              label: causeInfo.cause,
              weight: 0.3,
              color: '#52c41a',
              size: 15,
              description: causeInfo.description
            });
            
            // 创建原因到情绪的边
            edges.push({
              source: causeId,
              target: `emotion_${emotionInfo.emotion}`,
              relationship: 'causes',
              weight: 0.5,
              color: '#d9d9d9',
              width: 2
            });
          });
        }
      });
    }
    
    return {
      nodes,
      edges,
      statistics: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        dominantCauses: [],
        emotionNodeCount: nodes.filter(n => n.type === 'emotion').length,
        causeNodeCount: nodes.filter(n => n.type === 'cause').length,
        avgConnections: edges.length / Math.max(nodes.length, 1),
        maxWeight: Math.max(...nodes.map(n => n.weight), 0),
        strongestConnections: [],
        clusters: []
      }
    };
  }, [report]);

  return (
    <div className={`chat-report-display ${className || ''}`}>
      <Card
        className="report-card"
        title={
          <div className="report-header">
            <Space align="center">
              <HeartOutlined className="report-icon" />
              <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
                💝 本次聊天情绪分析报告
              </Title>
            </Space>
          </div>
        }
        bordered={false}
      >
        {/* 聊天总结 */}
        {report.summary && (
          <div className="summary-section">
                         <Title level={5} className="section-title">
               <BulbOutlined /> 聊天总结
             </Title>
            <Card size="small" className="summary-card">
              <div className="summary-text">
                <ReactMarkdown>{report.summary}</ReactMarkdown>
              </div>
            </Card>
            <Divider />
          </div>
        )}

        {/* 情绪分布和图谱 */}
        <Row gutter={[24, 24]}>
          {/* 情绪分布饼图 */}
          <Col xs={24} lg={12}>
            <div className="chart-section">
              <Title level={5} className="section-title">
                📊 情绪分布分析
              </Title>
              <EmotionDistribution
                data={emotionDistributionData}
                title=""
                height={350}
                showStats={true}
                showControls={false}
                useOSSData={false}
                showLegend={false}
              />
            </div>
          </Col>

          {/* 情绪知识图谱 */}
          <Col xs={24} lg={12}>
            <div className="chart-section">
              <Title level={5} className="section-title">
                🧠 情绪关联图谱
              </Title>
              <InteractiveEmotionGraph
                data={knowledgeGraphData}
                title=""
                height={350}
                width={400}
              />
            </div>
          </Col>
        </Row>

        {/* 原因分析 */}
        {report.detected_emotions && report.detected_emotions.some(e => e.causes.length > 0) && (
          <>
            <Divider />
            <div className="causes-section">
              <Title level={5} className="section-title">
                🔍 情绪原因分析
              </Title>
              <div className="causes-list">
                {report.detected_emotions.map((emotionInfo, index) => 
                  emotionInfo.causes.map((causeInfo, causeIndex) => (
                    <Card key={`${index}_${causeIndex}`} size="small" className="cause-card">
                      <Text strong>{emotionInfo.emotion_cn || emotionInfo.emotion}：</Text>
                      <Text>{causeInfo.cause} - {causeInfo.description}</Text>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default ChatReportDisplay; 