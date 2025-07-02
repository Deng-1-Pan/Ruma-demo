import React, { useMemo, useState, useEffect } from 'react';
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
  // 响应式检测
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    // 初始检测
    checkMobile();
    
    // 监听窗口大小变化
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
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
              <HeartOutlined className="report-icon" style={{ fontSize: isMobile ? '18px' : '20px' }} />
              <Title level={4} style={{ 
                margin: 0, 
                color: '#1890ff',
                fontSize: isMobile ? '18px' : '20px'
              }}>
                💝 {isMobile ? '聊天情绪分析' : '本次聊天情绪分析报告'}
              </Title>
            </Space>
          </div>
        }
        bordered={false}
      >
        {/* 聊天总结 */}
        {report.summary && (
          <div className="summary-section" style={{ marginBottom: isMobile ? '16px' : '24px' }}>
            <Title level={5} className="section-title" style={{ fontSize: isMobile ? '16px' : '18px', marginBottom: isMobile ? '12px' : '16px' }}>
              <BulbOutlined /> 聊天总结
            </Title>
            <Card size="small" className="summary-card">
              <div className="summary-text" style={{ 
                fontSize: isMobile ? '14px' : '15px',
                lineHeight: isMobile ? '1.5' : '1.6',
                padding: isMobile ? '4px 0' : '8px 0'
              }}>
                <ReactMarkdown>{report.summary}</ReactMarkdown>
              </div>
            </Card>
            <Divider style={{ margin: isMobile ? '16px 0' : '24px 0' }} />
          </div>
        )}

        {/* 情绪分布和图谱 */}
        <Row gutter={[isMobile ? 16 : 24, isMobile ? 16 : 24]} style={{ marginBottom: isMobile ? '32px' : '16px' }}>
          {/* 情绪分布饼图 */}
          <Col xs={24} lg={12}>
            <div className="chart-section">
              <Title level={5} className="section-title" style={{ fontSize: isMobile ? '16px' : '18px' }}>
                📊 情绪分布分析
              </Title>
              <EmotionDistribution
                data={emotionDistributionData}
                title=""
                height={isMobile ? 550 : 350}
                showStats={true}
                showControls={false}
                useOSSData={false}
                showLegend={false}
              />
            </div>
          </Col>

          {/* 情绪知识图谱 */}
          <Col xs={24} lg={12}>
            <div className="chart-section" style={{ marginBottom: isMobile ? '24px' : '0px' }}>
              <Title level={5} className="section-title" style={{ fontSize: isMobile ? '16px' : '18px' }}>
                🧠 情绪关联图谱
              </Title>
              <InteractiveEmotionGraph
                data={knowledgeGraphData}
                title=""
                height={isMobile ? 300 : 350}
                width={isMobile ? undefined : 400}
              />
            </div>
          </Col>
        </Row>

        {/* 原因分析 */}
        {report.detected_emotions && report.detected_emotions.some(e => e.causes.length > 0) && (
          <>
            <Divider style={{ margin: isMobile ? '32px 0' : '16px 0' }} />
            <div className="causes-section" style={{ 
              marginTop: isMobile ? '24px' : '0px',
              paddingBottom: isMobile ? '24px' : '16px'
            }}>
              <Title level={5} className="section-title" style={{ 
                fontSize: isMobile ? '16px' : '18px',
                marginBottom: isMobile ? '16px' : '12px'
              }}>
                🔍 情绪原因分析
              </Title>
              <div style={{ 
                display: 'flex',
                flexDirection: 'column',
                gap: isMobile ? '8px' : '6px',
                maxHeight: isMobile ? '280px' : '180px',
                overflowY: 'auto',
                padding: '2px',
                border: isMobile ? '1px solid #f0f0f0' : 'none',
                borderRadius: isMobile ? '8px' : '0px'
              }}>
                {report.detected_emotions.map((emotionInfo, index) => 
                  emotionInfo.causes.map((causeInfo, causeIndex) => (
                    <div 
                      key={`${index}_${causeIndex}`} 
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        padding: isMobile ? '10px 12px' : '8px 12px',
                        backgroundColor: '#fafafa',
                        borderRadius: '8px',
                        borderLeft: '4px solid #1890ff',
                        gap: isMobile ? '8px' : '6px'
                      }}
                    >
                      <div style={{
                        backgroundColor: '#1890ff',
                        color: 'white',
                        borderRadius: '50%',
                        width: isMobile ? '20px' : '18px',
                        height: isMobile ? '20px' : '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: isMobile ? '12px' : '10px',
                        fontWeight: 'bold',
                        flexShrink: 0,
                        marginTop: '2px'
                      }}>
                        {index + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: 'bold',
                          color: '#1890ff',
                          fontSize: isMobile ? '14px' : '13px',
                          marginBottom: '4px',
                          lineHeight: '1.3'
                        }}>
                          {emotionInfo.emotion_cn || emotionInfo.emotion}
                        </div>
                        <div style={{
                          fontSize: isMobile ? '13px' : '12px',
                          color: '#333',
                          lineHeight: '1.4',
                          marginBottom: '2px'
                        }}>
                          <Text strong style={{ color: '#666' }}>原因：</Text>
                          {causeInfo.cause}
                        </div>
                        <div style={{
                          fontSize: isMobile ? '12px' : '11px',
                          color: '#666',
                          lineHeight: '1.4'
                        }}>
                          <Text strong style={{ color: '#999' }}>说明：</Text>
                          {causeInfo.description}
                        </div>
                      </div>
                    </div>
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