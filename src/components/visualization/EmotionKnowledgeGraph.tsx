import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Card, Typography, Switch, Slider, Empty, Input, Tag } from 'antd';
import { createPortal } from 'react-dom';
import * as d3 from 'd3';
import type { EmotionKnowledgeGraph, EmotionGraphNode, EmotionGraphEdge } from '../../types/emotion';
import { EMOTION_EMOJIS, EMOTION_CHINESE_MAP } from '../../stores/emotionAnalysisStore';
import { useResponsive, getComponentResponsiveConfig } from '../../utils/responsiveUtils';
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
  className
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<D3Node, D3Edge> | null>(null);
  const containerRef = useRef<SVGGElement | null>(null);
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // 🎯 使用响应式工具
  const { deviceType, isMobile } = useResponsive();
  const componentConfig = getComponentResponsiveConfig(deviceType);
  
  // 🎯 根据设备类型计算响应式参数
  const responsiveParams = useMemo(() => {
    // 🚀 强制检测移动端 - 多重判断
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const isTrulyMobile = screenWidth < 768 || isMobile || /Mobi|Android/i.test(navigator.userAgent);
    
    console.log('📱 [Debug] 设备检测:', {
      screenWidth,
      isMobile,
      isTrulyMobile,
      deviceType,
      userAgent: navigator.userAgent
    });
    
    // 移动端使用固定的极小尺寸但松散布局
    if (isTrulyMobile) {
      console.log('📱 [Debug] 使用移动端松散布局参数');
      return {
        // 节点相关 - 移动端极小尺寸
        emotionNodeRadius: 3,    // 更小3px半径
        causeNodeRadius: 2,      // 更小2px半径
        emojiFontSize: 8,        // 稍大字体保持可见
        labelFontSize: 6,        // 极小标签
        labelOffset: 8,          // 极小偏移
        
        // 碰撞检测 - 松散布局
        emotionCollisionRadius: 12,  // 增加碰撞半径，避免重叠
        causeCollisionRadius: 10,    // 增加碰撞半径
        
        // 力学参数 - 松散但稳定布局
        linkDistance: 50,        // 增加连接距离，更松散
        chargeStrength: -150,    // 增加斥力，推开节点
        
        // 显示控制
        showLabels: false,       // 移动端强制隐藏标签
        enableDrag: false        // 移动端禁用拖拽
      };
    }
    
    // 其他设备使用相对计算
    const baseNodeSize = componentConfig.knowledgeGraph.nodeSize;
    const scaleFactor = deviceType === 'tablet' ? 0.6 : 1;
    
    return {
      // 节点相关
      emotionNodeRadius: baseNodeSize * 0.4 * scaleFactor,
      causeNodeRadius: baseNodeSize * 0.35 * scaleFactor,
      emojiFontSize: Math.min(baseNodeSize * 0.25 * scaleFactor, 12),
      labelFontSize: 12,
      labelOffset: baseNodeSize * 0.5 * scaleFactor + 15,
      
      // 碰撞检测
      emotionCollisionRadius: baseNodeSize * 0.25 * scaleFactor,
      causeCollisionRadius: baseNodeSize * 0.2 * scaleFactor,
      
      // 力学参数
      linkDistance: deviceType === 'tablet' ? 100 : 180,
      chargeStrength: deviceType === 'tablet' ? -300 : -600,
      
      // 显示控制
      showLabels: componentConfig.knowledgeGraph.showLabels,
      enableDrag: componentConfig.knowledgeGraph.enableDrag
    };
  }, [deviceType, isMobile, componentConfig]);
  
  // 统一的移动端检测
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const isTrulyMobile = screenWidth < 768 || isMobile || /Mobi|Android/i.test(navigator.userAgent);
  
  // 交互状态
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLabels, setShowLabels] = useState(isTrulyMobile ? false : responsiveParams.showLabels);
  const [strengthThreshold, setStrengthThreshold] = useState(0.1);
  const [linkDistance, setLinkDistance] = useState(responsiveParams.linkDistance);
  const [chargeStrength, setChargeStrength] = useState(responsiveParams.chargeStrength);
  
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

  // 监听容器尺寸变化和响应式参数同步
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

  // 同步响应式参数到控制状态
  useEffect(() => {
    setShowLabels(isTrulyMobile ? false : responsiveParams.showLabels);
    setLinkDistance(responsiveParams.linkDistance);
    setChargeStrength(responsiveParams.chargeStrength);
  }, [isTrulyMobile, responsiveParams.showLabels, responsiveParams.linkDistance, responsiveParams.chargeStrength]);

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

    // 🎯 创建稳定的力模拟系统 - 针对移动端优化
    const simulation = d3.forceSimulation<D3Node>(nodes)
      .force('link', d3.forceLink<D3Node, D3Edge>(edges)
        .id(d => d.id)
        .distance(responsiveParams.linkDistance)
        .strength(0.5) // 降低连接强度，减少振荡
      )
      .force('charge', d3.forceManyBody()
        .strength(responsiveParams.chargeStrength)
        .distanceMin(isTrulyMobile ? 5 : 10) // 设置最小距离避免奇点
        .distanceMax(isTrulyMobile ? 100 : 200) // 限制作用范围
      )
      .force('collision', d3.forceCollide()
        .radius((d: any) => {
          // 使用响应式碰撞半径
          if (d.type === 'emotion') {
            return responsiveParams.emotionCollisionRadius;
          }
          return responsiveParams.causeCollisionRadius;
        })
        .strength(0.9) // 增强碰撞检测
        .iterations(2) // 多次迭代提高精度
      )
      // 添加弱居中力，保持图形在视图中心但允许松散分布
      .force('x', d3.forceX().strength(isTrulyMobile ? 0.02 : 0.05))
      .force('y', d3.forceY().strength(isTrulyMobile ? 0.02 : 0.05))
      // 🎯 快速收敛设置
      .alpha(1) // 初始能量
      .alphaDecay(isTrulyMobile ? 0.05 : 0.02) // 移动端更快衰减
      .alphaMin(0.01) // 更早停止
      .velocityDecay(0.6); // 增加阻尼

    simulationRef.current = simulation;

    // 渲染边（使用响应式宽度）
    const link = container.selectAll('.link')
      .data(edges)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', d => d.color)
      .attr('stroke-width', d => isTrulyMobile ? Math.max(d.width * 0.5, 1) : d.width) // 移动端边更细
      .attr('stroke-opacity', 0.6)
      .style('cursor', 'pointer');

    // 渲染节点
    const node = container.selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer');

    // 节点圆形（使用响应式参数）
          console.log('🎨 [Debug] 渲染节点，参数:', {
        emotionNodeRadius: responsiveParams.emotionNodeRadius,
        causeNodeRadius: responsiveParams.causeNodeRadius,
        isMobile,
        isTrulyMobile,
        nodesCount: nodes.length
      });
    
    node.append('circle')
      .attr('r', d => {
        const radius = d.type === 'emotion' ? responsiveParams.emotionNodeRadius : responsiveParams.causeNodeRadius;
        console.log(`🔵 [Debug] 节点 ${d.id} (${d.type}) 半径: ${radius}px`);
        return radius;
      })
      .attr('fill', d => d.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', isTrulyMobile ? 1 : 2)
      .attr('opacity', 1);

    // 节点emoji（使用响应式字体大小）
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', responsiveParams.emojiFontSize)
      .text(d => {
        if (d.type === 'emotion' && d.emotion) {
          return EMOTION_EMOJIS[d.emotion] || '😐';
        }
        return d.type === 'cause' ? '📝' : '🔗';
      })
      .attr('pointer-events', 'none');

    // 节点标签（使用响应式参数）
    if (showLabels) {
      node.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', responsiveParams.labelOffset)
        .attr('font-size', `${responsiveParams.labelFontSize}px`)
        .attr('font-weight', 'normal')
        .attr('fill', '#333')
        .text(d => {
          const maxLength = isTrulyMobile ? 3 : 10;
          return d.label.length > maxLength ? d.label.substring(0, maxLength) + '...' : d.label;
        })
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

    // 拖拽行为 - 根据设备类型决定是否启用
    if (responsiveParams.enableDrag) {
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
    }

    // 点击空白区域取消选择
    svg.on('click', () => {
      setSelectedNode(null);
    });

    // 🎯 力模拟更新 - 添加稳定性控制
    let tickCount = 0;
    const maxTicks = isTrulyMobile ? 300 : 500; // 移动端更快停止
    
    simulation.on('tick', () => {
      tickCount++;
      
      // 强制停止条件
      if (tickCount > maxTicks || simulation.alpha() < 0.005) {
        simulation.stop();
      }
      
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
  }, [baseFilteredData, forceUpdate, showLabels, linkDistance, chargeStrength, responsiveParams]);

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
      {/* 控制面板 - 响应式布局 */}
      <div style={{ 
        marginBottom: isTrulyMobile ? 12 : 16, 
        padding: isTrulyMobile ? 8 : 12, 
        background: '#fafafa', 
        borderRadius: 6,
        display: 'flex',
        flexWrap: 'wrap',
        gap: isTrulyMobile ? 8 : 16,
        alignItems: 'center',
        width: '100%'
      }}>
        <div style={{ flex: 1, minWidth: isTrulyMobile ? 150 : 200 }}>
          <Search
            placeholder={isTrulyMobile ? "搜索..." : "搜索情绪或原因..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
            size="small"
          />
        </div>
        
        {!isTrulyMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: '12px' }}>显示标签</Text>
            <Switch
              size="small"
              checked={showLabels}
              onChange={setShowLabels}
            />
          </div>
        )}
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: isTrulyMobile ? 120 : 150 }}>
          <Text style={{ fontSize: '12px' }}>强度</Text>
          <Slider
            min={0}
            max={1}
            step={0.05}
            value={strengthThreshold}
            onChange={setStrengthThreshold}
            style={{ width: isTrulyMobile ? 60 : 80 }}
            tooltip={{ formatter: (value) => `${(value! * 100).toFixed(0)}%` }}
          />
        </div>
        
        {!isTrulyMobile && (
          <>
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
          </>
        )}
      </div>

      {/* 图形区域容器 */}
      <div className="graph-container">
        {/* SVG图形区域 */}
        <div className="svg-container">
          <svg 
            ref={svgRef} 
            className="emotion-graph-svg"
          />
          
          {/* 操作提示 - 响应式 */}
          <div style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'rgba(0, 0, 0, 0.6)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: 4,
            fontSize: isTrulyMobile ? '10px' : '11px',
            zIndex: 1,
            pointerEvents: 'none'
          }}>
            {isTrulyMobile ? (
              <div>👆 点击选择 • 双指缩放</div>
            ) : (
              <>
                <div>🖱️ 点击选择 • 拖拽移动</div>
                <div>🔍 滚轮缩放 • 悬停查看详情</div>
              </>
            )}
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