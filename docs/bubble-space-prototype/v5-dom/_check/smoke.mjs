// file:// で開くだけで動くか。泡が出るか。コンソールエラー 0 か。
import { openLab, ok, num } from "./lab.mjs";

const lab = await openLab();
await lab.settle();

const ps = await lab.placements();
const dom = await lab.domCount();
console.log(`泡の配置 ${ps.length} 個 ／ #layer の .bub 要素 ${dom} 個`);
ok(ps.length > 40, `配置が出ている（${ps.length}）`);
ok(dom === ps.length, `DOM の要素数が配置と同じ（${dom} / ${ps.length}）`);

// 6場面の代表が画面の中にいるか
const W = 1440, H = 900;
for (const id of ["memo1", "row", "cover", "fish", "giji", "kinmu", "fA", "fB", "fC"]) {
  const r = await lab.rect(id);
  ok(r && r.w > 1 && r.x > -50 && r.x < W && r.y > -50 && r.y < H,
     `${id} が画面に出ている ${r ? `(${num(r.x)},${num(r.y)}) ${num(r.w)}x${num(r.h)}` : "なし"}`);
}

// 実際に描けているか（DOM の getBoundingClientRect と、解いた配置が合うか）
const diff = await lab.page.evaluate(() => {
  const out = [];
  for (const p of window.__lab.placements()) {
    const el = document.querySelector(`#layer .bub[data-id="${p.id}"]`);
    if (!el) { out.push([p.id, "要素なし", 999]); continue; }
    const r = el.getBoundingClientRect();
    out.push([p.id, "", Math.max(Math.abs(r.left - p.x), Math.abs(r.top - p.y), Math.abs(r.width - p.w), Math.abs(r.height - p.h))]);
  }
  return out;
});
const worst = diff.sort((a, b) => b[2] - a[2])[0];
ok(worst[2] < 0.6, `解いた配置と DOM の実測がそろっている（最大ずれ ${num(worst[2], 3)}px・${worst[0]}）`);

await lab.shot("smoke");
const errs = lab.errors();
ok(errs.length === 0, `コンソールエラー・ネットワーク 0（${errs.length}）`);
errs.forEach((e) => console.log("      " + e));
await lab.close();
