// 03-pack-or-equal：土台（00-core）から移した2つを確かめる。
//   ① raise …「触った泡は、その空間の Z 軸の次元が書けるならそこへ書く」（stack は状態から消えた）
//   ② freeCellNear … 格子の同じマスへよその空間から入ってきたら、先客を一番近い空きマスへ押す
//   node docs/bubble-space-prototype/v3/_check/03-raise-cell.mjs
import { openLab, V3 } from "./lab.mjs";

const lab = await openLab(`${V3}/03-pack-or-equal.html`);
const rowIds = [0, 1, 2, 3, 4].map((i) => `rP${i}`);
const frontOf = async (ids) => {
  const ps = await lab.placements();
  return ids.map((id) => ({ id, i: ps.findIndex((p) => p.id === id) })).sort((a, b) => b.i - a.i)[0].id;
};
const zOf = async (ids) => {
  const bs = await lab.bubbles();
  return ids.map((id) => { const b = bs.find((x) => x.id === id); return `${id}:z${(+b.free.z).toFixed(2)}/順${b.order}`; }).join(" ");
};
const click = async (id) => { const q = await lab.call("headerPointOf", id); await lab.page.mouse.click(q.x, q.y); await lab.settle(); };

console.log("=== ① 触った泡は最前面へ ===");
await lab.call("scene", "row");
await lab.select("rP0");
await lab.call("preset", "stackZ", "rowP");
await lab.settle();
// 重ねる（X・Y は自由なので引けば動く）
await lab.dragBubble("rP1", { dx: 26, dy: 16 });
await lab.dragBubble("rP2", { dx: 52, dy: 32 });
await lab.dragBubble("rP3", { dx: 78, dy: 48 });
console.log("  Z＝順序（重ねて置く）:", await zOf(rowIds));
for (const id of ["rP0", "rP2", "rP4", "rP0"]) {
  await click(id);
  console.log(`  ${id} を触る → 手前は ${await frontOf(rowIds)}   ${await zOf(rowIds)}`);
}
await lab.shot("03-raise-stackZ");

console.log("\n  Z＝自由座標（自由に置く）に変えて、同じことを");
await lab.call("preset", "free", "rowP");
await lab.settle();
for (const id of ["rP1", "rP4"]) {
  await click(id);
  console.log(`  ${id} を触る → 手前は ${await frontOf(rowIds)}   ${await zOf(rowIds)}`);
}

console.log("\n  Z＝なし（横に並べる）に戻して、触っても変わらないこと");
await lab.call("preset", "row", "rowP");
await lab.settle();
const before = await zOf(rowIds);
await click("rP0");
const after = await zOf(rowIds);
console.log(`  前 ${before}\n  後 ${after}  ${before === after ? "→ 変わらない（正しい）" : "→ ★変わった"}`);

console.log("\n=== ② 格子の同じマス（よその空間から来た泡） ===");
const lab2 = await openLab(`${V3}/03-pack-or-equal.html`);
await lab2.call("scene", "kinmu");
await lab2.settle();
const cells = async (l) => {
  const bs = await l.bubbles();
  return [...Array(14)].map((_, i) => { const b = bs.find((x) => x.id === `dP${i}`); return `${b.cell.col},${b.cell.row}`; }).join(" ");
};
console.log("  前 カレンダーのマス:", await cells(lab2), " 落とす先 dP4 = col4,row0");
// スタッフの箱から PULL(48) 以上離れたマスへ（近いと「今いる空間の外へ出ない」の約束で staffP に留まる）
const d0 = await lab2.rect("dP4");
const r = await lab2.dragBubble("pP0", { to: { x: d0.x + d0.w / 2, y: d0.y + d0.h / 2 } });
await lab2.settle();
const bs = await lab2.bubbles();
const moved = bs.find((x) => x.id === "pP0");
const st = await lab2.call("stats");
console.log(`  引いた ${JSON.stringify(r.from)} → ${JSON.stringify(r.to)}`);
console.log(`  後 佐藤の親 ${moved.parent}  マス ${JSON.stringify(moved.cell)}`);
console.log("  後 カレンダーのマス:", await cells(lab2));
console.log(`  カレンダーの中 重なり ${st.calP ? st.calP.overlaps : "-"}  はみ出し ${st.calP ? st.calP.overflows : "-"}`);
await lab2.shot("03-same-cell");
console.log("\nエラー:", lab.errors(), lab2.errors());
await lab.close(); await lab2.close();
