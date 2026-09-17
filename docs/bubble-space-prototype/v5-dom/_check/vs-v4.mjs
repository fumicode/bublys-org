// canvas 版 v4 と DOM 版 v5 を、同じ手で開いて配置を突き合わせる（v4 は読むだけ）
import { openLab, ok, num, V5 } from "./lab.mjs";
import path from "node:path";

const V4 = path.resolve(V5, "../v4/lab.html");
const a = await openLab(V4), b = await openLab();
await a.settle(); await b.settle();
const A = new Map((await a.placements()).map((p) => [p.id, p]));
const B = new Map((await b.placements()).map((p) => [p.id, p]));

ok(A.size === B.size, `泡の数が同じ（v4 ${A.size} / v5 ${B.size}）`);
let worst = { d: 0 }, n = 0;
for (const [id, p] of A) {
  const q = B.get(id);
  if (!q) { console.log(`  NG   ${id} が v5 に無い`); continue; }
  const d = Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y), Math.abs(p.w - q.w), Math.abs(p.h - q.h));
  if (d > worst.d) worst = { d, id, p, q };
  if (Math.abs(p.scale - q.scale) > 1e-6) n++;
}
ok(worst.d < 0.01, `配置が1つも変わっていない（最大ずれ ${num(worst.d, 4)}px${worst.id ? " ・" + worst.id : ""}）`);
ok(n === 0, `倍率も全部同じ（違う泡 ${n} 個）`);

// 描く順（z-index の元）が同じか
const oa = (await a.placements()).map((p) => p.id).join(",");
const ob = (await b.placements()).map((p) => p.id).join(",");
ok(oa === ob, "描く順（＝ z-index の並び）が v4 と同じ");

await a.shot("v4-ref");
await b.shot("v5-ref");
await a.close(); await b.close();
