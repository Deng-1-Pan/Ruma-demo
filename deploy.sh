#!/bin/bash

# RuMa Demo 部署脚本
# 用于在阿里云ECS上部署应用

set -e

echo "🚀 开始部署 RuMa Demo..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker 未安装，请先安装 Docker${NC}"
    exit 1
fi

# 检查docker-compose是否安装
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ docker-compose 未安装，请先安装 docker-compose${NC}"
    exit 1
fi

# 停止并移除现有容器
echo -e "${YELLOW}🛑 停止现有容器...${NC}"
docker-compose down || true

# 清理旧镜像
echo -e "${YELLOW}🧹 清理旧镜像...${NC}"
docker system prune -f

# 构建并启动新容器
echo -e "${YELLOW}🔨 构建应用镜像...${NC}"
docker-compose build --no-cache

echo -e "${YELLOW}🚀 启动应用容器...${NC}"
docker-compose up -d

# 等待容器启动
echo -e "${YELLOW}⏳ 等待应用启动...${NC}"
sleep 10

# 检查容器状态
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✅ 部署成功！${NC}"
    echo -e "${GREEN}🌐 应用已在 http://您的服务器IP 上运行${NC}"
    echo -e "${GREEN}📊 查看容器状态: docker-compose ps${NC}"
else
    echo -e "${RED}❌ 部署失败，请检查错误日志${NC}"
    echo -e "${RED}📋 查看日志: docker-compose logs${NC}"
    exit 1
fi

echo -e "${GREEN}✨ 部署完成！${NC}" 