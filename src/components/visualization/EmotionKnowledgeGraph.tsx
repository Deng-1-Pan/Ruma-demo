import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Card, Typography, Switch, Slider, Empty, Input, Tag } from 'antd';
import { createPortal } from 'react-dom';
import * as d3 from 'd3';
import type { EmotionKnowledgeGraph, EmotionGraphNode, EmotionGraphEdge } from '../../types/emotion';
import { EMOTION_EMOJIS, EMOTION_CHINESE_MAP } from '../../stores/emotionAnalysisStore';
import '../../styles/components/EmotionKnowledgeGraph.css';

const { Title, Text } = Typography;
const { Search } = Input;

interface EmotionKnowledgeGraphProps {
  data: EmotionKnowledgeGraph;
  title?: string;
  width?: number;
  height?: number;
  className?: string;
}

// D3.js 力导向图的节点和边接口（扩展原始接口以支持D3布局）
interface D3Node extends EmotionGraphNode {
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
  index?: number;
}

interface D3Edge extends Omit<EmotionGraphEdge, 'source' | 'target'> {
  source: D3Node;
  target: D3Node;
  index?: number;
}

const EmotionKnowledgeGraph: React.FC<EmotionKnowledgeGraphProps> = ({
  data,
  title = '情绪关系图谱',
  // width = 900,  // 不再使用固定宽度，完全自适应
  // height = 650, // 不再使用固定高度，完全自适应
  className
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<D3Node, D3Edge> | null>(null);
  const containerRef = useRef<SVGGElement | null>(null);
  // 🎯 移除预计算的尺寸状态，完全依赖SVG真实渲染尺寸
  const [forceUpdate, setForceUpdate] = useState(0); // 用于触发重渲染
  
  // 交互状态
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLabels, setShowLabels] = useState(true);
  const [strengthThreshold, setStrengthThreshold] = useState(0.1);
  const [linkDistance, setLinkDistance] = useState(180);
  const [chargeStrength, setChargeStrength] = useState(-600);
  
  // Tooltip状态
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: any;
  }>({ visible: false, x: 0, y: 0, content: null });
  
  // 基础过滤数据（不包含搜索，避免重新创建图形）
  const baseFilteredData = useMemo(() => {
    if (!data.nodes || !data.edges) return { nodes: [], edges: [] };
    
    // 过滤强度过低的边
    const filteredEdges = data.edges.filter(edge => edge.weight >= strengthThreshold);
    
    // 获取相关节点ID
    const relevantNodeIds = new Set<string>();
    filteredEdges.forEach(edge => {
      const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
      relevantNodeIds.add(sourceId);
      relevantNodeIds.add(targetId);
    });
    
    // 只过滤相关节点，不包含搜索过滤
    const filteredNodes = data.nodes.filter(node => relevantNodeIds.has(node.id));
    
    return { nodes: filteredNodes, edges: filteredEdges };
  }, [data, strengthThreshold]);

  // 搜索过滤数据（仅用于显示统计）
  const filteredData = useMemo(() => {
    if (!searchTerm) return baseFilteredData;
    
    const searchLower = searchTerm.toLowerCase();
    const filteredNodes = baseFilteredData.nodes.filter(node => 
      node.label.toLowerCase().includes(searchLower) ||
      (node.description && node.description.toLowerCase().includes(searchLower)) ||
      (node.emotion && EMOTION_CHINESE_MAP[node.emotion]?.toLowerCase().includes(searchLower))
    );
    
    return { nodes: filteredNodes, edges: baseFilteredData.edges };
  }, [baseFilteredData, searchTerm]);

  // 监听容器尺寸变化 - 简化版本，完全依赖CSS布局
  useEffect(() => {
    // 🎯 简化：当窗口大小变化时，触发重新渲染即可
    const handleResize = () => {
      console.log('🔄 窗口尺寸变化，触发重新渲染');
      setForceUpdate(prev => prev + 1);
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 初始化和更新D3力导向图 - 完全依赖CSS布局
  useEffect(() => {
    // 🛡️ 确保SVG存在且有数据
    if (!svgRef.current || baseFilteredData.nodes.length === 0) {
      console.log('⏳ 等待SVG元素或数据加载...');
      return;
    }

    // 🎯 让CSS完全控制SVG尺寸，D3不设置任何尺寸属性
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // 清除之前的内容
    
    console.log('🎨 [D3 Rendering] 使用CSS控制的SVG尺寸渲染');

    // 🚀 创建主容器组 - 不设置transform，让内容自然布局
    const container = svg.append('g').attr('class', 'graph-container');
    containerRef.current = container.node();

    // 添加缩放行为
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });
    
    svg.call(zoom);
    
    // 🎯 简化数据准备 - 使用默认的随机分布
    const nodes: D3Node[] = baseFilteredData.nodes.map(node => ({
      ...node,
      x: node.x || (Math.random() - 0.5) * 800,
      y: node.y || (Math.random() - 0.5) * 600
    }));

    const edges: D3Edge[] = baseFilteredData.edges.map(edge => ({
      ...edge,
      source: nodes.find(n => n.id === (typeof edge.source === 'string' ? edge.source : edge.source.id))!,
      target: nodes.find(n => n.id === (typeof edge.target === 'string' ? edge.target : edge.target.id))!
    })).filter(edge => edge.source && edge.target);

    // 🎯 创建分层力模拟系统
    const simulation = d3.forceSimulation<D3Node>(nodes)
      .force('link', d3.forceLink<D3Node, D3Edge>(edges)
        .id(d => d.id)
        .distance((link: any) => {
          // 根据节点类型设置不同的连接距离
          const source = link.source as D3Node;
          const target = link.target as D3Node;
          
          // 如果是情绪节点到原因节点的连接，使用较短距离（轨道半径）
          if (source.type !== target.type) {
            return linkDistance * 0.6; // 子节点更靠近主节点
          }
          // 如果是同类型节点之间的连接，使用较长距离
          return linkDistance * 2;
        })
        .strength((link: any) => {
          const source = link.source as D3Node;
          const target = link.target as D3Node;
          
          // 情绪-原因连接更强，确保子节点围绕主节点
          if (source.type !== target.type) {
            return 0.8;
          }
          // 同类型连接较弱
          return 0.1;
        })
      )
      .force('charge', d3.forceManyBody()
        .strength((d: any) => {
          // 情绪节点（主节点）之间有更强的斥力
          if (d.type === 'emotion') {
            return chargeStrength * 2; // 双倍斥力
          }
          // 原因节点（子节点）之间的斥力较小
          return chargeStrength * 0.3;
        })
      )
      .force('collision', d3.forceCollide()
        .radius((d: any) => {
          // 情绪节点有更大的碰撞半径，确保它们之间保持距离
          if (d.type === 'emotion') {
            return d.size * 0.6;  // 进一步调小碰撞半径
          }
          return d.size * 0.5;  // 进一步调小碰撞半径
        })
        .strength(0.8)
      )
      // 添加径向力，让原因节点围绕其连接的情绪节点
      .force('radial', d3.forceRadial(
        (d: any) => {
          // 只对原因节点应用径向力
          if (d.type === 'cause') {
            // 找到该原因节点连接的情绪节点
            const connectedEmotions = edges
              .filter(e => 
                (e.source.id === d.id && e.target.type === 'emotion') ||
                (e.target.id === d.id && e.source.type === 'emotion')
              )
              .map(e => e.source.id === d.id ? e.target : e.source);
            
            if (connectedEmotions.length === 1) {
              // 如果只连接一个情绪节点，围绕它形成轨道
              return linkDistance * 0.7;
            } else if (connectedEmotions.length > 1) {
              // 如果连接多个情绪节点，位于中间位置
              return linkDistance * 0.5;
            }
          }
          return 0;
        },
        (d: any) => {
          // 设置径向力的中心点X坐标
          if (d.type === 'cause') {
            const connectedEmotions = edges
              .filter(e => 
                (e.source.id === d.id && e.target.type === 'emotion') ||
                (e.target.id === d.id && e.source.type === 'emotion')
              )
              .map(e => e.source.id === d.id ? e.target : e.source) as D3Node[];
            
            if (connectedEmotions.length > 0) {
              // 计算所有连接的情绪节点的中心位置
              return connectedEmotions.reduce((sum, node) => sum + (node.x || 0), 0) / connectedEmotions.length;
            }
          }
          return 0;
        },
        (d: any) => {
          // 设置径向力的中心点Y坐标
          if (d.type === 'cause') {
            const connectedEmotions = edges
              .filter(e => 
                (e.source.id === d.id && e.target.type === 'emotion') ||
                (e.target.id === d.id && e.source.type === 'emotion')
              )
              .map(e => e.source.id === d.id ? e.target : e.source) as D3Node[];
            
            if (connectedEmotions.length > 0) {
              return connectedEmotions.reduce((sum, node) => sum + (node.y || 0), 0) / connectedEmotions.length;
            }
          }
          return 0;
        }
      )
        .strength((d: any) => d.type === 'cause' ? 0.3 : 0)
      )
      .force('x', d3.forceX().strength(0.02))
      .force('y', d3.forceY().strength(0.02));

    simulationRef.current = simulation;

    // 渲染边（初始状态，不依赖交互状态）
    const link = container.selectAll('.link')
      .data(edges)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', d => d.color)
      .attr('stroke-width', d => d.width)
      .attr('stroke-opacity', 0.6)
      .style('cursor', 'pointer');

    // 渲染节点
    const node = container.selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer');

    // 节点圆形（初始状态，不依赖交互状态）
    node.append('circle')
      .attr('r', d => d.type === 'emotion' ? d.size * 0.4 : d.size * 0.35)  // 进一步调小节点的实际大小
      .attr('fill', d => d.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('opacity', 1);

    // 节点emoji（如果有）
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', d => Math.min(d.size * 0.25, 12))  // 调小emoji字体大小
      .text(d => {
        if (d.type === 'emotion' && d.emotion) {
          return EMOTION_EMOJIS[d.emotion] || '😐';
        }
        return d.type === 'cause' ? '📝' : '🔗';
      })
      .attr('pointer-events', 'none');

    // 节点标签（初始状态，不依赖交互状态）
    if (showLabels) {
      node.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', d => (d.type === 'emotion' ? d.size * 0.4 : d.size * 0.35) + 15)  // 调整标签位置
        .attr('font-size', '12px')
        .attr('font-weight', 'normal')
        .attr('fill', '#333')
        .text(d => d.label.length > 10 ? d.label.substring(0, 10) + '...' : d.label)
        .attr('pointer-events', 'none');
    }

    // 节点交互事件
    node
      .on('mouseover', (event, d) => {
        setHoveredNode(d.id);
        
        // 使用React state管理tooltip
        setTooltip({
          visible: true,
          x: event.pageX + 10,
          y: event.pageY - 10,
          content: (
            <div>
              <div><strong>{d.label}</strong></div>
              <div>类型: {d.type === 'emotion' ? '情绪' : '原因'}</div>
              <div>权重: {d.weight}</div>
              {d.intensity && <div>强度: {d.intensity.toFixed(1)}%</div>}
              {d.description && <div>{d.description}</div>}
            </div>
          )
        });
      })
      .on('mousemove', (event) => {
        setTooltip(prev => ({
          ...prev,
          x: event.pageX + 10,
          y: event.pageY - 10
        }));
      })
      .on('mouseout', () => {
        setHoveredNode(null);
        setTooltip({ visible: false, x: 0, y: 0, content: null });
      })
                      .on('click', (event, d) => {
          event.stopPropagation();
          setSelectedNode(selectedNode === d.id ? null : d.id);
      });

    // 拖拽行为 - 不重启simulation，避免所有节点乱动
    const drag = d3.drag<SVGGElement, D3Node>()
      .on('start', (_, d) => {
        // 不重启simulation，只固定当前节点
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (_, d) => {
        // 释放固定，让节点自然回到simulation控制
        d.fx = null;
        d.fy = null;
      });

    node.call(drag);

    // 点击空白区域取消选择
    svg.on('click', () => {
      setSelectedNode(null);
    });

    // 力模拟更新
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x!)
        .attr('y1', d => d.source.y!)
        .attr('x2', d => d.target.x!)
        .attr('y2', d => d.target.y!);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
      // 清理tooltip状态
      setTooltip({ visible: false, x: 0, y: 0, content: null });
    };
  }, [baseFilteredData, forceUpdate, showLabels, linkDistance, chargeStrength]);

  // 独立的样式更新useEffect，处理选中和悬停状态
  useEffect(() => {
    if (!containerRef.current) return;

    const container = d3.select(containerRef.current);
    
    // 更新节点样式
    container.selectAll('.node circle')
      .attr('fill', function(this: any) {
        const d = d3.select(this.parentNode).datum() as D3Node;
        if (selectedNode === d.id) return '#ff4d4f';
        if (hoveredNode === d.id) return '#ff7a45';
        return d.color;
      })
      .attr('opacity', function(this: any) {
        const d = d3.select(this.parentNode).datum() as D3Node;
        if (searchTerm && !d.label.toLowerCase().includes(searchTerm.toLowerCase())) {
          return 0.3;
        }
        return selectedNode && selectedNode !== d.id ? 0.6 : 1;
      });

    // 更新节点标签样式
    container.selectAll('.node text:last-child')
      .attr('font-weight', function(this: any) {
        const d = d3.select(this.parentNode).datum() as D3Node;
        return selectedNode === d.id ? 'bold' : 'normal';
      });

    // 更新边样式
    container.selectAll('.link')
      .attr('stroke', function(this: any) {
        const d = d3.select(this).datum() as D3Edge;
        if (selectedNode && (d.source.id === selectedNode || d.target.id === selectedNode)) {
          return '#ff4d4f';
        }
        if (hoveredNode && (d.source.id === hoveredNode || d.target.id === hoveredNode)) {
          return '#ff7a45';
        }
        return d.color;
      })
      .attr('stroke-opacity', function(this: any) {
        const d = d3.select(this).datum() as D3Edge;
        if (selectedNode && (d.source.id === selectedNode || d.target.id === selectedNode)) {
          return 0.8;
        }
        if (hoveredNode && (d.source.id === hoveredNode || d.target.id === hoveredNode)) {
          return 0.8;
        }
        return 0.6;
      });
  }, [selectedNode, hoveredNode, searchTerm]);

  // 获取选中节点的详细信息
  const selectedNodeInfo = useMemo(() => {
    if (!selectedNode) return null;
    return baseFilteredData.nodes.find(node => node.id === selectedNode);
  }, [selectedNode, baseFilteredData.nodes]);

  // 获取相关连接信息
  const relatedConnections = useMemo(() => {
    if (!selectedNode) return [];
    return baseFilteredData.edges.filter(edge => {
      const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
      return sourceId === selectedNode || targetId === selectedNode;
    });
  }, [selectedNode, baseFilteredData.edges]);

  // 如果没有数据，显示空状态
  if (!data.nodes || data.nodes.length === 0) {
    return (
      <Card className={`emotion-knowledge-graph ${className || ''}`} title={title}>
        <Empty 
          description="暂无情绪关系数据"
          style={{ padding: '60px 0' }}
        />
      </Card>
    );
  }

  return (
    <Card 
      className={`emotion-knowledge-graph ${className || ''}`}
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Title level={4} style={{ margin: 0 }}>
            {title}
          </Title>
          <div style={{ display: 'flex', gap: 16, fontSize: '12px', color: '#666' }}>
            <span>节点: {filteredData.nodes.length}</span>
            <span>连接: {filteredData.edges.length}</span>
          </div>
        </div>
      }
      style={{ 
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
      bodyStyle={{
        flex: 1,
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        overflow: 'hidden'
      }}
    >
      {/* 控制面板 */}
      <div style={{ 
        marginBottom: 16, 
        padding: 12, 
        background: '#fafafa', 
        borderRadius: 6,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
        alignItems: 'center',
        width: '100%'
      }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <Search
            placeholder="搜索情绪或原因..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
            size="small"
          />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: '12px' }}>显示标签</Text>
          <Switch
            size="small"
            checked={showLabels}
            onChange={setShowLabels}
          />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 150 }}>
          <Text style={{ fontSize: '12px' }}>强度阈值</Text>
          <Slider
            min={0}
            max={1}
            step={0.05}
            value={strengthThreshold}
            onChange={setStrengthThreshold}
            style={{ width: 80 }}
            tooltip={{ formatter: (value) => `${(value! * 100).toFixed(0)}%` }}
          />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
          <Text style={{ fontSize: '12px' }}>连接距离</Text>
          <Slider
            min={50}
            max={300}
            value={linkDistance}
            onChange={setLinkDistance}
            style={{ width: 80 }}
          />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
          <Text style={{ fontSize: '12px' }}>斥力强度</Text>
          <Slider
            min={-1000}
            max={-100}
            value={chargeStrength}
            onChange={setChargeStrength}
            style={{ width: 80 }}
          />
        </div>
      </div>

      {/* 图形区域容器 */}
      <div className="graph-container">
        {/* SVG图形区域 */}
        <div className="svg-container">
          <svg 
            ref={svgRef} 
            className="emotion-graph-svg"
          />
          
          {/* 操作提示 */}
          <div style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'rgba(0, 0, 0, 0.6)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: 4,
            fontSize: '11px',
            zIndex: 1,
            pointerEvents: 'none'
          }}>
            <div>🖱️ 点击选择 • 拖拽移动</div>
            <div>🔍 滚轮缩放 • 悬停查看详情</div>
          </div>
        </div>

        {/* 图例 */}
        <div style={{ 
          marginTop: 16, 
          display: 'flex', 
          gap: 24, 
          fontSize: '12px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          width: '100%'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ 
              width: 16, 
              height: 16, 
              borderRadius: '50%',
              backgroundColor: '#52c41a',
              border: '2px solid #fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '8px'
            }}>😊</div>
            <span>情绪节点</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ 
              width: 16, 
              height: 16, 
              borderRadius: '50%',
              backgroundColor: '#1890ff',
              border: '2px solid #fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '8px'
            }}>📝</div>
            <span>原因节点</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ 
              width: 20, 
              height: 2, 
              backgroundColor: '#d9d9d9'
            }} />
            <span>关联强度</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ 
              width: 16, 
              height: 16, 
              borderRadius: '50%',
              backgroundColor: '#ff4d4f',
              border: '2px solid #fff'
            }} />
            <span>已选择</span>
          </div>
        </div>
      </div>

      {/* React Portal管理的Tooltip */}
      {tooltip.visible && createPortal(
        <div
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '12px',
            pointerEvents: 'none',
            zIndex: 9999,
            maxWidth: '200px'
          }}
        >
          {tooltip.content}
        </div>,
        document.body
      )}

      {/* 选中节点详情 */}
      {selectedNodeInfo && (
        <div style={{ 
          marginTop: 16, 
          padding: 16, 
          background: '#f5f5f5', 
          borderRadius: 6,
          width: '100%'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <Title level={5} style={{ margin: 0 }}>
              {selectedNodeInfo.type === 'emotion' && selectedNodeInfo.emotion && EMOTION_EMOJIS[selectedNodeInfo.emotion]} 
              {selectedNodeInfo.label}
            </Title>
            <Tag color={selectedNodeInfo.type === 'emotion' ? 'green' : 'blue'}>
              {selectedNodeInfo.type === 'emotion' ? '情绪' : '原因'}
            </Tag>
            {selectedNodeInfo.intensity && (
              <Tag color="orange">强度: {selectedNodeInfo.intensity.toFixed(1)}%</Tag>
            )}
          </div>
          
          {selectedNodeInfo.description && (
            <div style={{ marginBottom: 12, color: '#666' }}>
              {selectedNodeInfo.description}
            </div>
          )}
          
          {relatedConnections.length > 0 && (
            <div>
              <Text style={{ fontSize: '12px', fontWeight: 'bold', color: '#333' }}>
                相关连接 ({relatedConnections.length}):
              </Text>
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {relatedConnections.slice(0, 10).map((connection, index) => {
                  const sourceId = typeof connection.source === 'string' ? connection.source : connection.source.id;
                  const targetId = typeof connection.target === 'string' ? connection.target : connection.target.id;
                  const otherNodeId = sourceId === selectedNode ? targetId : sourceId;
                  const otherNode = baseFilteredData.nodes.find(n => n.id === otherNodeId);
                  
                  return (
                    <Tag 
                      key={index}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedNode(otherNodeId)}
                    >
                      {otherNode?.label} ({(connection.weight * 100).toFixed(0)}%)
                    </Tag>
                  );
                })}
                {relatedConnections.length > 10 && (
                  <Text style={{ fontSize: '11px', color: '#8c8c8c' }}>
                    还有 {relatedConnections.length - 10} 个连接...
                  </Text>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default EmotionKnowledgeGraph; 