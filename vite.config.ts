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
    minify: 'esbuild',
    target: 'es2020',
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1000,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          antd: ['antd'],
          utils: ['axios', 'dayjs', 'zustand']
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
    }
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'antd',
      'axios',
      'dayjs',
      'zustand'
    ]
  }
}) 