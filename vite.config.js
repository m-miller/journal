import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      proxy: {
        // Journal API (Express + PostgreSQL in /server).
        '/api/entries': `http://localhost:${env.PORT || 3001}`,
        '/api/images': `http://localhost:${env.PORT || 3001}`,
        '/api/export': `http://localhost:${env.PORT || 3001}`,
        // Browser calls /api/anthropic/... and the dev server forwards it to the
        // Anthropic API with your key attached, so the key never reaches the browser.
        // Dev only: for production, replace this with an endpoint on your own backend.
        '/api/anthropic': {
          target: 'https://api.anthropic.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('origin');
              proxyReq.setHeader('x-api-key', env.ANTHROPIC_API_KEY || '');
              proxyReq.setHeader('anthropic-version', '2023-06-01');
            });
          },
        },
      },
    },
  };
});
