import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        }
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        timeout: 900000,        // 15 minutes for large file uploads
        proxyTimeout: 900000,   // Backend processing timeout
        secure: false,
        ws: true,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('[Proxy Error]', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Log large uploads
            const len = req.headers['content-length'];
            if (len && parseInt(len) > 10 * 1024 * 1024) {
              const mb = (parseInt(len) / (1024 * 1024)).toFixed(1);
              console.log(`[Proxy] Large upload: ${mb} MB to ${req.url}`);
            }
          });
        }
      }
    }
  }
})
