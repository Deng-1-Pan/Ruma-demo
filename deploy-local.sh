#!/bin/bash

# RuMa Demo 本地部署脚本
# 当Docker网络连接有问题时使用此脚本

echo "🚀 开始本地部署 RuMa Demo..."

# 设置npm镜像源
echo "📝 配置npm镜像源..."
npm config set registry https://registry.npmmirror.com/

# 安装依赖
echo "📦 安装依赖..."
npm install

# 检查是否安装成功
if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

# 构建应用
echo "🔨 构建应用..."
npm run build:fast

# 检查构建是否成功
if [ $? -ne 0 ]; then
    echo "❌ 构建失败"
    exit 1
fi

# 停止已运行的服务
echo "🛑 停止已运行的服务..."
pkill -f "node.*server.js" 2>/dev/null

# 启动服务
echo "🌟 启动服务..."
PORT=80 npm run serve &

# 等待服务启动
sleep 3

# 检查服务是否启动成功
if netstat -tlnp | grep -q ":80.*LISTEN"; then
    echo "✅ 部署成功！"
    echo "🌐 应用已在以下地址运行："
    echo "   本地访问: http://localhost:80"
    echo "   网络访问: http://47.110.231.103:80"
    echo ""
    echo "📋 管理命令："
    echo "   停止服务: pkill -f \"node.*server.js\""
    echo "   查看日志: ps aux | grep node"
    echo "   重新部署: bash deploy-local.sh"
else
    echo "❌ 服务启动失败"
    exit 1
fi 