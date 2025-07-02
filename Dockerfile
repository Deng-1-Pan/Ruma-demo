# 使用官方Node.js镜像作为构建环境
FROM node:18-alpine as build

# 设置工作目录
WORKDIR /app

# 设置npm配置以提高安装速度
RUN npm config set registry https://registry.npmmirror.com/

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装所有依赖（包括devDependencies用于构建）
RUN rm -f package-lock.json && \
    npm install && \
    npm rebuild

# 复制源代码
COPY . .

# 设置Node.js内存限制并构建应用（使用Docker优化构建）
RUN npm run build:docker

# 使用nginx作为生产环境服务器
FROM nginx:alpine

# 复制构建后的文件到nginx目录
COPY --from=build /app/dist /usr/share/nginx/html

# 复制nginx配置文件
COPY nginx.conf /etc/nginx/nginx.conf

# 暴露端口
EXPOSE 80

# 添加健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# 启动nginx
CMD ["nginx", "-g", "daemon off;"] 