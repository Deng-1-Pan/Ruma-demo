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
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-antd': ['antd'],
          'vendor-charts': ['echarts', 'echarts-for-react'],
          'vendor-d3': ['d3'],
          'vendor-plotly': ['plotly.js-dist-min', 'react-plotly.js'],
          'vendor-utils': ['axios', 'dayjs', 'zustand']
        },
        chunkFileNames: 'js/[name]-[hash:8].js',
        entryFileNames: 'js/[name]-[hash:8].js',
        assetFileNames: (assetInfo) => {
          const ext = assetInfo.name?.split('.').pop() || '';
          if (['css'].includes(ext)) {
            return 'css/[name]-[hash:8].[ext]';
          }
          return 'assets/[name]-[hash:8].[ext]';
        }
      }
    },
    chunkSizeWarningLimit: 500,
    reportCompressedSize: false,
    target: 'es2015',
    cssCodeSplit: true
  }
}) 