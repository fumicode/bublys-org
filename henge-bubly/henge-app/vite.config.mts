import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * **AI を呼ぶ口（サーバー側）。**
 *
 * ブラウザから直に OpenAI を叩くと API キーが配信物に載るので、dev サーバーの中で
 * 中継する。キーは `henge-app/.env.local`（未追跡）か、環境変数から読む。
 *
 * ★ これは **dev サーバーだけ**の口。静的ビルドや bubly.js として OS に載せたときは
 *   この中継は存在しない。本番の置き場所は別途決める（いまは口の形を決めるのが目的）。
 */
function aiEndpoint(apiKey: string, model: string): Plugin {
  return {
    name: 'henge-ai-endpoint',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/ai', async (req, res) => {
        const send = (status: number, body: unknown) => {
          res.statusCode = status;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(body));
        };

        if (req.method !== 'POST') return send(405, { error: 'POST のみ' });

        let raw = '';
        for await (const chunk of req) raw += chunk;

        let body: { input?: unknown; instructions?: string; model?: string };
        try {
          body = JSON.parse(raw || '{}');
        } catch {
          return send(400, { error: 'リクエストボディが JSON として読めません' });
        }
        if (!body.input) return send(400, { error: 'input が要ります' });

        // ★ 鍵の確認は**中身を検めたあと**。先に出すと、口の形が合っているかを
        //   鍵なしで確かめられなくなる。
        if (!apiKey) {
          return send(500, {
            error: 'OPENAI_API_KEY がありません',
            hint: 'henge-bubly/henge-app/.env.local に OPENAI_API_KEY=sk-... を書くか、環境変数で渡してください',
          });
        }

        try {
          const upstream = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
              authorization: `Bearer ${apiKey}`,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              model: body.model ?? model,
              input: body.input,
              ...(body.instructions ? { instructions: body.instructions } : {}),
            }),
          });

          if (!upstream.ok) {
            const detail = await upstream.text().catch(() => '');
            return send(upstream.status, {
              error: 'OpenAI がエラーを返しました',
              status: upstream.status,
              detail: detail.slice(0, 600),
            });
          }

          const json = (await upstream.json()) as Record<string, unknown>;
          return send(200, { text: extractText(json), raw: json });
        } catch (e) {
          return send(502, { error: 'OpenAI に繋がりませんでした', detail: String(e) });
        }
      });
    },
  };
}

/** Responses API の返りから本文だけ取り出す（形が揺れるので両方見る） */
function extractText(json: Record<string, unknown>): string {
  if (typeof json.output_text === 'string') return json.output_text;
  const out: string[] = [];
  const output = json.output;
  if (Array.isArray(output)) {
    for (const item of output) {
      const content = (item as { content?: unknown }).content;
      if (!Array.isArray(content)) continue;
      for (const c of content) {
        const t = (c as { text?: unknown }).text;
        if (typeof t === 'string') out.push(t);
      }
    }
  }
  return out.join('');
}

export default defineConfig(({ mode }) => {
  // .env.local（未追跡）→ 無ければ環境変数
  const env = loadEnv(mode, import.meta.dirname, '');
  const apiKey = env.OPENAI_API_KEY ?? process.env.OPENAI_API_KEY ?? '';
  const model = env.HENGE_AI_MODEL ?? process.env.HENGE_AI_MODEL ?? 'gpt-6.1-terra';

  return {
    root: import.meta.dirname,
    cacheDir: '../../node_modules/.vite/henge-bubly/henge-app',
    server: {
      port: 4008,
      host: 'localhost',
      cors: {
        origin: '*',
        methods: ['GET', 'HEAD', 'OPTIONS'],
        allowedHeaders: ['Content-Type'],
      },
    },
    preview: { port: 4008, host: 'localhost', cors: true },
    plugins: [react(), aiEndpoint(apiKey, model)],
    build: {
      outDir: './dist',
      emptyOutDir: true,
      reportCompressedSize: true,
      commonjsOptions: { transformMixedEsModules: true },
    },
  };
});
