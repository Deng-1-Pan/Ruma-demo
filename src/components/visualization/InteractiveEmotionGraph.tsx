import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Card, Typography, Switch, Slider, Empty, Input, Tag, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import * as d3 from 'd3';
import type { EmotionKnowledgeGraph, EmotionGraphNode, EmotionGraphEdge } from '../../types/emotion';
import { EMOTION_EMOJIS, EMOTION_CHINESE_MAP } from '../../stores/emotionAnalysisStore';
import { useResponsive } from '../../utils/responsiveUtils';

const { Title, Text } = Typography;
const { Search } = Input;

interface InteractiveEmotionGraphProps {
  data: EmotionKnowledgeGraph;
  title?: string;
  width?: number;
  height?: number;
  className?: string;
}

// 🚀 轨道系统扩展的D3节点接口
interface D3Node extends EmotionGraphNode {
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
  index?: number;
  startX?: number;
  startY?: number;
  
  // 🌟 轨道系统新属性
  orbitSystemId?: string;        // 所属轨道系统ID
  isOrbitCenter?: boolean;       // 是否为轨道中心
  orbitRadius?: number;          // 轨道半径
  orbitAngle?: number;           // 轨道角度
  orbitLayer?: number;           // 轨道层级
  originalOrbitAngle?: number;   // 原始轨道角度（用于弹回）
  isDraggingFromOrbit?: boolean; // 是否正在从轨道位置拖拽
}

interface D3Edge extends Omit<EmotionGraphEdge, 'source' | 'target'> {
  source: D3Node;
  target: D3Node;
  index?: number;
}

// 🪐 轨道节点接口
interface OrbitNode {
  node: D3Node;
  orbitRadius: number;
  orbitAngle: number;
  orbitLayer: number;
}

// 🌟 轨道系统接口
interface OrbitSystem {
  id: string;
  centerNode: D3Node;
  satellites: OrbitNode[];
  orbitRadius: number;
  orbitLayers: number;
  boundingRadius: number;
}

// 🎯 轨道系统管理器类
class OrbitSystemManager {
  private orbitSystems: Map<string, OrbitSystem> = new Map();
  
  // 创建轨道系统
  createOrbitSystem(centerNode: D3Node, satellites: D3Node[]): OrbitSystem {
    const systemId = `orbit_${centerNode.id}`;
    
    // 🎯 优化轨道半径计算 - 参考Obsidian设计
    const baseRadius = this.calculateOptimalRadius(centerNode, satellites.length);
    
    const layers = this.calculateOrbitLayers(satellites.length);
    const orbitNodes = this.distributeNodesInOrbits(satellites, baseRadius, layers);
    
    const system: OrbitSystem = {
      id: systemId,
      centerNode,
      satellites: orbitNodes,
      orbitRadius: baseRadius,
      orbitLayers: layers,
      boundingRadius: baseRadius * layers * 1.8 // 🎯 进一步增加边界半径，确保松散布局
    };
    
    // 标记节点
    centerNode.orbitSystemId = systemId;
    centerNode.isOrbitCenter = true;
    orbitNodes.forEach(orbitNode => {
      orbitNode.node.orbitSystemId = systemId;
      orbitNode.node.orbitRadius = orbitNode.orbitRadius;
      orbitNode.node.orbitAngle = orbitNode.orbitAngle;
      orbitNode.node.orbitLayer = orbitNode.orbitLayer;
      orbitNode.node.originalOrbitAngle = orbitNode.orbitAngle;
    });
    
    this.orbitSystems.set(systemId, system);
    return system;
  }
  
  // 🚀 新增：计算最优轨道半径 - 响应式调整
  private calculateOptimalRadius(centerNode: D3Node, satelliteCount: number): number {
    const minRadius = centerNode.size * 3.5; // 增加最小距离
    const avgSatelliteSize = centerNode.size; // 使用实际节点大小，已经过响应式调整
    
    // 🎯 根据节点数量和大小计算合适的半径 - 更松散的布局
    const circumference = satelliteCount * (avgSatelliteSize * 4.0); // 增加间距系数
    const calculatedRadius = circumference / (2 * Math.PI);
    
    // 🚀 移动端使用更大的最小半径，实现更松散的布局
    const isMobile = typeof window !== 'undefined' && (window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent));
    const minOrbitRadius = isMobile ? 80 : 120; // 显著增加最小半径
    
