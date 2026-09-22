// 規則① 泡の見え方は、親の View で決まる ── 深さ n でも scale は数値1つ（各段の局所倍率の積）
//   node docs/bubble-space-prototype/v4/_check/rule1.mjs
import { openLab, V4, SHOT_DIR } from "./lab.mjs";

const lab = await openLab(`${V4}/lab.html`);
let ng = 0;
const ok = (c, msg) => { console.log(`${c ? "  OK " : "  NG "} ${msg}`); if (!c) ng++; };

// 深さ3の鎖：外の空間 → 勤務表（奥 z=0.4・透視）→ カレンダー → 日
// どの段も倍率 1 のままでは積の確かめにならないので、勤務表とカレンダーの X を魚眼にして各段を曲げる
await lab.call("setAxis", "kinmu", "x", { lens: "fisheye" });
await lab.call("setAxis", "cal", "x", { lens: "fisheye" });
await lab.settle();

const ps = await lab.placements();
const byId = Object.fromEntries(ps.map((p) => [p.id, p]));
const deep = ps.filter((p) => p.depth >= 3).sort((a, b) => a.scale - b.scale);
console.log(`深さ3以上の泡 ${deep.length}（最大の深さ ${Math.max(...ps.map((p) => p.depth))}）`);

for (const p of [byId.d0, byId.d3, byId.d6]) {
  const chain = [];
  for (let q = p; q; q = q.space === "root" ? null : byId[q.space]) chain.unshift(q.local);
  const prod = chain.reduce((a, b) => a * b, 1);
  const d = Math.abs(prod - p.scale);
  console.log(`  ${p.id.padEnd(4)} 深さ${p.depth}  scale ${p.scale.toFixed(6)}  ＝ ${chain.map((v) => v.toFixed(6)).join(" × ")}  差 ${d.toExponential(1)}`);
  ok(d < 1e-9, `${p.id}：合成 scale は各段の積（数値1つ）`);
  ok(chain.length === p.depth && chain.every((v) => typeof v === "number"), `${p.id}：段は ${p.depth} 個、どれも数値1つ`);
}
// 段のどれかが 1 でない＝ほんとうに曲がっているか
const chain0 = [];
for (let q = byId.d0; q; q = q.space === "root" ? null : byId[q.space]) chain0.unshift(q.local);
ok(chain0.filter((v) => Math.abs(v - 1) > 1e-6).length >= 3, `1 でない段が3つ以上ある（積であることが意味を持つ）`);

// 入れ子の中の泡は、親の View だけで決まる ── 外側で何が起きても、カレンダーの中の配置（親の箱を基準にした局所座標）は変わらない
const local = (ps) => { const c = ps.find((p) => p.id === "cal");
  return ps.filter((p) => p.space === "cal").map((p) => ({ id: p.id,
    dx: (p.x + p.w / 2 - (c.x + c.w / 2)) / c.scale, dy: (p.y + p.h / 2 - (c.y + c.h / 2)) / c.scale, w: p.w / p.scale })); };
const before = local(ps);
await lab.dragBubble("kinmu", { dx: -40, dy: -25 });     // ② 触った泡は手前へ上がるので、勤務表の倍率は変わる
const ps2 = await lab.placements(), by2 = Object.fromEntries(ps2.map((p) => [p.id, p]));
console.log(`  勤務表の倍率 ${byId.kinmu.scale.toFixed(4)} → ${by2.kinmu.scale.toFixed(4)}（触ったので焦点の面へ）`);
const after = Object.fromEntries(local(ps2).map((p) => [p.id, p]));
let worst = 0;
for (const b of before) {
  const q = after[b.id];
  worst = Math.max(worst, Math.abs(q.dx - b.dx), Math.abs(q.dy - b.dy), Math.abs(q.w - b.w));
}
console.log(`  外で動かしたあと、カレンダーの中の 14 個の局所配置のずれ 最大 ${worst.toFixed(4)}px`);
ok(worst < 0.01, `中身は親の View だけで決まる（外で何が起きても局所配置は 0.00px）`);

await lab.shot("rule1");
const errs = lab.errors();
if (errs.length) { console.log("エラー:", errs); ng++; }
console.log(ng ? `\n規則① NG ${ng}` : `\n規則① 全部 OK`);
await lab.close();
process.exit(ng ? 1 : 0);
