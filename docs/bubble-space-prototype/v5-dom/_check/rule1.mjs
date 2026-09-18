// （v4/_check の写し。DOM 版で同じことが起きるか確かめる）
// 規則① 泡の見え方は、親の View で決まる ── 深さ n でも scale は数値1つ（各段の局所倍率の積）
//   node docs/bubble-space-prototype/v5-dom/_check/rule1.mjs
import { openLab, SHOT_DIR } from "./lab.mjs";

const lab = await openLab();
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
await lab.dragBubble("kinmu", { dx: -40, dy: -25 });     // 掴んで引く＝値（自由X・自由Y）を書く。奥行きは書かない
const ps2 = await lab.placements(), by2 = Object.fromEntries(ps2.map((p) => [p.id, p]));
console.log(`  勤務表の倍率 ${byId.kinmu.scale.toFixed(4)} → ${by2.kinmu.scale.toFixed(4)}（引いても奥行きは書かないので変わらない）`);
const after = Object.fromEntries(local(ps2).map((p) => [p.id, p]));
let worst = 0;
for (const b of before) {
  const q = after[b.id];
  worst = Math.max(worst, Math.abs(q.dx - b.dx), Math.abs(q.dy - b.dy), Math.abs(q.w - b.w));
}
console.log(`  外で動かしたあと、カレンダーの中の 14 個の局所配置のずれ 最大 ${worst.toFixed(4)}px`);
ok(worst < 0.01, `中身は親の View だけで決まる（外で何が起きても局所配置は 0.00px）`);

// ★★ 2026-09-19：「端での下限 0.32」は、入れた日に取り消した（../DECISIONS.md）。
//    v4/RULES.md ①「端での下限は持たない。焦点を送れば端は 0 まで潰れる。それでよい」
//    ここは「下限が無い」ことそのものを測る。読めるかどうかは測らない ── 読めなくてよい
console.log(`\n■ ① 端での下限は持たない（倍率 = 親 × Z × min(X の像, Y の像)。それだけ）`);
{
  await lab.select("v0"); await lab.settle();
  const local = () => lab.placements().then((ps) => ps.filter((p) => p.space === "fish")
    .sort((a, b) => a.id.localeCompare(b.id)).map((p) => p.local));
  const before = await local();
  const q = await lab.call("headerPointOf", "v9");            // 端の版を触って、焦点を端まで送る
  await lab.page.mouse.click(q.x, q.y); await lab.settle();
  const after = await local();
  console.log(`  X魚眼ビューの版10枚の倍率　焦点 0 ：${before.map((v) => v.toFixed(3)).join(" ")}`);
  console.log(`  　　　　　　　　　　　　　　端を触る：${after.map((v) => v.toFixed(3)).join(" ")}`);
  ok(Math.min(...after) < 0.32, `端は 0.32 より下まで潰れる（最小 ${Math.min(...after).toFixed(3)}）── 下限は無い`);
  ok(Math.min(...after) < Math.min(...before), `焦点を送るほど端は小さくなる（${Math.min(...before).toFixed(3)} → ${Math.min(...after).toFixed(3)}）`);
  ok(Math.max(...after) > 0.97, `代わりに、触った泡は原寸まで来る（最大 ${Math.max(...after).toFixed(3)}）`);
  // ★ 「小さすぎる泡は描かない」は ui の話。倍率（＝ domain の答え）には手を出していない
  const min0 = Math.min(...after);
  await lab.call("setDrawMin", 20); await lab.settle();
  const withMin = Math.min(...(await local()));
  await lab.call("setDrawMin", 5); await lab.settle();
  console.log(`  描く下限を 20px にしても、倍率は ${min0.toFixed(6)} → ${withMin.toFixed(6)}`);
  ok(Math.abs(min0 - withMin) < 1e-12, `描く下限は倍率を変えない（描くか描かないかだけの話）`);
  await lab.page.click("#refocus"); await lab.settle();
  await lab.call("setAxis", "kinmu", "x", { lens: "parallel" });
  await lab.call("setAxis", "cal", "x", { lens: "parallel" });
  await lab.settle();
}

await lab.shot("rule1");
const errs = lab.errors();
if (errs.length) { console.log("エラー:", errs); ng++; }
console.log(ng ? `\n規則① NG ${ng}` : `\n規則① 全部 OK`);
await lab.close();
process.exit(ng ? 1 : 0);
