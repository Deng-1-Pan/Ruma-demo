# 构建优化指南

## 问题描述
项目在云端部署时构建缓慢，主要原因：
1. 大型可视化库（plotly、echarts、d3）导致bundle过大
2. Docker构建配置不当
3. 代码分割不够细致
4. 内存使用未优化

## 优化措施

### 1. Vite构建配置优化 (`vite.config.ts`)
- **细化代码分割**: 将大型库分别打包为独立chunk
- **启用tree-shaking**: 移除未使用的代码
- **优化terser配置**: 更激进的压缩选项
- **依赖预构建**: 优化常用库的预构建
- **提升警告阈值**: 从500KB提升到800KB

### 2. Docker构建优化
#### 标准Dockerfile
- 修复依赖安装问题（包含devDependencies）
- 使用国内npm镜像
- 增加健康检查

#### 轻量级Dockerfile (`Dockerfile.light`)
- 专为资源受限环境设计
- 使用esbuild替代terser（更快）
- 禁用可选依赖和脚本
- 构建后清理缓存

### 3. 构建脚本优化 (`package.json`)
```bash
# 快速构建（跳过TypeScript检查）
npm run build:fast

# 轻量级构建（开发模式，较小内存）
npm run build:light

# CI/CD构建（使用esbuild，1GB内存）
npm run build:ci

# Docker构建（1.5GB内存，生产优化）
npm run build:docker

# 标准构建（2GB内存，完整优化）
npm run build:2gb
```

### 4. 内存优化
- `build:ci`: 1GB内存限制，适合CI环境
- `build:docker`: 1.5GB内存限制，适合Docker构建
- `build:2gb`: 2GB内存限制，本地开发使用

## 部署选项

### 快速部署（推荐用于云端）
```bash
# 使用轻量级Dockerfile
npm run docker:deploy:light

# 或手动构建
docker build -f Dockerfile.light -t ruma-demo-light .
docker run -d -p 80:80 --name ruma-demo-app ruma-demo-light
```

### 标准部署
```bash
# 使用标准Dockerfile
npm run docker:build
npm run docker:run
```

## 构建性能对比

| 方案 | 内存使用 | 构建时间 | 包大小 | 适用场景 |
|------|----------|----------|--------|----------|
| build:ci | ~1GB | 最快 | 较大 | CI/CD环境 |
| build:light | ~1GB | 快 | 中等 | 资源受限 |
| build:docker | ~1.5GB | 中等 | 小 | Docker部署 |
| build:2gb | ~2GB | 较慢 | 最小 | 本地开发 |

## 文件结构优化

### .dockerignore
排除不必要文件，减少构建上下文：
- 开发文件（.vscode, .idea）
- 文档文件（*.md）
- 测试文件
- 构建缓存

### 代码分割结果
- `vendor-react`: React核心库
- `vendor-plotly`: Plotly图表库
- `vendor-echarts`: ECharts图表库
- `vendor-d3`: D3可视化库
- `vendor-antd`: Ant Design UI库
- `components-viz`: 可视化组件
- `pages`: 页面组件

## 故障排除

### 内存不足
```bash
# 减少内存使用
npm run build:ci

# 或使用轻量级Docker
docker build -f Dockerfile.light -t ruma-demo-light .
```

### 构建时间过长
```bash
# 跳过TypeScript检查
npm run build:fast

# 使用esbuild（更快的压缩）
npm run build:ci
```

### 云端部署失败
1. 使用 `Dockerfile.light`
2. 确保云端有足够内存（至少1.5GB）
3. 使用构建缓存（如果支持）

## 监控构建
```bash
# 查看构建资源使用
docker stats

# 查看构建日志
docker logs ruma-demo-app
```

## 进一步优化建议
1. 考虑将部分可视化库改为按需加载
2. 使用CDN托管大型库
3. 启用Gzip压缩
4. 使用更小的基础镜像（如distroless） 