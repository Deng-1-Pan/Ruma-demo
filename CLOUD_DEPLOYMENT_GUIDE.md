# 云端部署问题解决指南

## 🔥 紧急修复方案

### 问题分析
你遇到的 `Cannot find module @rollup/rollup-linux-x64-musl` 错误是npm在Alpine Linux环境中处理可选依赖的已知bug。

### 立即可用的解决方案

#### 方案1：超轻量级部署（⭐强烈推荐，30秒完成）
```bash
# 使用超轻量级Dockerfile（静态演示页面）
bash deploy-ultra-light.sh

# 或手动执行
docker build -f Dockerfile.ultra-light -t ruma-demo-ultra .
docker run -d -p 80:80 --name ruma-demo-app ruma-demo-ultra
```

#### 方案2：使用最小化构建（yarn方案）
```bash
# 使用Dockerfile.minimal（使用yarn替代npm）
docker build -f Dockerfile.minimal -t ruma-demo-minimal .
docker run -d -p 80:80 --name ruma-demo-app ruma-demo-minimal
```

#### 方案3：使用修复后的轻量级构建
```bash
# 使用修复后的Dockerfile.light
docker build -f Dockerfile.light -t ruma-demo-light .
docker run -d -p 80:80 --name ruma-demo-app ruma-demo-light
```

#### 方案4：本地构建后部署
```bash
# 本地构建dist文件夹
npm run build:fast

# 使用简单的nginx镜像部署
docker run -d -p 80:80 -v $(pwd)/dist:/usr/share/nginx/html nginx:alpine
```

## 📋 各种构建方案对比

| 方案 | Dockerfile | 构建时间 | 成功率 | 适用场景 |
|------|------------|----------|--------|----------|
| **超轻量级** | `Dockerfile.ultra-light` | ~30秒 | ⭐⭐⭐⭐⭐ | 🥇云端首选/演示 |
| **最小化** | `Dockerfile.minimal` | 中等 | ⭐⭐⭐⭐⭐ | 完整功能需求 |
| **轻量级** | `Dockerfile.light` | 快 | ⭐⭐⭐⭐ | 资源受限环境 |
| **标准** | `Dockerfile` | 慢 | ⭐⭐⭐ | 本地开发 |

## 🛠️ 修复详情

### Dockerfile.light 修复
```dockerfile
# 原来的问题代码
RUN npm ci --no-optional --ignore-scripts

# 修复后的代码
RUN npm cache clean --force && \
    rm -f package-lock.json && \
    npm install --no-optional --ignore-scripts && \
    npm rebuild
```

### Dockerfile.minimal 优势
- ✅ 使用yarn替代npm（更稳定的依赖解析）
- ✅ 安装必要的构建工具
- ✅ 使用国内镜像源
- ✅ 避免可选依赖问题

## 🚀 云端部署步骤

### 阿里云/腾讯云等

#### 步骤1：上传代码
```bash
# 将整个项目目录上传到云服务器
scp -r . user@your-server:/path/to/app
```

#### 步骤2：登录服务器并构建
```bash
# SSH到服务器
ssh user@your-server

# 进入项目目录
cd /path/to/app

# 使用最稳定的构建方案
docker build -f Dockerfile.minimal -t ruma-demo .
docker run -d -p 80:80 --name ruma-demo-app ruma-demo
```

### Docker Hub/GitHub Actions

#### 创建 `.github/workflows/deploy.yml`
```yaml
name: Deploy to Cloud
on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Build Docker image
      run: docker build -f Dockerfile.minimal -t ruma-demo .
    
    - name: Deploy to server
      run: |
        # 你的部署脚本
        echo "部署成功"
```

## 🔧 本地构建 + 云端部署

如果云端构建始终失败，可以本地构建后上传：

```bash
# 本地构建
npm run build:fast

# 创建简单的部署用Dockerfile
cat > Dockerfile.deploy << 'EOF'
FROM nginx:alpine
COPY dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF

# 构建并上传
docker build -f Dockerfile.deploy -t your-registry/ruma-demo .
docker push your-registry/ruma-demo
```

## 🆘 紧急备用方案

### 方案A：使用CDN
```bash
# 本地构建
npm run build:fast

# 将dist文件夹上传到OSS/CDN
# 使用静态网站托管
```

### 方案B：使用Vercel/Netlify
```bash
# 直接连接GitHub仓库
# 设置构建命令为: npm run build:fast
# 发布目录: dist
```

### 方案C：手动构建
```bash
# 在有Docker的机器上构建
docker build -f Dockerfile.minimal -t ruma-demo .
docker save ruma-demo > ruma-demo.tar

# 上传tar文件到服务器
scp ruma-demo.tar user@server:/tmp/

# 在服务器上加载
ssh user@server
docker load < /tmp/ruma-demo.tar
docker run -d -p 80:80 --name ruma-demo-app ruma-demo
```

## 📊 构建监控和调试

### 查看构建详细信息
```bash
# 详细构建日志
docker build -f Dockerfile.minimal -t ruma-demo . --progress=plain

# 查看容器日志
docker logs ruma-demo-app

# 查看资源使用
docker stats ruma-demo-app
```

### 常见错误解决

#### 错误1：内存不足
```bash
# 增加Docker内存限制
docker run -d -p 80:80 -m 1g --name ruma-demo-app ruma-demo
```

#### 错误2：端口冲突
```bash
# 使用不同端口
docker run -d -p 8080:80 --name ruma-demo-app ruma-demo
```

#### 错误3：依赖安装失败
```bash
# 清理并重建
docker system prune -f
docker build --no-cache -f Dockerfile.minimal -t ruma-demo .
```

## 📞 技术支持

如果以上方案都无法解决问题，请提供：
1. 云服务商和配置信息
2. 完整的错误日志
3. 服务器资源配置（CPU/内存）
4. Docker版本信息

**推荐优先级**：
1. 🥇 使用 `Dockerfile.ultra-light`（30秒部署）
2. 🥈 使用 `Dockerfile.minimal`（yarn方案）
3. 🥉 使用 `Dockerfile.light`（修复版）
4. 🏅 本地构建 + 上传部署 