import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  preview: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
        passes: 3,
        unsafe: true,
        unsafe_arrows: true,
        unsafe_comps: true,
        unsafe_methods: true
      },
      mangle: {
        safari10: true
      }
    },
    rollupOptions: {
      treeshake: {
        preset: 'recommended',
        moduleSideEffects: false
      },
      output: {
        manualChunks: (id) => {
          // React 相关
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          // React Router
          if (id.includes('node_modules/react-router')) {
            return 'vendor-router';
          }
          // Antd UI库
          if (id.includes('node_modules/antd') || id.includes('node_modules/@ant-design')) {
            return 'vendor-antd';
          }
          // 图表库 - 分别处理以避免单个chunk过大
          if (id.includes('node_modules/echarts')) {
            return 'vendor-echarts';
          }
          if (id.includes('node_modules/plotly') || id.includes('node_modules/react-plotly')) {
            return 'vendor-plotly';
          }
          if (id.includes('node_modules/d3')) {
            return 'vendor-d3';
          }
          // 工具库
          if (id.includes('node_modules/axios')) {
            return 'vendor-axios';
          }
          if (id.includes('node_modules/dayjs')) {
            return 'vendor-dayjs';
          }
          if (id.includes('node_modules/zustand')) {
            return 'vendor-zustand';
          }
          // Socket.io
          if (id.includes('node_modules/socket.io')) {
            return 'vendor-socket';
          }
          // 其他node_modules
          if (id.includes('node_modules')) {
            return 'vendor-misc';
          }
          // 按页面和组件分割
          if (id.includes('src/pages/')) {
            return 'pages';
          }
          if (id.includes('src/components/visualization/')) {
            return 'components-viz';
          }
          if (id.includes('src/components/')) {
            return 'components';
          }
        },
        chunkFileNames: 'js/[name]-[hash:8].js',
        entryFileNames: 'js/[name]-[hash:8].js',
        assetFileNames: (assetInfo) => {
          const ext = assetInfo.name?.split('.').pop() || '';
          if (['css'].includes(ext)) {
            return 'css/[name]-[hash:8].[ext]';
          }
          if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) {
            return 'images/[name]-[hash:8].[ext]';
          }
          return 'assets/[name]-[hash:8].[ext]';
        }
      }
    },
    chunkSizeWarningLimit: 800,
    reportCompressedSize: false,
    target: 'es2020',
    cssCodeSplit: true,
    // 增加构建性能
    assetsInlineLimit: 4096
  },
  // 优化依赖预构建
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'antd',
      'axios',
      'dayjs',
      'zustand'
    ],
    exclude: [
      'plotly.js-dist-min',
      'echarts',
      'd3'
    ]
  }
}) 