    // 返回较大值，确保足够空间
    return Math.max(minRadius, calculatedRadius, minOrbitRadius);
  }
  
  // 🎯 优化轨道层级计算
  private calculateOrbitLayers(satelliteCount: number): number {
    if (satelliteCount <= 6) return 1;      // 单层最多6个
    if (satelliteCount <= 14) return 2;     // 双层最多14个
    if (satelliteCount <= 24) return 3;     // 三层最多24个
    return Math.ceil(satelliteCount / 8);   // 每层最多8个节点
  }
  
  // 🚀 重构节点分布算法 - 实现更均匀分布
  private distributeNodesInOrbits(satellites: D3Node[], baseRadius: number, layers: number): OrbitNode[] {
    const orbitNodes: OrbitNode[] = [];
    
    // 🎯 按层分配节点，优先填充内层
    const nodesPerLayer = this.distributeNodesAcrossLayers(satellites.length, layers);
    
    let satelliteIndex = 0;
    for (let layer = 1; layer <= layers; layer++) {
      const layerNodeCount = nodesPerLayer[layer - 1];
      const layerNodes = satellites.slice(satelliteIndex, satelliteIndex + layerNodeCount);
      
      // 🌟 计算层的半径 - 使用更松散的递增
      const layerRadius = baseRadius * (1 + (layer - 1) * 1.2); // 增加层间递增系数
      
      // 🚀 使用黄金角分布实现更均匀的角度分布
      const angles = this.calculateGoldenAngleDistribution(layerNodeCount, layer);
      
      layerNodes.forEach((node, index) => {
        orbitNodes.push({
          node,
          orbitRadius: layerRadius,
          orbitAngle: angles[index],
          orbitLayer: layer
        });
      });
      
      satelliteIndex += layerNodeCount;
    }
    
    return orbitNodes;
  }
  
  // 🌟 新增：智能分配节点到各层
  private distributeNodesAcrossLayers(totalNodes: number, layers: number): number[] {
    const distribution: number[] = [];
    
    if (layers === 1) {
      distribution.push(totalNodes);
    } else if (layers === 2) {
      // 内层较少，外层较多
      const innerNodes = Math.min(6, Math.floor(totalNodes * 0.4));
      distribution.push(innerNodes, totalNodes - innerNodes);
    } else {
      // 多层分布：内层最少，逐层递增
      let remaining = totalNodes;
      for (let i = 1; i <= layers; i++) {
        if (i === layers) {
          distribution.push(remaining);
        } else {
          const layerNodes = Math.min(4 + i * 2, Math.ceil(remaining / (layers - i + 1)));
          distribution.push(layerNodes);
          remaining -= layerNodes;
        }
      }
    }
    
    return distribution;
  }
  
  // 🚀 新增：均匀角度分布算法（参考Obsidian设计）
  private calculateGoldenAngleDistribution(nodeCount: number, layer: number): number[] {
    const angles: number[] = [];
    
    if (nodeCount === 1) {
      angles.push(Math.random() * 2 * Math.PI);
    } else {
      // 🎯 为每层添加不同的初始偏移，避免层间节点重叠
      const layerOffset = (layer - 1) * (Math.PI / 4);
      
      for (let i = 0; i < nodeCount; i++) {
        // 🌟 使用完美均匀分布，确保最优视觉效果
        const angle = (2 * Math.PI * i / nodeCount) + layerOffset;
        angles.push(angle);
      }
    }
    
    return angles;
  }
  
  // 获取轨道系统  
  getSystem(systemId: string): OrbitSystem {
    return this.orbitSystems.get(systemId)!;
  }
  
  // 获取所有轨道系统
  getAllSystems(): OrbitSystem[] {
    return Array.from(this.orbitSystems.values());
  }
  
  // 清空所有轨道系统
  clear(): void {
    this.orbitSystems.clear();
  }
  
  // 通过卫星节点找到轨道系统
  getSystemBySatellite(satelliteNode: D3Node): OrbitSystem | undefined {
    if (!satelliteNode.orbitSystemId) return undefined;
    return this.orbitSystems.get(satelliteNode.orbitSystemId);
  }
}

// 🔧 修复：创建安全的CSS类名生成函数，避免中文字符导致的选择器错误
const createSafeCssClass = (id: string): string => {
  // 使用btoa进行base64编码，确保生成安全的CSS类名
  try {
    return `drag-constraint-${btoa(encodeURIComponent(id)).replace(/[+=\/]/g, '-')}`;
  } catch (error) {
    // 如果编码失败，使用简单的哈希替代
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      const char = id.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return `drag-constraint-hash-${Math.abs(hash)}`;
  }
};

