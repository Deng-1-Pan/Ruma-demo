# RuMa Demo 部署指南

本文档详细介绍如何在阿里云ECS上部署RuMa情感支持聊天机器人前端演示应用。

## 🚀 快速开始（推荐方式一：Docker部署）

### 前置要求

1. **服务器配置**
   - CPU: 1核心及以上
   - 内存: 1GB及以上
   - 磁盘: 10GB及以上可用空间
   - 系统: Ubuntu 18.04+ / CentOS 7+ / Debian 9+

2. **软件依赖**
   - Docker 20.0+
   - docker-compose 1.28+

### 安装Docker和docker-compose

#### Ubuntu/Debian系统
```bash
# 更新包索引
sudo apt update

# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装docker-compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 将当前用户添加到docker组
sudo usermod -aG docker $USER
```

#### CentOS/RHEL系统
```bash
# 安装Docker
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io

# 启动Docker服务
sudo systemctl start docker
sudo systemctl enable docker

# 安装docker-compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 部署步骤

1. **克隆项目**
```bash
git clone https://github.com/your-username/ruma-demo.git
cd ruma-demo
```

2. **运行部署脚本**
```bash
# 给脚本添加执行权限
chmod +x deploy.sh

# 执行部署
./deploy.sh
```

3. **验证部署**
- 访问 `http://您的服务器IP` 查看应用
- 使用 `docker-compose ps` 检查容器状态
- 使用 `docker-compose logs` 查看日志

## 🛠️ 方式二：传统npm部署

### 前置要求

1. **Node.js环境**
   - Node.js 18.0+
   - npm 8.0+

2. **安装Node.js**
```bash
# 使用NodeSource仓库安装（推荐）
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 或者使用nvm安装
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

### 部署步骤

1. **克隆项目**
```bash
git clone https://github.com/your-username/ruma-demo.git
cd ruma-demo
```

2. **运行快速部署脚本**
```bash
# 给脚本添加执行权限
chmod +x quick-deploy.sh

# 执行部署
./quick-deploy.sh
```

3. **验证部署**
- 访问 `http://您的服务器IP:3000` 查看应用
- 使用 `pm2 status` 检查应用状态
- 使用 `pm2 logs` 查看日志

## 🔧 手动部署步骤

如果自动化脚本无法运行，可以手动执行以下步骤：

### Docker方式
```bash
# 1. 构建镜像
docker build -t ruma-demo .

# 2. 运行容器
docker run -d -p 80:80 --name ruma-demo-app ruma-demo

# 3. 检查状态
docker ps
```

### 传统方式
```bash
# 1. 安装依赖
npm install

# 2. 构建项目
npm run build

# 3. 安装serve（全局）
npm install -g serve

# 4. 启动服务
serve -s dist -l 3000

# 或使用PM2管理进程
npm install -g pm2
pm2 start "serve -s dist -l 3000" --name ruma-demo
```

## 🔒 生产环境配置

### 1. 配置防火墙

```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS（如果需要SSL）
sudo ufw enable

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 2. 配置Nginx反向代理（可选）

如果需要自定义域名或SSL证书：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;  # 传统部署方式
        # 或者直接配置静态文件服务（Docker方式不需要）
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. 设置SSL证书（使用Let's Encrypt）

```bash
# 安装certbot
sudo apt install certbot python3-certbot-nginx

# 获取SSL证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo crontab -e
# 添加以下行：
# 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 监控和维护

### Docker方式

```bash
# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 重启应用
docker-compose restart

# 更新应用
git pull
./deploy.sh

# 清理旧镜像
docker system prune -f
```

### 传统方式

```bash
# 查看PM2状态
pm2 status

# 查看日志
pm2 logs ruma-demo

# 重启应用
pm2 restart ruma-demo

# 更新应用
git pull
npm run build
pm2 restart ruma-demo

# 查看系统资源使用
pm2 monit
```

## 🚨 常见问题解决

### 1. 端口被占用
```bash
# 查看端口占用
sudo netstat -tlnp | grep :80
# 或
sudo lsof -i :80

# 停止占用端口的进程
sudo kill -9 <PID>
```

### 2. 权限问题
```bash
# 修复文件权限
sudo chown -R $USER:$USER /path/to/ruma-demo
chmod +x deploy.sh quick-deploy.sh
```

### 3. 内存不足
```bash
# 检查内存使用
free -h

# 如果使用Docker，限制容器内存
docker run -m 512m -d -p 80:80 ruma-demo
```

### 4. 构建失败
```bash
# 清理npm缓存
npm cache clean --force

# 删除node_modules重新安装
rm -rf node_modules package-lock.json
npm install
```

## 📈 性能优化建议

1. **启用Gzip压缩**：nginx配置中已包含
2. **使用CDN**：将静态资源部署到CDN
3. **配置缓存**：设置适当的HTTP缓存头
4. **监控资源使用**：使用htop、pm2 monit等工具
5. **定期更新**：保持系统和依赖项最新

## 🆘 获取帮助

如果遇到部署问题，可以：

1. 查看详细日志：`docker-compose logs` 或 `pm2 logs`
2. 检查系统资源：`top`、`df -h`、`free -h`
3. 验证网络连接：`curl localhost` 或 `wget localhost`
4. 查看端口监听：`ss -tlnp`

---

## 📝 部署完成检查清单

- [ ] 服务器环境准备完成
- [ ] 项目成功构建
- [ ] 应用正常启动
- [ ] 端口正确开放
- [ ] 防火墙配置正确
- [ ] 域名解析配置（如果有）
- [ ] SSL证书配置（如果需要）
- [ ] 监控和日志配置完成

部署完成后，你的RuMa Demo应用就可以在生产环境中稳定运行了！ 