#!/bin/bash

# RuMa Demo 快速部署脚本（传统方式）
# 用于直接在服务器上运行，无需Docker

set -e

echo "🚀 开始快速部署 RuMa Demo..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查Node.js版本
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js 未安装，请先安装 Node.js 18+${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//')
REQUIRED_VERSION="18.0.0"
if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo -e "${RED}❌ Node.js 版本过低，需要 18.0.0 或更高版本${NC}"
    exit 1
fi

# 安装依赖
echo -e "${YELLOW}📦 安装依赖...${NC}"
npm install

# 构建项目
echo -e "${YELLOW}🔨 构建项目...${NC}"
npm run build

# 检查构建是否成功
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ 构建失败，dist 目录不存在${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 构建成功！${NC}"

# 安装PM2（如果未安装）
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}📦 安装 PM2...${NC}"
    npm install -g pm2
fi

# 创建PM2配置文件
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'ruma-demo',
    script: 'npx serve dist -s -l 3000',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
EOF

# 停止现有进程
echo -e "${YELLOW}🛑 停止现有进程...${NC}"
pm2 stop ruma-demo || true
pm2 delete ruma-demo || true

# 启动应用
echo -e "${YELLOW}🚀 启动应用...${NC}"
pm2 start ecosystem.config.js

# 保存PM2配置
pm2 save
pm2 startup

echo -e "${GREEN}✅ 快速部署成功！${NC}"
echo -e "${GREEN}🌐 应用已在端口 3000 上运行${NC}"
echo -e "${GREEN}📊 查看应用状态: pm2 status${NC}"
echo -e "${GREEN}📋 查看日志: pm2 logs ruma-demo${NC}"
echo -e "${GREEN}🔄 重启应用: pm2 restart ruma-demo${NC}"

echo -e "${GREEN}✨ 部署完成！${NC}" 