# Docker构建问题解决方案

## 问题描述

在构建Docker镜像时遇到以下错误：
```
Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)
ERROR: Service 'ruma-demo' failed to build : Build failed
```

## 问题原因

这个问题通常是由于网络连接问题导致的，特别是在中国大陆地区：
1. 无法访问Docker Hub (registry-1.docker.io)
2. 网络连接不稳定
3. DNS解析问题
4. 防火墙或代理配置问题

## 解决方案

### 方案1：配置Docker镜像源（推荐）

1. 创建或修改Docker daemon配置文件：
```bash
sudo mkdir -p /etc/docker
sudo nano /etc/docker/daemon.json
```

2. 添加以下内容：
```json
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://registry.docker-cn.com"
  ],
  "max-concurrent-downloads": 10,
  "max-concurrent-uploads": 5
}
```

3. 重启Docker服务：
```bash
sudo systemctl restart docker
```

4. 验证配置：
```bash
docker info | grep -A 10 "Registry Mirrors"
```

### 方案2：使用本地构建部署（已实现）

如果Docker网络问题无法解决，可以使用本地构建的方式：

1. 直接运行部署脚本：
```bash
./deploy-local.sh
```

2. 手动步骤：
```bash
# 配置npm镜像源
npm config set registry https://registry.npmmirror.com/

# 安装依赖
npm install

# 构建应用
npm run build:fast

# 启动服务
PORT=80 npm run serve
```

### 方案3：使用其他Docker构建方式

如果需要继续使用Docker，可以尝试：

1. 使用buildx构建器：
```bash
docker buildx build --platform linux/amd64 -t ruma-demo .
```

2. 预拉取镜像：
```bash
docker pull node:18-alpine
docker pull nginx:alpine
```

3. 使用不同的Dockerfile：
- `Dockerfile.light` - 轻量级构建
- `Dockerfile.ultra-light` - 超轻量级构建
- `Dockerfile.china` - 使用国内镜像源

## 当前状态

✅ **应用已成功部署并运行在80端口**

- 本地访问: http://localhost:80
- 网络访问: http://47.110.231.103:80

## 管理命令

```bash
# 停止服务
pkill -f "node.*server.js"

# 查看运行状态
ps aux | grep node
netstat -tlnp | grep :80

# 重新部署
./deploy-local.sh

# 查看日志
journalctl -u docker  # Docker日志
```

## 建议

1. **优先使用本地构建方式**：网络问题解决后仍然建议保留本地构建选项作为备用方案
2. **定期更新镜像源**：镜像源地址可能会变化，建议定期检查和更新
3. **监控网络连接**：定期检查Docker Hub的连接状态
4. **使用CI/CD**：考虑使用GitHub Actions或其他CI/CD工具进行自动化部署

## 附加资源

- [Docker官方镜像源配置](https://docs.docker.com/registry/recipes/mirror/)
- [国内Docker镜像源列表](https://github.com/docker-library/official-images)
- [npm镜像源配置](https://npmmirror.com/) 