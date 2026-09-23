// 実験 C/D の触れる版を 1 枚の HTML に焼く。
//   node docs/bubble-space-prototype/v7-convergence/noz/build.mjs [出力先]
import { build } from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] ? path.resolve(process.argv[2]) : path.join(HERE, 'dist/index.html');
mkdirSync(path.dirname(out), { recursive: true });

const r = await build({
  entryPoints: [path.join(HERE, 'main.tsx')],
  bundle: true, write: false, format: 'iife', target: 'es2022',
  jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' },
  conditions: ['@bublys-org/source'], logLevel: 'warning',
});

writeFileSync(out, `<!doctype html>
<meta charset="utf-8">
<title>Z は要るか ── 実験 C/D</title>
<style>
  *{box-sizing:border-box}
  html,body{margin:0;height:100%;background:#0b0d14;color:#e6ebf5;overflow:hidden;
    font:13px/1.5 -apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP",sans-serif}
  #bar{display:flex;align-items:center;gap:10px;height:40px;padding:0 14px;border-bottom:1px solid #222838}
  #bar .sep{width:1px;height:18px;background:#2a3145}
  #bar .hint{color:#8792ab}
  button{font:inherit;padding:4px 12px;border-radius:7px;border:1px solid #2a3145;background:#141a2b;color:#cfd8ea;cursor:pointer}
  button.on{border-color:#4d8dff;background:#16233f;color:#dce8ff}
  #read{display:flex;gap:8px;align-items:center;height:38px;padding:0 14px;border-bottom:1px solid #222838}
  .chip{background:#141a2b;border:1px solid #222838;border-radius:999px;padding:2px 10px}
  .chip b{color:#8ec5ff}
  .chip.dim{border:0;background:none;color:#6b7590}
</style>
<div id="root"></div>
<script>${r.outputFiles[0].text.replace(/<\/script>/g, '<\\/script>')}</script>
`);
console.log('焼いた', out, (r.outputFiles[0].text.length / 1024 | 0) + 'KB');
