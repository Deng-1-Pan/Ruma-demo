#!/bin/bash

# 最小化部署脚本 - 解决云端构建问题
echo "🚀 开始最小化部署..."

# 停止并删除现有容器
echo "📦 清理现有容器..."
docker stop ruma-demo-app 2>/dev/null || true
docker rm ruma-demo-app 2>/dev/null || true

# 清理旧镜像
echo "🧹 清理旧镜像..."
docker rmi ruma-demo-minimal 2>/dev/null || true

# 构建新镜像（使用最小化Dockerfile）
echo "🔨 构建最小化镜像..."
docker build -f Dockerfile.minimal -t ruma-demo-minimal . --no-cache

if [ $? -eq 0 ]; then
    echo "✅ 镜像构建成功"
    
    # 启动容器
    echo "🚀 启动容器..."
    docker run -d -p 80:80 --name ruma-demo-app ruma-demo-minimal
    
    if [ $? -eq 0 ]; then
        echo "✅ 部署成功！"
        echo "🌐 应用已启动在: http://localhost"
        
        # 显示容器状态
        sleep 2
        docker ps | grep ruma-demo-app
        
        # 显示资源使用情况
        echo ""
        echo "📊 容器资源使用情况:"
        docker stats ruma-demo-app --no-stream
    else
        echo "❌ 容器启动失败"
        exit 1
    fi
else
    echo "❌ 构建失败"
    echo "📋 尝试查看构建日志..."
    docker build -f Dockerfile.minimal -t ruma-demo-minimal . --progress=plain
    exit 1
fi 