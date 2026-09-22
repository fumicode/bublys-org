// （v4/_check の写し。DOM 版で同じことが起きるか確かめる）
// 規則③ 見えない親は、体を持たない
//   並びに「自由に置く」などの View を当てようとしても、見えない親は受け取らず外の窓へ回るか（中の泡が飛ばないか）
//   ＋ 箱は中身ぴったり／Z は軸まるごと外の窓／当たるのは外周だけ／出入りも外の窓で数える
//   node docs/bubble-space-prototype/v5-dom/_check/rule3.mjs
import { openLab } from "./lab.mjs";

const lab = await openLab();
let ng = 0;
const ok = (c, msg) => { console.log(`${c ? "  OK " : "  NG "} ${msg}`); if (!c) ng++; };

const rows0 = await lab.call("implicitParents");
console.log(`見えない親 ${rows0.length}：${rows0.map((r) => `${r.id}[${r.kids.join(",")}]`).join(" ")}`);
ok(rows0.length === 1 && rows0[0].kids.join(",") === "fA,fB", `起動時に 付箋A・付箋B が並んでいる（ドラッグと同じ道で）`);
const ROW = rows0[0].id;

// ── 体を持たない（1）箱は中身ぴったり ──
{
  const ps = await lab.placements(), by = Object.fromEntries(ps.map((p) => [p.id, p]));
  const r = by[ROW], a = by.fA, b = by.fB;
  const w = Math.max(a.x + a.w, b.x + b.w) - Math.min(a.x, b.x), h = Math.max(a.y + a.h, b.y + b.h) - Math.min(a.y, b.y);
  console.log(`  並びの箱 ${r.w.toFixed(2)}×${r.h.toFixed(2)}　中身の外周 ${w.toFixed(2)}×${h.toFixed(2)}　縁のすき間 ${(b.x - (a.x + a.w)).toFixed(2)}px`);
  ok(Math.abs(r.w - w) < 0.01 && Math.abs(r.h - h) < 0.01, `箱は中身ぴったり（ヘッダ 0・余白 0）`);
  ok(Math.abs(b.x - (a.x + a.w)) < 0.01, `縁が接する（隙間 0）`);
}

// ── 体を持たない（2）View を選べない：プリセットもセレクタも外の窓へ回る ──
console.log(`\n■ 並びに 8 つのプリセットを当てる（受け取らず、外の窓＝外の空間へ回るか）`);
// 並びの中の配置は、並び自身の大きさ（外の窓が決める）で割って見る。
// 外の窓の View が変われば並びそのものは動くし縮む ── それは③のとおり（Z も位置も窓のもの）。
// ③が言うのは「並びが View を受け取らない＝中の並べ方が変わらない」こと
const inside = async () => {
  const ps = await lab.placements(), by = Object.fromEntries(ps.map((p) => [p.id, p]));
  const r = by[ROW];
  return { dx: (by.fB.x - by.fA.x) / r.scale, dy: (by.fB.y - by.fA.y) / r.scale,
           w: r.w / r.scale, h: r.h / r.scale, screen: { x: by.fA.x, y: by.fA.y } };
};
const base = await inside();
for (const name of ["自由に置く", "横に並べる", "縦に並べる", "格子", "X魚眼ビュー", "coverflow", "履歴を奥行きに", "重ねて置く"]) {
  await lab.call("preset", name, ROW);
  await lab.settle();
  const v = (await lab.call("implicitParents")).find((r) => r.id === ROW).view;
  const now = await inside();
  const rootOwn = (await lab.viewOf("root"));
  // 窓の Z を なし にして測り直す：③の「Z は軸まるごと外の窓のもの」で、
  // 窓が「Z は順序」なら並びの中も順序で奥行きに置かれる（重ねて置く で 付箋B が 4.5px 奥へ寄る）。それは受け取ったのではなく窓の Z
  const zon = Math.max(Math.abs(now.dx - base.dx), Math.abs(now.dy - base.dy));
  await lab.call("setAxis", "root", "z", { dim: "none" });
  await lab.settle();
  const flat = await inside();
  const jump = Math.max(Math.abs(flat.dx - base.dx), Math.abs(flat.dy - base.dy), Math.abs(flat.w - base.w), Math.abs(flat.h - base.h));
  console.log(`  ${name.padEnd(8, "　")} 並びの X「${v.x.dim}·${v.x.arrange}」 外の空間の X「${rootOwn.x.dim}·${rootOwn.x.arrange}」`
            + ` 中の並びのずれ ${jump.toFixed(2)}px（窓の Z 込みなら ${zon.toFixed(2)}px）  並びの箱 ${flat.w.toFixed(1)}×${flat.h.toFixed(1)}`);
  ok(v.x.dim === "order" && v.x.arrange === "pack" && v.y.dim === "none", `${name}：並びは View を受け取らない`);
  ok(jump < 0.01, `${name}：中の並べ方は変わらない（0.00px・箱も ${base.w}×${base.h} のまま）`);
  await lab.call("preset", "自由に置く", "root");      // 外の空間を戻してから次へ
  await lab.settle();
}
// 軸セレクタも同じ
await lab.call("setAxis", ROW, "x", { dim: "free.x" });
await lab.settle();
{
  const v = (await lab.call("implicitParents")).find((r) => r.id === ROW).view, rv = await lab.viewOf("root");
  console.log(`  軸セレクタ（X の次元を 自由X に）  並び「${v.x.dim}」 外の空間「${rv.x.dim}」`);
  ok(v.x.dim === "order" && rv.x.dim === "free.x", `軸セレクタも外の窓へ回る`);
  const now = await inside();
  ok(Math.abs(now.dx - base.dx) < 0.01, `中の泡は飛ばない（${Math.abs(now.dx - base.dx).toFixed(2)}px）`);
}

