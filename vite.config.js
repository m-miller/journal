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
        '/api/prompt': `http://localhost:${env.PORT || 3001}`,
      },
    },
  };
});