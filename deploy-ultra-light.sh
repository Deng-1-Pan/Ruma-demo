#!/bin/bash

# 超轻量级部署脚本 - 30秒完成部署
echo "⚡ 开始超轻量级部署（预计30秒内完成）..."

# 停止现有容器
echo "📦 清理现有容器..."
docker stop ruma-demo-app 2>/dev/null || true
docker rm ruma-demo-app 2>/dev/null || true
docker rmi ruma-demo-ultra 2>/dev/null || true

# 构建超轻量级镜像（只有nginx + 静态页面）
echo "🚀 构建超轻量级镜像..."
start_time=$(date +%s)

docker build -f Dockerfile.ultra-light -t ruma-demo-ultra . --no-cache

end_time=$(date +%s)
build_time=$((end_time - start_time))

if [ $? -eq 0 ]; then
    echo "✅ 镜像构建成功！构建时间: ${build_time}秒"
    
    # 启动容器
    echo "🚀 启动容器..."
    docker run -d -p 80:80 --name ruma-demo-app ruma-demo-ultra
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "🎉 部署成功！"
        echo "🌐 应用地址: http://localhost"
        echo "⏱️  总部署时间: ${build_time}秒"
        echo "📦 镜像大小: $(docker images ruma-demo-ultra --format "{{.Size}}")"
        echo ""
        
        # 显示容器状态
        docker ps | grep ruma-demo-app
        
        echo ""
        echo "🔥 性能对比:"
        echo "   - 原构建时间: 2000+秒 → 现在: ${build_time}秒"
        echo "   - 改进倍数: $((2000 / build_time))x 更快"
        echo "   - 镜像类型: 静态展示页面"
        echo "   - 功能状态: ✅ 演示可用"
        
    else
        echo "❌ 容器启动失败"
        docker logs ruma-demo-app
        exit 1
    fi
else
    echo "❌ 构建失败"
    exit 1
fi 