const InteractiveEmotionGraph: React.FC<InteractiveEmotionGraphProps> = ({
  data,
  title = '🧠 交互式情绪知识图谱',
  width = 900,
  height = 650,
  className
}) => {
  // 🎯 响应式检测
  const { deviceType, isMobile } = useResponsive();
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const isTrulyMobile = screenWidth < 768 || isMobile || /Mobi|Android/i.test(navigator.userAgent);
  
  // 🚀 移动端节点大小调整函数 - 基于D3.js最佳实践
  const getResponsiveNodeSize = (originalSize: number): number => {
    if (isTrulyMobile) {
      // 移动端：固定大小范围，避免过大或过小
      const mobileSize = Math.min(Math.max(originalSize * 0.3, 8), 25); // 8-25px范围
      console.log(`📱 [Mobile] 节点尺寸调整: ${originalSize} → ${mobileSize}`);
      return mobileSize;
    } else if (deviceType === 'tablet') {
      // 平板端：适度缩小
      return Math.min(Math.max(originalSize * 0.6, 12), 40); // 12-40px范围
    }
    // 桌面端：保持原始大小但设置合理上限
    return Math.min(originalSize, 60); // 最大60px
  };
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<D3Node, D3Edge> | null>(null);
  const orbitManagerRef = useRef<OrbitSystemManager>(new OrbitSystemManager());
  
  // 状态管理
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLabels, setShowLabels] = useState(true);
  const [strengthThreshold, setStrengthThreshold] = useState(0.1);
  const [currentZoomScale, setCurrentZoomScale] = useState(1);
  const [showOrbitPaths, setShowOrbitPaths] = useState(true); // 🚀 新增：轨道路径显示开关

  // 过滤数据
  const filteredData = useMemo(() => {
    if (!data.nodes || !data.edges) return { nodes: [], edges: [] };
    
    const filteredEdges = data.edges.filter(edge => edge.weight >= strengthThreshold);
    const relevantNodeIds = new Set<string>();
    filteredEdges.forEach(edge => {
      const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
      relevantNodeIds.add(sourceId);
      relevantNodeIds.add(targetId);
    });
    
    const filteredNodes = data.nodes.filter(node => {
      if (!relevantNodeIds.has(node.id)) return false;
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        node.label.toLowerCase().includes(searchLower) ||
        (node.description && node.description.toLowerCase().includes(searchLower)) ||
        (node.emotion && EMOTION_CHINESE_MAP[node.emotion]?.toLowerCase().includes(searchLower))
      );
    });
    
    return { nodes: filteredNodes, edges: filteredEdges };
  }, [data, strengthThreshold, searchTerm]);

  // 🚀 轨道系统相关的辅助函数
  const orbitManager = orbitManagerRef.current;
  
  // 找到连接的卫星节点
  const findConnectedSatellites = (emotionNode: D3Node, edges: D3Edge[]): D3Node[] => {
    const connectedSatellites: D3Node[] = [];
    edges.forEach(edge => {
      if (edge.source.id === emotionNode.id && (edge.target.type === 'cause' || edge.target.type === 'trigger')) {
        connectedSatellites.push(edge.target);
      }
      if (edge.target.id === emotionNode.id && (edge.source.type === 'cause' || edge.source.type === 'trigger')) {
        connectedSatellites.push(edge.source);
      }
    });
    return connectedSatellites;
  };
  
  // 计算两点间距离
  const calculateDistance = (nodeA: { x?: number; y?: number }, nodeB: { x?: number; y?: number }): number => {
    const dx = (nodeA.x || 0) - (nodeB.x || 0);
    const dy = (nodeA.y || 0) - (nodeB.y || 0);
    return Math.sqrt(dx * dx + dy * dy);
  };
  
  // 找到非重叠位置
  const findNonOverlappingPosition = (node: D3Node, existingSystems: OrbitSystem[], containerWidth: number, containerHeight: number): { x: number; y: number } => {
    const margin = isTrulyMobile ? 50 : 80; // 减小边距，给节点更大的分布空间
    let attempts = 0;
    const maxAttempts = 50;
    
    while (attempts < maxAttempts) {
      const x = margin + Math.random() * (containerWidth - 2 * margin);
      const y = margin + Math.random() * (containerHeight - 2 * margin);
      
      let validPosition = true;
      for (const system of existingSystems) {
                  const distance = calculateDistance({ x, y }, system.centerNode);
        if (distance < (system.boundingRadius + node.size * 3 + 100)) { // 增加轨道系统间距
          validPosition = false;
          break;
        }
      }
      
      if (validPosition) {
        return { x, y };
      }
      attempts++;
    }
    
    // 如果找不到好位置，返回随机位置
    return {
      x: margin + Math.random() * (containerWidth - 2 * margin),
      y: margin + Math.random() * (containerHeight - 2 * margin)
    };
  };

  // 🎯 根据缩放级别决定是否显示标签
  const shouldShowLabels = useMemo(() => {
    return showLabels && currentZoomScale > 0.8; // 缩放级别大于0.8时显示标签
  }, [showLabels, currentZoomScale]);

  // D3.js 图形渲染 - 使用智能参数
  useEffect(() => {
    if (!svgRef.current || filteredData.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    
    // 🎯 获取SVG容器的实际渲染尺寸
    const svgRect = svgRef.current.getBoundingClientRect();
    const actualWidth = svgRect.width || width;
    const actualHeight = svgRect.height || height;

    const container = svg.append('g').attr('class', 'graph-container');

    // 🎯 计算圆形分布参数
    const centerX = actualWidth / 2;
    const centerY = actualHeight / 2;
    
    // 🚀 基于节点数量的动态半径计算
    const nodeCount = filteredData.nodes.length;
    // 🚀 响应式基础半径计算 - 扩大分布范围
    let baseRadius = Math.min(actualWidth, actualHeight) / 2 - 30; // 减小边距
    if (isTrulyMobile) {
      // 移动端使用更大的基础半径，提供更多空间
      baseRadius = Math.min(actualWidth, actualHeight) / 2.2; // 更宽松的计算
      baseRadius = Math.min(baseRadius, 250); // 移动端最大250px，比之前大很多
    }
    
    const densityFactor = Math.sqrt(nodeCount / 15); // 基准15个节点，更宽松的密度计算
    const maxRadius = baseRadius * Math.max(1.2, Math.min(densityFactor, isTrulyMobile ? 1.8 : 2.5)); // 显著增大分布范围
    
    console.log(`🎯 [${isTrulyMobile ? 'Mobile' : 'Desktop'}] 动态半径计算: 节点数=${nodeCount}, 基础半径=${baseRadius.toFixed(1)}, 密度因子=${densityFactor.toFixed(2)}, 最终半径=${maxRadius.toFixed(1)}`);

    // 🚀 优化缩放功能 - 添加缩放级别监听
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
        // 🎯 更新缩放级别状态
        setCurrentZoomScale(event.transform.k);
      });
    svg.call(zoom);

    // 🚀 轨道布局初始化 - 应用响应式节点大小
    const nodes: D3Node[] = filteredData.nodes.map(node => ({ 
      ...node,
      size: getResponsiveNodeSize(node.size) // 🎯 应用响应式大小调整
    }));
    
    // 清空并重新初始化轨道系统
    orbitManager.clear();
    
    // 1️⃣ 识别主节点和子节点关系
    // 🚀 首先创建edges数组，供后续轨道系统使用
    const edges: D3Edge[] = filteredData.edges.map(edge => ({
      ...edge,
      source: nodes.find(n => n.id === (typeof edge.source === 'string' ? edge.source : edge.source.id))!,
      target: nodes.find(n => n.id === (typeof edge.target === 'string' ? edge.target : edge.target.id))!
    })).filter(edge => edge.source && edge.target);

    const emotionNodes = nodes.filter(n => n.type === 'emotion');
    const causeNodes = nodes.filter(n => n.type === 'cause' || n.type === 'trigger');
    
    console.log(`🌟 轨道初始化: ${emotionNodes.length}个情绪节点, ${causeNodes.length}个原因节点`);
    
    // 2️⃣ 为每个主节点创建轨道系统
    emotionNodes.forEach(emotionNode => {
      const connectedSatellites = findConnectedSatellites(emotionNode, edges);
      
      if (connectedSatellites.length > 0) {
        const orbitSystem = orbitManager.createOrbitSystem(emotionNode, connectedSatellites);
        
        // 设置中心节点位置（避免重叠）
        const position = findNonOverlappingPosition(emotionNode, orbitManager.getAllSystems(), actualWidth, actualHeight);
        emotionNode.x = position.x;
        emotionNode.y = position.y;
        
        // 设置轨道节点位置
        orbitSystem.satellites.forEach(satellite => {
          const { node, orbitRadius, orbitAngle } = satellite;
          node.x = emotionNode.x! + Math.cos(orbitAngle) * orbitRadius;
          node.y = emotionNode.y! + Math.sin(orbitAngle) * orbitRadius;
        });
        
        console.log(`🪐 创建轨道系统: ${emotionNode.label} (${connectedSatellites.length}个卫星)`);
      }
    });
    
    // 3️⃣ 处理独立节点（没有连接的节点）
    const independentNodes = nodes.filter(n => !n.orbitSystemId);
    independentNodes.forEach(node => {
      const position = findNonOverlappingPosition(node, orbitManager.getAllSystems(), actualWidth, actualHeight);
      node.x = position.x;
      node.y = position.y;
    });

    // 🎯 创建更宽松的边界约束力
    const boundaryForce = () => {
      nodes.forEach(node => {
        const dx = node.x! - centerX;
        const dy = node.y! - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 🌟 使用软边界：只有超出很多时才约束，并且约束力更柔和
        const softBoundary = maxRadius * 1.1; // 增加10%的缓冲区
        if (distance > softBoundary) {
          // 使用柔和的拉回力，而不是硬性限制位置
          const pullStrength = 0.02; // 柔和的拉回力
          const pullFactor = (distance - softBoundary) / distance;
          node.vx! -= dx * pullFactor * pullStrength;
          node.vy! -= dy * pullFactor * pullStrength;
        }
      });
    };

    // 🚀 创建轨道约束力系统 - 支持自然跟随效果
    const orbitConstraintForce = () => {
      orbitManager.getAllSystems().forEach(system => {
        system.satellites.forEach(satellite => {
          const { node, orbitRadius, orbitAngle } = satellite;
          
          // 🎯 只在拖拽子节点时跳过约束，主节点拖拽时保持约束
          if (node.isDraggingFromOrbit) return;
          
          // 计算理想轨道位置（基于中心节点当前位置）
          const idealX = system.centerNode.x! + Math.cos(orbitAngle) * orbitRadius;
          const idealY = system.centerNode.y! + Math.sin(orbitAngle) * orbitRadius;
          
          // 🌟 如果中心节点被拖拽，使用更强的约束力确保快速跟随
          const centerBeingDragged = system.centerNode.fx !== null;
          // 🚀 移动端使用更轻柔的约束力
          const baseStrength = isTrulyMobile ? 0.1 : 0.15;
          const constraintStrength = centerBeingDragged ? (isTrulyMobile ? 0.2 : 0.3) : baseStrength;
          
          node.vx! += (idealX - node.x!) * constraintStrength;
          node.vy! += (idealY - node.y!) * constraintStrength;
        });
      });
    };
    
    // 🚀 优化轨道系统冲突避免力
    const orbitCollisionAvoidanceForce = () => {
      const systems = orbitManager.getAllSystems();
      
      for (let i = 0; i < systems.length; i++) {
        for (let j = i + 1; j < systems.length; j++) {
          const systemA = systems[i];
          const systemB = systems[j];
          
          const distance = calculateDistance(systemA.centerNode, systemB.centerNode);
          const minDistance = systemA.boundingRadius + systemB.boundingRadius + 150; // 🎯 进一步增加安全距离
          
          if (distance < minDistance) {
            // 🌟 使用非线性力函数，距离越近推力越强
            const overlapRatio = (minDistance - distance) / minDistance;
            const pushForce = overlapRatio * overlapRatio * 0.5;
            
            const angle = Math.atan2(
              systemB.centerNode.y! - systemA.centerNode.y!,
              systemB.centerNode.x! - systemA.centerNode.x!
            );
            
            systemA.centerNode.vx! -= Math.cos(angle) * pushForce;
            systemA.centerNode.vy! -= Math.sin(angle) * pushForce;
            systemB.centerNode.vx! += Math.cos(angle) * pushForce;
            systemB.centerNode.vy! += Math.sin(angle) * pushForce;
          }
        }
      }
    };

    // 🎯 优化力模拟系统 - 参考Obsidian设计
    const simulation = d3.forceSimulation<D3Node>(nodes)
      .force('link', d3.forceLink<D3Node, D3Edge>(edges)
        .id(d => d.id)
        .distance(d => {
          // 🌟 动态连接距离：轨道内连接更短，跨轨道连接更长
          const source = d.source as D3Node;
          const target = d.target as D3Node;
          if (source.orbitSystemId === target.orbitSystemId) {
            return source.orbitRadius || 60; // 同轨道系统内的连接
          }
          return 120; // 跨轨道系统的连接
        })
        .strength(0.05) // 🎯 适度增加连接力，支持自然跟随
      )
      .force('charge', d3.forceManyBody()
        .strength(d => {
          // 🌟 差异化排斥力：主节点排斥力更强
          return (d as D3Node).isOrbitCenter ? -80 : -30;
        })
      ) 
      .force('collision', d3.forceCollide()
        .radius((d: any) => d.size + (isTrulyMobile ? 4 : 8)) // 🎯 移动端减小碰撞半径
        .strength(0.9) // 🌟 增强碰撞检测
      )
      .force('boundary', boundaryForce)
      .force('orbitConstraint', orbitConstraintForce) // 🌟 轨道约束力
      .force('orbitCollisionAvoidance', orbitCollisionAvoidanceForce) // 🌟 轨道冲突避免
      .alphaDecay(isTrulyMobile ? 0.03 : 0.01) // 🎯 移动端更快衰减，提高稳定性
      .velocityDecay(isTrulyMobile ? 0.9 : 0.85); // 🌟 移动端增加阻尼

    console.log(`🌟 轨道系统初始化: ${orbitManager.getAllSystems().length} 个轨道系统`);

    simulationRef.current = simulation;

    // 🌟 渲染轨道路径（可选）
    if (showOrbitPaths) {
      const orbitPaths = container.selectAll('.orbit-path')
        .data(orbitManager.getAllSystems())
        .enter()
        .append('g')
        .attr('class', 'orbit-path');
      
      orbitPaths.each(function(system) {
        const group = d3.select(this);
        
        // 为每个轨道层绘制圆形轨道线
        for (let layer = 1; layer <= system.orbitLayers; layer++) {
          const radius = system.orbitRadius * layer;
          
          group.append('circle')
            .attr('cx', system.centerNode.x!)
            .attr('cy', system.centerNode.y!)
            .attr('r', radius)
            .attr('fill', 'none')
            .attr('stroke', '#e6f7ff')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3,3')
            .attr('opacity', 0.3);
        }
      });
    }

    // 渲染连接边
    const link = container.selectAll('.link')
      .data(edges)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', d => d.color)
      .attr('stroke-width', d => d.width)
      .attr('stroke-opacity', 0.6);

    // 渲染节点组
    const node = container.selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer');

    // 节点圆形
    node.append('circle')
      .attr('r', d => d.size)
      .attr('fill', d => d.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // 节点emoji
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', d => {
        const emojiSize = Math.min(d.size * 0.6, isTrulyMobile ? 12 : 16);
        return Math.max(emojiSize, 8); // 最小8px确保可见
      })
      .text(d => {
        if (d.type === 'emotion' && d.emotion) {
          return EMOTION_EMOJIS[d.emotion] || '😐';
        }
        return d.type === 'cause' ? '📝' : '🔗';
      })
      .attr('pointer-events', 'none');

    // 🎯 动态节点标签 - 根据缩放级别显示
    node.append('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.size + (isTrulyMobile ? 12 : 18))
      .attr('font-size', isTrulyMobile ? '10px' : '12px')
      .attr('fill', '#333')
      .text(d => {
        const maxLength = isTrulyMobile ? 4 : 10;
        return d.label.length > maxLength ? d.label.substring(0, maxLength) + '...' : d.label;
      })
      .attr('pointer-events', 'none')
      .style('opacity', (shouldShowLabels && !isTrulyMobile) ? 1 : 0) // 🚀 移动端默认隐藏标签
      .style('transition', 'opacity 0.3s ease'); // 🎯 平滑过渡动画

    // 交互事件
    node
      .on('mouseover', (_, d) => {
        setHoveredNode(d.id);
        // 创建简单的工具提示
        d3.select('body').append('div')
          .attr('class', 'graph-tooltip')
          .style('position', 'absolute')
          .style('background', 'rgba(0, 0, 0, 0.8)')
          .style('color', 'white')
          .style('padding', '8px')
          .style('border-radius', '4px')
          .style('font-size', '12px')
          .style('pointer-events', 'none')
          .style('z-index', '9999')
          .html(`
            <div><strong>${d.label}</strong></div>
            <div>类型: ${d.type === 'emotion' ? '情绪' : '原因'}</div>
            <div>权重: ${d.weight}</div>
            ${d.intensity ? `<div>强度: ${d.intensity.toFixed(1)}%</div>` : ''}
          `);
      })
      .on('mousemove', (event) => {
        d3.select('.graph-tooltip')
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', () => {
        setHoveredNode(null);
        d3.select('.graph-tooltip').remove();
      })
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedNode(selectedNode === d.id ? null : d.id);
      });

    // 🚀 轨道感知拖拽系统 - 优化为自然跟随效果
    const drag = d3.drag<SVGGElement, D3Node>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        
        d.startX = d.x;
        d.startY = d.y;
        d.fx = d.x;
        d.fy = d.y;
        
        if (d.type === 'emotion' && d.isOrbitCenter) {
          // 🌟 主节点（轨道中心）拖拽开始 - 使用弹簧跟随
          console.log(`🌟 开始拖拽轨道中心: ${d.label}`);
          
          // 🎯 不再固定子节点位置，让它们通过弹簧力自然跟随
          // 这样可以实现类似Obsidian的自然跟随效果
          
        } else if (d.orbitSystemId && !d.isOrbitCenter) {
          // 🪐 轨道节点拖拽开始
          console.log(`🪐 开始拖拽轨道节点: ${d.label}`);
          d.isDraggingFromOrbit = true;
          
          // 显示拖拽约束范围
          const system = orbitManager.getSystem(d.orbitSystemId);
          const maxRadius = system.orbitRadius * 1.5;
          
          container.append('circle')
            .attr('class', createSafeCssClass(d.id))
            .attr('cx', system.centerNode.x!)
            .attr('cy', system.centerNode.y!)
            .attr('r', maxRadius)
            .attr('fill', 'rgba(255, 77, 79, 0.1)')
            .attr('stroke', '#ff4d4f')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5')
            .style('opacity', 0)
            .transition()
            .duration(300)
            .style('opacity', 1);
        }
      })
      .on('drag', (event, d) => {
        if (d.type === 'emotion' && d.isOrbitCenter) {
          // 🌟 主节点拖拽：使用自然跟随效果
          d.fx = event.x;
          d.fy = event.y;
          
          // 🎯 移除固定位置逻辑，让弹簧力自然作用
          // 子节点将通过连接力和轨道约束力自然跟随主节点
          
        } else if (d.orbitSystemId && !d.isOrbitCenter && d.isDraggingFromOrbit) {
          // 🪐 轨道节点拖拽：限制范围
          const system = orbitManager.getSystem(d.orbitSystemId);
          const maxDistance = system.orbitRadius * 1.5;
          
          const distanceFromCenter = calculateDistance(
            { x: event.x, y: event.y },
            system.centerNode
          );
          
          if (distanceFromCenter <= maxDistance) {
            d.fx = event.x;
            d.fy = event.y;
          } else {
            // 限制在最大距离内
            const angle = Math.atan2(
              event.y - system.centerNode.y!,
              event.x - system.centerNode.x!
            );
            d.fx = system.centerNode.x! + Math.cos(angle) * maxDistance;
            d.fy = system.centerNode.y! + Math.sin(angle) * maxDistance;
          }
        } else {
          // 普通节点拖拽
          d.fx = event.x;
          d.fy = event.y;
        }
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        
        if (d.type === 'emotion' && d.isOrbitCenter) {
          // 🌟 主节点拖拽结束：使用延迟释放
          setTimeout(() => {
            d.fx = null;
            d.fy = null;
            d.startX = undefined;
            d.startY = undefined;
            
            // 🎯 不再立即释放子节点，让它们自然稳定到轨道位置
          }, 100);
          
        } else if (d.orbitSystemId && !d.isOrbitCenter && d.isDraggingFromOrbit) {
          // 🪐 轨道节点拖拽结束：弹回轨道
          d.isDraggingFromOrbit = false;
          
          // 🔧 修复：确保红框被正确移除
          const constraintElement = container.select(`.${createSafeCssClass(d.id)}`);
          if (!constraintElement.empty()) {
            constraintElement
              .transition()
              .duration(300)
              .style('opacity', 0)
              .on('end', function() {
                // 🎯 使用传统function确保this指向正确
                d3.select(this).remove();
              });
          }
          
          // 弹回动画
          const system = orbitManager.getSystem(d.orbitSystemId);
          const satellite = system.satellites.find(s => s.node.id === d.id)!;
          
          const targetX = system.centerNode.x! + Math.cos(satellite.orbitAngle) * satellite.orbitRadius;
          const targetY = system.centerNode.y! + Math.sin(satellite.orbitAngle) * satellite.orbitRadius;
          
          // 使用D3过渡动画实现弹回效果
          const transition = d3.transition()
            .duration(600)
            .ease(d3.easeBackOut.overshoot(1.2));
          
          transition.tween('orbit-return', () => {
            const startX = d.x!;
            const startY = d.y!;
            const interpolateX = d3.interpolate(startX, targetX);
            const interpolateY = d3.interpolate(startY, targetY);
            
            return (t: number) => {
              d.x = interpolateX(t);
              d.y = interpolateY(t);
              d.fx = d.x;
              d.fy = d.y;
            };
          }).on('end', () => {
            d.fx = null;
            d.fy = null;
          });
          
        } else {
          // 普通节点释放
          d.fx = null;
          d.fy = null;
          d.startX = undefined;
          d.startY = undefined;
        }
      });

    node.call(drag);

    // 点击空白区域取消选择
    svg.on('click', () => setSelectedNode(null));

    // 力模拟tick事件
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
      orbitManager.clear(); // 清理轨道系统
    };
  }, [filteredData, showLabels, showOrbitPaths, searchTerm]);

  // 🚀 独立的缩放级别标签控制useEffect
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const labels = svg.selectAll('.node-label');

    // 🎯 根据缩放级别平滑控制标签显示
    labels
      .transition()
      .duration(300)
      .style('opacity', shouldShowLabels ? 1 : 0);
  }, [shouldShowLabels]);

  // 🚀 独立的样式更新useEffect - 只处理样式，不重建图形
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const node = svg.selectAll('.node');
    const link = svg.selectAll('.link');

    // 更新节点样式
    node.select('circle')
      .attr('fill', (d: any) => {
        if (selectedNode === d.id) return '#ff4d4f';
        if (hoveredNode === d.id) return '#ff7a45';
        return d.color;
      })
      .attr('opacity', (d: any) => {
        if (searchTerm && !d.label.toLowerCase().includes(searchTerm.toLowerCase())) {
          return 0.3;
        }
        return selectedNode && selectedNode !== d.id ? 0.6 : 1;
      });

    // 更新边样式
    link
      .attr('stroke', (d: any) => {
        if (selectedNode && (d.source.id === selectedNode || d.target.id === selectedNode)) {
          return '#ff4d4f';
        }
        if (hoveredNode && (d.source.id === hoveredNode || d.target.id === hoveredNode)) {
          return '#ff7a45';
        }
        return d.color;
      })
      .attr('stroke-opacity', (d: any) => {
        if (selectedNode && (d.source.id === selectedNode || d.target.id === selectedNode)) {
          return 0.8;
        }
        if (hoveredNode && (d.source.id === hoveredNode || d.target.id === hoveredNode)) {
          return 0.8;
        }
        return 0.6;
      });
  }, [selectedNode, hoveredNode, searchTerm]);

  // 空状态处理
  if (!data.nodes || data.nodes.length === 0) {
    return (
      <Card className={className} title={title}>
        <Empty 
          description="暂无情绪关系数据"
          style={{ padding: '60px 0' }}
        />
      </Card>
    );
  }

  return (
    <Card 
      className={className}
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>
            {title}
          </Title>
          <div style={{ display: 'flex', gap: 16, fontSize: '12px', color: '#666' }}>
            <span>节点: {filteredData.nodes.length}</span>
            <span>连接: {filteredData.edges.length}</span>
          </div>
        </div>
      }
      style={{ width: '100%' }}
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
        alignItems: 'center'
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
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 180 }}>
          <Text style={{ fontSize: '12px' }}>强度阈值</Text>
          <Tooltip 
            title="筛选情绪关系强度：数值越高显示越强的关系，数值越低显示更多弱关系。帮助您专注于最重要的情绪连接。"
            placement="topLeft"
          >
            <InfoCircleOutlined style={{ color: '#1890ff', cursor: 'help' }} />
          </Tooltip>
          <Slider
            min={0}
            max={1}
            step={0.05}
            value={strengthThreshold}
            onChange={setStrengthThreshold}
            style={{ width: 100 }}
            tooltip={{ formatter: (value) => `${(value! * 100).toFixed(0)}%` }}
          />
        </div>
        
        {/* 轨道系统状态显示 */}
        <div style={{ 
          fontSize: '11px', 
          color: '#666', 
          background: '#fff', 
          padding: '4px 8px', 
          borderRadius: 4,
          border: '1px solid #e8e8e8'
        }}>
          🌟 轨道系统: {orbitManager.getAllSystems().length}个轨道 • {filteredData.nodes.length}个节点
        </div>
        
        {/* 轨道可视化控制 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: '12px' }}>显示轨道</Text>
          <Switch
            size="small"
            checked={showOrbitPaths}
            onChange={setShowOrbitPaths}
          />
        </div>
      </div>

      {/* SVG图形区域 */}
      <div 
        style={{ 
          position: 'relative', 
          border: '1px solid #d9d9d9', 
          borderRadius: 4,
          width: '100%',
          height: height + 'px', // 使用props height设置容器高度
          overflow: 'hidden'
        }}
      >
        <svg 
          ref={svgRef} 
          style={{ 
            display: 'block',
            width: '100%',
            height: '100%'
          }} 
        />
        
        {/* 轨道系统操作提示 */}
        <div style={{
          position: 'absolute',
          top: 8,
          right: 8,
          background: 'rgba(0, 0, 0, 0.6)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: 4,
          fontSize: '11px'
        }}>
          <div>🌟 拖拽情绪节点 • 整个轨道移动</div>
          <div>🪐 拖拽原因节点 • 限制范围弹回</div>
          <div>🔍 滚轮缩放 • 悬停查看详情</div>
        </div>
      </div>

      {/* 选中节点详情 */}
      {selectedNode && (
        <div style={{ 
          marginTop: 16, 
          padding: 16, 
          background: '#f5f5f5', 
          borderRadius: 6
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Title level={5} style={{ margin: 0 }}>
              已选择节点: {filteredData.nodes.find(n => n.id === selectedNode)?.label}
            </Title>
            <Tag color="blue">
              {filteredData.nodes.find(n => n.id === selectedNode)?.type === 'emotion' ? '情绪' : '原因'}
            </Tag>
          </div>
        </div>
      )}
    </Card>
  );
};

export default InteractiveEmotionGraph; 