// React 版の見本を、1枚の HTML に焼く（file:// で開けるように。ES module は CORS で開けない）。
//   node bublys-libs/bubble-layout-ui/demo/build.mjs
import { build } from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'dist');
mkdirSync(OUT, { recursive: true });

const r = await build({
  entryPoints: [path.join(HERE, 'main.tsx')],
  bundle: true, write: false, format: 'iife', target: 'es2022',
  jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'warning',
});
const js = r.outputFiles[0].text;

writeFileSync(path.join(OUT, 'index.html'), `<!doctype html>
<meta charset="utf-8">
<title>泡のならべかた（React 版）</title>
<style>
  *{box-sizing:border-box}
  html,body{margin:0;height:100%;background:#0b0d14;color:#e6ebf5;overflow:hidden;
    font:13px/1.5 -apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP",sans-serif}
</style>
<div id="root"></div>
<script>${js.replace(/<\/script>/g, '<\\/script>')}</script>
`);
console.log('焼いた', path.join(OUT, 'index.html'), (js.length / 1024).toFixed(0) + 'KB');
