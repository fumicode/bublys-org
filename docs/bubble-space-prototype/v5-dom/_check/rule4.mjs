// （v4/_check の写し。DOM 版で同じことが起きるか確かめる）
// 規則④ 並べる＝値ごとに帯を作り、帯の中に揃えて置き、塊の中央を空間の中心に置く
//   重ならないことを保証するのは「詰める」だけ ── 詰める × 魚眼 で重なり 0 か（隙間 0/14/28）。
//   比べに「等間隔 × 魚眼」も測る（間隔より広い泡が帯からはみ出す並べ方なので、重なりは消えない）
//   node docs/bubble-space-prototype/v5-dom/_check/rule4.mjs
import { openLab } from "./lab.mjs";

const lab = await openLab();
let ng = 0;
const ok = (c, msg) => { console.log(`${c ? "  OK " : "  NG "} ${msg}`); if (!c) ng++; };

/** その空間の兄弟どうしの重なり（画面 px²）と、隣り合う縁のすき間 */
async function overlaps(space) {
  const ps = (await lab.placements()).filter((p) => p.space === space).sort((a, b) => a.x - b.x);
  let n = 0, worst = 0;
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
    const a = ps[i], b = ps[j];
    const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (w > 1e-6 && h > 1e-6) { n++; worst = Math.max(worst, w); }
  }
  const gaps = ps.slice(1).map((p, i) => p.x - (ps[i].x + ps[i].w));
  return { n, worst, gaps, ids: ps.map((p) => p.id) };
}

// ★★ 2026-09-19：一度入れた「端での下限 0.32」は、同じ日に取り消した（../DECISIONS.md）。
//    下限は像より大きく描くので「詰めるは重ならない」を崩していた。取り消したので、また重ならない。
console.log(`■ coverflow（写真7つ・X 魚眼）で 詰める と 等間隔 を比べる`);
for (const arrange of ["pack", "equal"]) {
  for (const gap of [0, 14, 28]) {
    await lab.call("setAxis", "cover", "x", { arrange, gap, lens: "fisheye" });
    await lab.settle();
    const o = await overlaps("cover");
    console.log(`  ${arrange === "pack" ? "詰める" : "等間隔"}・隙間 ${String(gap).padStart(2)}  重なり ${o.n} 組`
              + `（最大 ${o.worst.toFixed(1)}px）  隣との間 ${o.gaps.map((g) => g.toFixed(1)).join(", ")}`);
    if (arrange === "pack") ok(o.n === 0, `詰める × 魚眼・隙間 ${gap}：重なり 0`);
    else if (gap === 14) ok(o.n > 0, `等間隔 × 魚眼：重なりは残る（帯からはみ出す並べ方なので、レンズでは消えない）`);
    if (gap === 14) await lab.shot(`rule4-${arrange}-fisheye`);   // 目で見て確かめる
  }
}
console.log(`\n■ 勤務表（格子・詰める）の X も Y も魚眼にする`);
await lab.call("setAxis", "kinmu", "x", { lens: "fisheye" });
await lab.call("setAxis", "kinmu", "y", { lens: "fisheye" });
await lab.call("setAxis", "cal", "x", { lens: "fisheye" });
await lab.call("setAxis", "cal", "y", { lens: "fisheye" });
await lab.settle();
await lab.shot("rule4-kinmu-fisheye");
for (const sp of ["kinmu", "cal", "staff"]) {
  const o = await overlaps(sp);
  console.log(`  ${sp.padEnd(6)} 重なり ${o.n} 組（最大 ${o.worst.toFixed(1)}px）  泡 ${o.ids.length}`);
  ok(o.n === 0, `${sp}：詰める × 魚眼 で重なり 0`);
}
// 箱からのはみ出しも 0（帯の像と泡の像が同じ式で縮むか）
{
  const ps = await lab.placements(), by = Object.fromEntries(ps.map((p) => [p.id, p]));
  let out = 0;
  for (const p of ps) {
    const h = by[p.space]; if (!h) continue;
    out = Math.max(out, (h.x - p.x), (p.x + p.w) - (h.x + h.w), (p.y + p.h) - (h.y + h.h));
  }
  console.log(`  中身が箱からはみ出す量 最大 ${out.toFixed(2)}px`);
  ok(out < 0.02, `中身は箱に収まる（はみ出し 0）`);
}

console.log(`\n■ ④ 帯の式そのもの：制約とカレンダーの左端がそろう（始端ぞろえ）・スタッフとカレンダーの上端がそろう`);
await lab.call("setAxis", "kinmu", "x", { lens: "parallel" });
await lab.call("setAxis", "kinmu", "y", { lens: "parallel" });
await lab.call("setAxis", "cal", "x", { lens: "parallel" });
await lab.call("setAxis", "cal", "y", { lens: "parallel" });
await lab.settle();
{
  const [se, st, ca] = await Promise.all([lab.rect("seiyaku"), lab.rect("staff"), lab.rect("cal")]);
  console.log(`  制約の左端 ${se.x.toFixed(2)}　カレンダーの左端 ${ca.x.toFixed(2)}　差 ${Math.abs(se.x - ca.x).toFixed(2)}px`);
  console.log(`  スタッフの上端 ${st.y.toFixed(2)}　カレンダーの上端 ${ca.y.toFixed(2)}　差 ${Math.abs(st.y - ca.y).toFixed(2)}px`);
  console.log(`  スタッフの右端 → カレンダーの左端 ${(ca.x - (st.x + st.w)).toFixed(2)}px　制約の下端 → カレンダーの上端 ${(ca.y - (se.y + se.h)).toFixed(2)}px`);
  ok(Math.abs(se.x - ca.x) < 0.02, `上に制約、その下にカレンダー（左端がそろう）`);
  ok(Math.abs(st.y - ca.y) < 0.02, `カレンダーの左にスタッフ（上端がそろう）`);
  // 揃えは View の軸が持つ値（UI のトグルではない）。中央ぞろえにすると、勤務表のレイアウトは崩れる
  await lab.call("setAxis", "kinmu", "x", { align: "center" });
  await lab.settle();
  const [se2, ca2] = await Promise.all([lab.rect("seiyaku"), lab.rect("cal")]);
  console.log(`  揃えを 中央 にすると 制約の左端 ${se2.x.toFixed(2)}　カレンダーの左端 ${ca2.x.toFixed(2)}　差 ${(se2.x - ca2.x).toFixed(2)}px`);
  ok(Math.abs(se2.x - ca2.x) > 30, `揃えは View の軸が持つ値（中央にすると左端が ${(se2.x - ca2.x).toFixed(1)}px ずれる＝始端でないと勤務表にならない）`);
  await lab.call("setAxis", "kinmu", "x", { align: "start" });
  await lab.settle();
}

await lab.shot("rule4");
const errs = lab.errors();
if (errs.length) { console.log("エラー:", errs); ng++; }
console.log(ng ? `\n規則④ NG ${ng}` : `\n規則④ 全部 OK`);
await lab.close();
process.exit(ng ? 1 : 0);
