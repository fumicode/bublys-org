import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  /**
   * AI の鍵は `henge-app/.env.local`（未追跡）か環境変数から読み、
   * **ブラウザへそのまま渡す。** バックエンドは持たない（フロントだけで完結）。
   *
   * ★ 渡した鍵は配信される JS に載る。公開する URL では誰でも取り出せるので、
   *   OpenAI 側で利用上限を低くしておくこと。
   * ★ bubly.js のビルド（vite.config.bubly.ts）には渡さない。
   */
  const env = loadEnv(mode, import.meta.dirname, '');
  const apiKey = env.OPENAI_API_KEY ?? process.env.OPENAI_API_KEY ?? '';
  const model = env.HENGE_AI_MODEL ?? process.env.HENGE_AI_MODEL ?? '';

  return {
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
    preview: { port: 4008, host: 'localhost', cors: true },
    define: {
      __HENGE_OPENAI_API_KEY__: JSON.stringify(apiKey),
      __HENGE_AI_MODEL__: JSON.stringify(model),
    },
    plugins: [react()],
    build: {
      outDir: './dist',
      emptyOutDir: true,
      reportCompressedSize: true,
      commonjsOptions: { transformMixedEsModules: true },
    },
  };
});