// ── 体を持たない（3）Z は軸まるごと外の窓のもの ──
console.log(`\n■ Z は軸まるごと外の窓のもの`);
{
  const v = (await lab.call("implicitParents")).find((r) => r.id === ROW).view, rv = await lab.viewOf("root");
  console.log(`  並びの Z「${v.z.dim}·${v.z.arrange}·${v.z.lens}」　外の空間の Z「${rv.z.dim}·${rv.z.arrange}·${rv.z.lens}」`);
  ok(JSON.stringify(v.z) === JSON.stringify(rv.z), `並びの Z は外の空間の Z そのまま`);
  // 外の空間の Z を なし にすると、並びの中も透視が消える
  const w0 = (await lab.rect("fA")).w;
  await lab.call("setAxis", "root", "z", { dim: "none" }); await lab.settle();
  const v2 = (await lab.call("implicitParents")).find((r) => r.id === ROW).view;
  console.log(`  外の空間の Z を なし に → 並びの Z「${v2.z.dim}」　付箋A の幅 ${w0.toFixed(2)} → ${(await lab.rect("fA")).w.toFixed(2)}`);
  ok(v2.z.dim === "none", `外が「Z なし」なら、並びの中にも透視は残らない`);
  await lab.call("setAxis", "root", "z", { dim: "free.z", arrange: "as-is", lens: "perspective" }); await lab.settle();
  // ホイールも外の窓へ通る
  const r = await lab.rect(ROW);
  const f0 = (await lab.focusOf("root")).z, fr0 = (await lab.focusOf(ROW)).z;
  await lab.wheel(r.x + r.w / 2, r.y - 8, 40);         // 並びの縁の上でホイール
  const f1 = (await lab.focusOf("root")).z, fr1 = (await lab.focusOf(ROW)).z;
  console.log(`  並びの縁でホイール  外の空間の焦点Z ${f0.toFixed(3)} → ${f1.toFixed(3)}　並び自身の焦点Z ${fr0.toFixed(3)} → ${fr1.toFixed(3)}`);
  ok(Math.abs(f1 - f0) > 1e-6 && Math.abs(fr1 - fr0) < 1e-9, `ホイールは外の窓の焦点 Z を動かす（並びは自分の焦点を持たない）`);
  await lab.select("fA"); await lab.settle(); await lab.page.click("#refocus"); await lab.settle();
}

// ── 体を持たない（4）当たるのは外周だけ ──
console.log(`\n■ 当たるのは外周だけ`);
{
  const ps = await lab.placements(), by = Object.fromEntries(ps.map((p) => [p.id, p]));
  const r = by[ROW], a = by.fA;
  const onEdge = await lab.call("hitAt", r.x + r.w / 2, r.y - 6);
  const inside2 = await lab.call("hitAt", a.x + a.w / 2, a.y + 8);
  // 中身のすき間（付箋A の下・並びの箱の中）は、並びではなく外の空間の背景
  const gapY = a.y + a.h + 4;
  const inGap = gapY < r.y + r.h ? await lab.call("hitAt", a.x + a.w / 2, gapY) : "（すき間なし）";
  console.log(`  外周（箱の 6px 外）→ ${onEdge}　中の泡の上 → ${inside2}　並びの中のすき間 → ${inGap}`);
  ok(onEdge === ROW, `外周は並びに当たる`);
  ok(inside2 === "fA", `中の泡の上は、その泡に当たる`);
  ok(inGap !== ROW, `並びの中のすき間は並びに当たらない（箱を持たない）`);
}

// ── 体を持たない（5）空間の出入りも外の窓で数える ──
console.log(`\n■ 空間の出入りも外の窓で数える（付箋C を並びに加える → 引き離す → 親が消える）`);
{
  const before = await lab.rect("fA");
  await lab.call("snap", "fC", "fB", "right");       // 並びに加わる（見えない親は増えない）
  await lab.settle();
  const rows = await lab.call("implicitParents");
  const after = await lab.rect("fA");
  console.log(`  加わったあと 見えない親 ${rows.length} 個  ${rows.map((r) => r.kids.join(",")).join(" / ")}`
            + `　付箋A のずれ ${(after.x - before.x).toFixed(2)}, ${(after.y - before.y).toFixed(2)}px`);
  ok(rows.length === 1 && rows[0].kids.join(",") === "fA,fB,fC", `並びに加わる（親は増えない）`);
  ok(Math.abs(after.x - before.x) < 0.01 && Math.abs(after.y - before.y) < 0.01, `⑤ 差し込む所より前の泡は 0.00px`);

  // 引き離す（外の空間へ）→ 残りが2つなら親は残る。さらに1つにすると親は消え、残った泡が席を継ぐ
  await lab.dragBubble("fC", { dx: 40, dy: 210 });
  await lab.dragBubble("fB", { dx: 260, dy: -180 });
  await lab.settle();
  const rows2 = await lab.call("implicitParents");
  const kids = (await lab.bubbles()).filter((b) => b.parent && b.parent.startsWith("snap")).map((b) => b.id);
  console.log(`  2つ引き離したあと 見えない親 ${rows2.length} 個　並びの中の泡 [${kids.join(",")}]　付箋A の親 ${(await lab.bubbles()).find((b) => b.id === "fA").parent}`);
  ok(rows2.length === 0, `並びは2つ以上：子が1つになった見えない親は消える`);
}

await lab.shot("rule3");
const errs = lab.errors();
if (errs.length) { console.log("エラー:", errs); ng++; }
console.log(ng ? `\n規則③ NG ${ng}` : `\n規則③ 全部 OK`);
await lab.close();
process.exit(ng ? 1 : 0);
