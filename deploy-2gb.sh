#!/bin/bash

# RuMa Demo 2GB服务器专用部署脚本
# 针对 2核2GB内存 + 1Mbps带宽 优化

set -e

echo "🚀 === RuMa Demo 2GB服务器部署开始 ==="

# 检查系统信息
echo "📊 系统配置检查..."
echo "CPU核心数: $(nproc)"
echo "内存信息:"
free -h
echo "磁盘空间:"
df -h /

# 系统优化设置
echo "⚙️  系统优化设置..."
# 增加swap文件以缓解内存压力（如果没有swap）
if [ $(swapon --show | wc -l) -eq 0 ]; then
    echo "💾 创建swap文件以优化内存使用..."
    sudo fallocate -l 1G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1024 count=1048576
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "✅ Swap文件创建完成"
fi

# 设置针对2GB内存的Node.js参数
export NODE_OPTIONS="--max-old-space-size=1536"
echo "⚙️  Node.js内存限制: $NODE_OPTIONS"

# 清理系统缓存
echo "🧹 清理系统缓存..."
sudo sync && sudo sysctl -w vm.drop_caches=1 || true
rm -rf dist/ node_modules/.vite || true

# 安装依赖（生产模式，减少包大小）
echo "📦 安装生产依赖..."
if [ ! -d "node_modules" ]; then
    npm ci --production --no-audit --no-fund --prefer-offline
fi

# 构建项目
echo "🔨 构建项目 (2GB优化模式)..."
npm run build:2gb

# 验证构建结果
if [ ! -d "dist" ]; then
    echo "❌ 构建失败，尝试轻量构建..."
    npm run build:light
    if [ ! -d "dist" ]; then
        echo "❌ 构建仍然失败"
        exit 1
    fi
fi

# 显示构建信息
echo "✅ 构建成功！"
DIST_SIZE=$(du -sh dist/ | cut -f1)
echo "📦 构建包大小: $DIST_SIZE (优化用于1Mbps带宽)"
ls -lah dist/

# 安装和配置Nginx
echo "🌐 配置Nginx..."
if ! command -v nginx &> /dev/null; then
    echo "📦 安装Nginx..."
    sudo apt update
    sudo apt install nginx -y
fi

# 复制优化的nginx配置
sudo cp nginx-2gb.conf /etc/nginx/nginx.conf

# 创建网站目录并复制文件
sudo mkdir -p /var/www/html
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html

# 测试nginx配置
sudo nginx -t

# 启动nginx
sudo systemctl enable nginx
sudo systemctl restart nginx

# 安装PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 安装PM2..."
    sudo npm install -g pm2
fi

# 启动React应用（作为nginx的后备）
echo "🚀 启动React应用..."
pm2 delete ruma-demo 2>/dev/null || true
pm2 start "npx serve -s dist -l 3000" --name ruma-demo

# PM2自启动设置
pm2 startup ubuntu
pm2 save

# 配置防火墙
echo "🔒 配置防火墙..."
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
if ! sudo ufw status | grep -q "Status: active"; then
    echo "y" | sudo ufw enable
fi

# 最终检查
echo "🧪 最终检查..."
sleep 3

# 检查服务状态
echo "📊 服务状态检查:"
echo "Nginx状态:"
sudo systemctl status nginx --no-pager -l
echo "PM2状态:"
pm2 status

# 测试访问
echo "🌐 测试应用访问..."
if curl -f http://localhost > /dev/null 2>&1; then
    PUBLIC_IP=$(curl -s ifconfig.me)
    echo "✅ 部署成功！"
    echo "🌍 访问地址: http://$PUBLIC_IP"
    echo "📈 针对1Mbps带宽已优化，启用了Gzip压缩"
else
    echo "❌ 访问测试失败，检查日志:"
    sudo nginx -T
    pm2 logs ruma-demo --lines 10
fi

echo "🎉 === 2GB服务器部署完成 ==="
echo "📝 管理命令:"
echo "   重启Nginx: sudo systemctl restart nginx"
echo "   重启应用: pm2 restart ruma-demo"
echo "   查看日志: pm2 logs ruma-demo"
echo "   系统状态: free -h && pm2 status"
echo "   测试访问: curl -I http://localhost" 