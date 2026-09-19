// v6 を1枚の HTML に焼く（file:// で開けるように）。
//   node docs/bubble-space-prototype/v6-bubly/build.mjs
//
// ★ alias で `@bublys-org/bubbles-ui` を身代わりへ向けている。
//   これで **バブリの画面のファイルを1文字も編集せずに** 新しいライブラリへ載る。
import { build } from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'dist');
mkdirSync(OUT, { recursive: true });

const r = await build({
  entryPoints: [path.join(HERE, 'src/main.tsx')],
  bundle: true, write: false, format: 'iife', target: 'es2022',
  jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' },
  alias: { '@bublys-org/bubbles-ui': path.join(HERE, 'src/shim-bubbles-ui.ts') },
  logLevel: 'warning',
});
const js = r.outputFiles[0].text;

writeFileSync(path.join(OUT, 'index.html'), `<!doctype html>
<meta charset="utf-8">
<title>v6 ── バブリで検証</title>
<style>
  *{box-sizing:border-box}
  html,body{margin:0;height:100%;background:#0b0d14;color:#e6ebf5;overflow:hidden;
    font:13px/1.5 -apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP",sans-serif}
  #bar{height:90.5px;background:#141824;border-bottom:1px solid #2a3145;
    padding:0 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  #bar .lbl{font-weight:600}
  #bar .hint{color:#8b95ad;font-size:11.5px}
  #bar .read{font-variant-numeric:tabular-nums;color:#6ee7ff;min-width:52px}
  #bar .sep{width:1px;height:20px;background:#2a3145}
  #bar label{color:#8b95ad;font-size:12px}
  #bar input[type=range]{width:120px;accent-color:#6ee7ff}
</style>
<div id="root"></div>
<script>${js.replace(/<\/script>/g, '<\\/script>')}</script>
`);
console.log('焼いた', path.join(OUT, 'index.html'), (js.length / 1024).toFixed(0) + 'KB');
