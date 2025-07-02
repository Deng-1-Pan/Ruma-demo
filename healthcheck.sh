#!/bin/bash

# RuMa Demo 健康检查脚本
echo "🏥 RuMa Demo 健康检查..."

# 检查Docker部署
if docker-compose ps 2>/dev/null | grep -q "Up"; then
    echo "✅ Docker容器运行正常"
    if curl -f -s http://localhost > /dev/null; then
        echo "✅ Docker服务响应正常"
    fi
fi

# 检查PM2部署
if command -v pm2 &> /dev/null && pm2 list 2>/dev/null | grep -q "ruma-demo.*online"; then
    echo "✅ PM2进程运行正常"
    if curl -f -s http://localhost:3000 > /dev/null; then
        echo "✅ PM2服务响应正常"
    fi
fi

echo "🎉 健康检查完成" 