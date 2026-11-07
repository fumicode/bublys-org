import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/henge-bubly/henge-app',
  server: {
    port: 4008,
    host: 'localhost',
    // 他のオリジンから bubly.js を読み込めるように
    cors: {
      origin: '*',
      methods: ['GET', 'HEAD', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
    },
  },
  preview: {
    port: 4008,
    host: 'localhost',
    cors: true,
  },
  plugins: [react()],
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
}));
