/* ============================================================================
   verify.mjs —— 台が正しいかの確かめ。**5案で共有する。ここは触らない**

     node docs/bubble-space-prototype/v5-dom/bench/verify.mjs

   確かめること
     1. bench の解き方（resolve.js）と v4/lab.html の解き方が **同じ答えを出す**
        ── 場面A の泡ぜんぶについて、画面の矩形を比べる。ずれが 0 に近くなければ台が無意味
        （v4 は上にツールバーがあるぶん stage が低いので、stage が 1440×900 になる高さで開く）
     2. どの場面も、泡が画面の中に入っている（画面の外の泡が「描かれずに速く見える」のを防ぐ）
   ============================================================================ */
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROTO = path.resolve(HERE, "../..");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8" };
const srv = http.createServer((req, res) => {
  const p = path.join(PROTO, decodeURIComponent(req.url.split("?")[0]));
  if (!p.startsWith(PROTO) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": MIME[path.extname(p)] ?? "text/plain; charset=utf-8", "cache-control": "no-store" });
  fs.createReadStream(p).pipe(res);
});
const port = await new Promise(r => srv.listen(0, "127.0.0.1", () => r(srv.address().port)));
const br = await chromium.launch({ headless: true });

async function grab(url, h) {
  const page = await br.newPage({ viewport: { width: 1440, height: h }, deviceScaleFactor: 1 });
  await page.goto(url);
  await page.waitForFunction(() => !!window.__lab, null, { timeout: 15000 });
  await page.waitForTimeout(400);
  const out = await page.evaluate(() => {
    const st = (document.getElementById("stage") || document.body).getBoundingClientRect();
    return { stage: { w: st.width, h: st.height, x: st.left, y: st.top },
             ps: window.__lab.placements().map(p => ({ id: p.id, x: p.x, y: p.y, w: p.w, h: p.h, s: p.scale, a: p.alpha, d: p.depth })) };
  });
  await page.close();
  return out;
}

let ng = 0;

/* 1. 解き方がそろっているか */
let v4 = await grab(`http://127.0.0.1:${port}/v4/lab.html`, 900);
const bar = Math.round(900 - v4.stage.h);
v4 = await grab(`http://127.0.0.1:${port}/v4/lab.html`, 900 + bar);
// 泡は「空間の中心」から置かれる（④ 塊の中央を空間の中心に）ので、stage の中心をそろえて比べる
const mid = g => ({ x: g.stage.x + g.stage.w / 2, y: g.stage.y + g.stage.h / 2 });
const M4 = mid(v4);
const be = await grab(`http://127.0.0.1:${port}/v5-dom/bench/canvas.html?scene=A`, 900);
const MB = mid(be);
const m = new Map(be.ps.map(p => [p.id, p]));
let n = 0, worst = 0, worstId = "";
for (const p of v4.ps) {
  const qq = m.get(p.id);
  if (!qq) { ng++; console.log("！ bench に無い泡:", p.id); continue; }
  const d = Math.max(Math.abs((p.x - M4.x) - (qq.x - MB.x)), Math.abs((p.y - M4.y) - (qq.y - MB.y)),
                     Math.abs(p.w - qq.w), Math.abs(p.h - qq.h));
  n++; if (d > worst) { worst = d; worstId = p.id; }
}
console.log(`1. 解き方  v4 の stage ${v4.stage.w}×${v4.stage.h}（ツールバー ${bar}px）／ bench ${be.stage.w}×${be.stage.h}`);
console.log(`   場面A の泡 ${n} 個を比べて、いちばんのずれ ${worst.toFixed(4)}px（${worstId}）　泡の数 v4 ${v4.ps.length} / bench ${be.ps.length}`);
if (worst > 0.01 || v4.ps.length !== be.ps.length) { ng++; console.log("   ！ 解き方がそろっていない"); }

/* 2. どの場面も画面の中に入っているか */
for (const s of ["A", "B", "C"]) {
  const r = await grab(`http://127.0.0.1:${port}/v5-dom/bench/canvas.html?scene=${s}`, 900);
  const on = r.ps.filter(p => p.a > 0.01 && p.w > 0.5 && p.h > 0.5
    && p.x + p.w > 0 && p.x < 1440 && p.y + p.h > 0 && p.y < 900).length;
  const off = r.ps.length - on;
  console.log(`2. 場面${s}  泡 ${r.ps.length}（画面の中 ${on}／外 ${off}）　入れ子 ${Math.max(...r.ps.map(p => p.d))} 段`);
  if (off > 0) { ng++; console.log("   ！ 画面の外に泡がある（描かれずに速く見えてしまう）"); }
}

await br.close(); srv.close();
console.log(ng ? `\n！ ${ng} 件` : "\nぜんぶ通った");
process.exit(ng ? 1 : 0);
