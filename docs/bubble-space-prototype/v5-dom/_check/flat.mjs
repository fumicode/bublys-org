// なぜ「1枚の層の兄弟」なのか ── 入れ子の DOM では表せないことを、実際にやって見せる。
//   ② 触った泡は手前へ。中の泡が、親の兄弟より手前に出られること。
//   （transform を持つ div は必ず重なりの文脈を作るので、入れ子だと子は親の外へ出られない）
//   node docs/bubble-space-prototype/v5-dom/_check/flat.mjs
import { openLab, ok, num } from "./lab.mjs";

const lab = await openLab();
await lab.settle();

// 勤務表（外の空間の泡・中に 制約／スタッフ／カレンダー がいる）を、議事録（版）に重ねる
await lab.select("kinmu"); await lab.settle();
const g = await lab.rect("giji");
await lab.dragBubble("kinmu", { to: { x: g.x + g.w * 0.45, y: g.y + 16 } });
await lab.settle();

const z = await lab.page.evaluate(() => {
  const q = (id) => { const e = document.querySelector(`.bub[data-id="${id}"]`); return e ? +e.style.zIndex : null; };
  return { kinmu: q("kinmu"), seiyaku: q("seiyaku"), cal: q("cal"), giji: q("giji"), g3: q("g3") };
});
console.log(`  z-index：議事録 ${z.giji}（中の「確定」${z.g3}） ／ 勤務表 ${z.kinmu}（中の「制約」${z.seiyaku}・「カレンダー」${z.cal}）`);
ok(z.seiyaku > z.giji, "勤務表の中の「制約」は、外の空間の兄弟「議事録（版）」より手前（z-index が上）");
ok(z.seiyaku > z.kinmu, "中の泡は親より手前");

// 画面で重なっている所を突いて、ほんとうに中の泡が勝つか
const hit = await lab.page.evaluate(() => {
  const L = window.__lab, P = new Map(L.placements().map((p) => [p.id, p]));
  const a = P.get("seiyaku"), b = P.get("giji");
  const x0 = Math.max(a.x, b.x), x1 = Math.min(a.x + a.w, b.x + b.w);
  const y0 = Math.max(a.y, b.y), y1 = Math.min(a.y + a.h, b.y + b.h);
  if (!(x1 > x0 + 4 && y1 > y0 + 4)) return { overlap: 0 };
  const x = (x0 + x1) / 2, y = (y0 + y1) / 2;
  return { overlap: Math.round((x1 - x0) * (y1 - y0)), at: [Math.round(x), Math.round(y)],
           hit: L.hitAt(x, y), el: L.elAt(x, y) };
});
console.log(`  重なった面積 ${hit.overlap}画素 ／ 重なった所 (${hit.at}) を突くと → ${hit.hit}`);
ok(hit.overlap > 100, "制約 と 議事録（版）が実際に重なっている");
ok(hit.hit === "seiyaku", "重なった所を突くと、勤務表の中の「制約」が勝つ（入れ子の DOM では議事録が勝ってしまう）");

// ★★ 2026-09-19：「触った泡は手前へ」は無くなった（raise を消した）。
//    触っても値は1つも書かないので、重なりの上下（描く順＝z-index）は触っても変わらない。
//    代わりに、触った泡へ視点が寄る。ここではその2つを一度に測る。
await lab.preset("stackZ", "root");
await lab.settle();
const zOf = () => lab.page.evaluate(() => Object.fromEntries(
  [...document.querySelectorAll("#layer .bub")].map((e) => [e.dataset.id, +e.style.zIndex])));
const valsOf = async () => (await lab.bubbles())
  .map((b) => `${b.id}:${b.order}/${b.free.x},${b.free.y},${b.free.z}/${b.cell.col},${b.cell.row}`).join(" ");
/** いま見えている泡だけの、描く順（z-index の小さい順）。カメラが消した泡は入れない */
const seenOrder = async () => {
  const z = await zOf(), vis = new Map((await lab.placements()).map((q) => [q.id, q.vis]));
  return Object.keys(z).filter((id) => vis.get(id) > 0).sort((a, b) => z[a] - z[b]);
};
const v0 = await valsOf(), o0 = await seenOrder(), f0 = await lab.focusOf("root");
const p = await lab.headerPointOf("memo3");
await lab.page.mouse.click(p.x, p.y);          // ★ ドラッグせずに離す＝触る
await lab.settle();
const v1 = await valsOf(), o1 = await seenOrder(), f1 = await lab.focusOf("root");
console.log(`  重ねて置く（Z が 順序）で「思いつき」を触る`);
console.log(`  焦点 ${["x", "y", "z"].map((a) => `${a} ${f0[a].toFixed(2)}→${f1[a].toFixed(2)}`).join("　")}`);
ok(v0 === v1, "触っても泡の値は1つも変わらない（order も free.z も。raise を消した）");
ok(["x", "y", "z"].some((a) => Math.abs(f1[a] - f0[a]) > 1e-6), "代わりに、触った泡へ視点が寄る（焦点が動く）");
// 描く順そのものは、焦点 Z をまたいだ泡が消えるぶん変わる。見えている泡どうしの上下は変わらない
const keep = o0.filter((id) => o1.includes(id));
console.log(`  見えている泡 ${o0.length} → ${o1.length} 個（焦点 Z をまたいだ ${o0.length - keep.length} 個が消えた）`);
console.log(`  そのまま見えている ${keep.length} 個の上下：${keep.join(" ") === o1.filter((id) => keep.includes(id)).join(" ") ? "変わらない" : "変わった"}`);
ok(keep.join(" ") === o1.filter((id) => keep.includes(id)).join(" "),
   "見えている泡どうしの上下は、触っても変わらない（変わったのはカメラの位置だけ）");

const errs = lab.errors();
ok(errs.length === 0, `コンソールエラー 0（${errs.length}）`);
await lab.shot("flat");
await lab.close();
