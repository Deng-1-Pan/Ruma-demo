#!/bin/bash

# RuMa Demo 快速部署脚本 - 优化版
# 适用于内存有限的服务器环境

set -e  # 遇到错误时退出

echo "🚀 === RuMa Demo 快速部署开始 ==="

# 检查系统内存
echo "📊 检查系统资源..."
free -h

# 设置Node.js内存限制 - 针对2GB服务器优化
export NODE_OPTIONS="--max-old-space-size=1536"
echo "⚙️  设置Node.js内存限制: $NODE_OPTIONS (针对2GB服务器优化)"

# 清理旧的构建缓存
echo "🧹 清理构建缓存..."
rm -rf dist/ node_modules/.vite || true

# 检查并安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装项目依赖..."
    npm ci --only=production --no-audit --no-fund
fi

# 智能选择构建方式 - 针对2GB服务器调整阈值
echo "🔨 开始构建项目..."
TOTAL_MEM=$(free -m | awk 'NR==2{print $2}')
AVAILABLE_MEM=$(free -m | awk 'NR==2{print $7}')
echo "💾 系统总内存: ${TOTAL_MEM}MB"
echo "💾 可用内存: ${AVAILABLE_MEM}MB"

if [ $AVAILABLE_MEM -gt 1200 ]; then
    echo "✅ 可用内存充足，使用2GB优化构建"
    npm run build:2gb
elif [ $AVAILABLE_MEM -gt 800 ]; then
    echo "⚠️  内存紧张，使用轻量构建"
    npm run build:light
else
    echo "🚨 内存严重不足，释放内存后使用最小构建"
    # 释放系统缓存
    sudo sync && sudo sysctl -w vm.drop_caches=3 || true
    export NODE_OPTIONS="--max-old-space-size=1024"
    npm run build:light
fi

# 检查构建结果
if [ ! -d "dist" ]; then
    echo "❌ 构建失败：dist目录不存在"
    echo "💡 尝试清理并重新构建..."
    rm -rf node_modules/.vite
    npm run build:light
    if [ ! -d "dist" ]; then
        echo "❌ 重新构建仍失败，请检查系统资源"
        exit 1
    fi
fi

echo "✅ 构建完成！"
ls -lah dist/

# 显示构建结果大小（针对1Mbps带宽优化提醒）
DIST_SIZE=$(du -sh dist/ | cut -f1)
echo "📦 构建包大小: $DIST_SIZE"
if [ -d "dist/js" ]; then
    echo "📄 JavaScript文件:"
    ls -lah dist/js/ | head -5
fi
if [ -d "dist/css" ]; then
    echo "🎨 CSS文件:"
    ls -lah dist/css/ | head -3
fi

# 安装PM2（如果未安装）
if ! command -v pm2 &> /dev/null; then
    echo "📦 安装PM2..."
    sudo npm install -g pm2
fi

# 停止旧的进程
echo "🔄 停止旧的应用进程..."
pm2 delete ruma-demo 2>/dev/null || true

# 启动应用
echo "🚀 启动RuMa Demo应用..."
pm2 start "npx serve -s dist -l 3000" --name ruma-demo

# 设置开机自启
pm2 startup ubuntu
pm2 save

# 检查应用状态
echo "📊 检查应用状态..."
pm2 status

# 测试应用
echo "🧪 测试应用访问..."
sleep 3
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ 应用启动成功！"
    echo "🌐 访问链接: http://$(curl -s ifconfig.me):3000"
else
    echo "❌ 应用启动失败，请查看日志："
    pm2 logs ruma-demo --lines 20
    exit 1
fi

echo "🎉 === RuMa Demo 部署完成 ==="
echo "📝 常用命令："
echo "   查看状态: pm2 status" 
echo "   查看日志: pm2 logs ruma-demo"
echo "   重启应用: pm2 restart ruma-demo"
echo "   停止应用: pm2 stop ruma-demo" 