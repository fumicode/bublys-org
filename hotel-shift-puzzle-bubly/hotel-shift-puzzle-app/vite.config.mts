/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/hotel-shift-puzzle-bubly/hotel-shift-puzzle-app',
  server: {
    port: 4006,
    host: 'localhost',
    // CORSヘッダーを追加（他のオリジンからバブリを読み込めるように）
    cors: {
      origin: '*',
      methods: ['GET', 'HEAD', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
    },
  },
  preview: {
    port: 4006,
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
