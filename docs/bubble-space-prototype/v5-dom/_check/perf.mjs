// FINDINGS.md の描き方をほんとうに守れているか（書いた回数と、1フレームにかかった時間）
//   node docs/bubble-space-prototype/v5-dom/_check/perf.mjs
import { openLab, ok, num } from "./lab.mjs";

const lab = await openLab();
await lab.settle();

// ── 1. 落ち着いているとき：何も書かない ──
await lab.call("stats");
await lab.page.waitForTimeout(700);
const rest = await lab.call("stats");
console.log(`  落ち着いているとき（${rest.frames} フレーム・のべ ${rest.els} 個）`);
console.log(`    transform ${rest.tf} ／ 大きさ ${rest.wh} ／ 逆scale ${rest.k} ／ z-index ${rest.z}`
          + ` ／ class ${rest.cls} ／ opacity ${rest.op} ／ display ${rest.dsp}`);
ok(rest.frames > 20, `まわっている（${rest.frames} フレーム）`);
ok(rest.tf + rest.wh + rest.k + rest.z + rest.cls + rest.op + rest.dsp === 0, "動いていないときは1つも書かない");

// ── 2. ドラッグしているとき：書くのは transform だけか ──
await lab.call("stats");
const p = await lab.headerPointOf("memo1");
await lab.page.mouse.move(p.x, p.y); await lab.page.mouse.down();
for (let i = 1; i <= 30; i++) { await lab.page.mouse.move(p.x + i * 6, p.y + i * 3); await lab.page.waitForTimeout(10); }
await lab.page.mouse.up();
const dr = await lab.call("stats");
console.log(`  メモを 180px ドラッグするあいだ（${dr.frames} フレーム・のべ ${dr.els} 個）`);
console.log(`    transform ${dr.tf} ／ 大きさ ${dr.wh} ／ 逆scale ${dr.k} ／ z-index ${dr.z}`
          + ` ／ class ${dr.cls} ／ opacity ${dr.op} ／ display ${dr.dsp}`);
ok(dr.tf > 0, "transform は書いている");
ok(dr.wh <= 2, `箱の大きさ（width/height）はほとんど書かない（${dr.wh} 回 / のべ ${dr.els} 個ぶん。書くのは箱が伸び縮みした泡だけ）`);
ok(dr.k <= dr.tf * 0.05, `逆 scale（--k）はほとんど書かない（${dr.k} 回 / transform ${dr.tf} 回）`);
await lab.settle();

// ── 3. 1フレームにかかる時間 ──
const ms = await lab.page.evaluate(() => {
  const L = window.__lab, t = [];
  for (let i = 0; i < 60; i++) { const a = performance.now(); L.frame(); t.push(performance.now() - a); }
  t.sort((x, y) => x - y);
  return { n: t.length, med: t[30], p95: t[57], max: t[59] };
});
console.log(`  frame()（解く＋DOM へ写す＋説明パネル）60 回：中央 ${num(ms.med, 3)}ms ／ p95 ${num(ms.p95, 3)}ms ／ 最大 ${num(ms.max, 3)}ms`);
ok(ms.med < 8, `1フレーム 8ms 未満（中央 ${num(ms.med, 3)}ms）`);

// ── 4. 切り抜きをしていない（規則）──
const clip = await lab.page.evaluate(() => {
  const bad = [];
  for (const el of document.querySelectorAll("#layer .bub")) {
    const s = getComputedStyle(el);
    if (s.overflowX !== "visible" || s.overflowY !== "visible") bad.push([el.dataset.id, "overflow " + s.overflow]);
    if (/paint|size/.test(s.contain)) bad.push([el.dataset.id, "contain " + s.contain]);
    if (s.contentVisibility && s.contentVisibility !== "visible") bad.push([el.dataset.id, "content-visibility " + s.contentVisibility]);
    if (s.clipPath !== "none") bad.push([el.dataset.id, "clip-path " + s.clipPath]);
    if (s.willChange !== "auto") bad.push([el.dataset.id, "will-change " + s.willChange]);
  }
  return bad.slice(0, 6);
});
ok(clip.length === 0, `泡に切り抜き（overflow/contain:paint/content-visibility/clip-path）も will-change も無い（${JSON.stringify(clip)}）`);

// ── 5. 泡は全部1枚の層の兄弟（DOM の入れ子にしていない）──
const flat = await lab.page.evaluate(() => {
  const els = [...document.querySelectorAll("#layer .bub")];
  return { n: els.length, nested: els.filter((e) => e.parentElement.id !== "layer").length,
           zs: els.map((e) => +e.style.zIndex) };
});
const order = await lab.placements();
const zOk = order.every((p, i) => flat.zs[[...order].findIndex((q) => q.id === p.id)] !== undefined);
console.log(`  #layer の直下に ${flat.n} 個／入れ子になっているもの ${flat.nested} 個`);
ok(flat.nested === 0, "泡は全部1枚の層の兄弟（DOM の入れ子にしていない）");
const byZ = await lab.page.evaluate(() => [...document.querySelectorAll("#layer .bub")]
  .sort((a, b) => +a.style.zIndex - +b.style.zIndex).map((e) => e.dataset.id));
ok(byZ.join() === order.map((p) => p.id).join(), "z-index の並びが、解いた描く順とぴったり同じ");

const errs = lab.errors();
ok(errs.length === 0, `コンソールエラー 0（${errs.length}）`);
await lab.close();
