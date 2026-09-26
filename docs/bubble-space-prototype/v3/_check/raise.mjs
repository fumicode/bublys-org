// ⑥「置いた順」を公理の中に戻した結果を測る。
//   触った泡は、その空間の Z 軸の次元が書けるなら最前面へ書く。
//   node docs/bubble-space-prototype/v3/_check/raise.mjs
import { openLab, V3 } from "./lab.mjs";

const frontOf = async (lab, ids) => {
  const ps = await lab.placements();
  const idx = ids.map((id) => ({ id, i: ps.findIndex((p) => p.id === id) }));
  return idx.sort((a, b) => b.i - a.i)[0].id;    // 描く順が後 ＝ 手前
};
const zOf = async (lab, id) => {
  const b = (await lab.bubbles()).find((x) => x.id === id);
  return { z: b.free?.z, order: b.order };
};

const lab = await openLab(`${V3}/00-core.html`);
console.log("=== ① Z が「順序」の空間（重ねて置く）… 触ると最前面へ ===");
await lab.select("memo1");
await lab.page.evaluate(() => window.__lab.preset("stackZ", "root"));
await lab.settle();
// メモ3つを重ねる
await lab.dragBubble("memo2", { to: (await lab.rect("memo1")).x + 40 ? { x: (await lab.rect("memo1")).x + 40, y: (await lab.rect("memo1")).y + 30 } : null });
await lab.dragBubble("memo3", { to: { x: (await lab.rect("memo1")).x + 20, y: (await lab.rect("memo1")).y + 15 } });
console.log("  重ねたあと:", JSON.stringify(await Promise.all(["memo1", "memo2", "memo3"].map((i) => zOf(lab, i)))));
for (const id of ["memo1", "memo2", "memo3", "memo1"]) {
  const q = await lab.call("headerPointOf", id);            // 隠れていない点を探して当てる
  await lab.page.mouse.click(q.x, q.y);
  await lab.settle();
  console.log(`  ${id} を触る → 手前は ${await frontOf(lab, ["memo1", "memo2", "memo3"])}  順序 ${JSON.stringify((await lab.bubbles()).filter((b) => /memo/.test(b.id)).map((b) => b.id + ":" + b.order))}`);
}
await lab.shot("raise-stackZ");

console.log("\n=== ② Z が「なし」の空間（横に並べる）… 触っても上がらない ===");
const q0 = await lab.call("headerPointOf", "row0");
await lab.page.mouse.click(q0.x, q0.y);
await lab.settle();
const rows = (await lab.bubbles()).filter((b) => /^row\d/.test(b.id)).map((b) => b.id + ":" + b.order);
console.log("  row0 を触る → 順序", JSON.stringify(rows), "（X の順序なので、Z では動かない）");

console.log("\n=== ③ Z が「履歴」の空間（議事録）… 触っても順番が変わらない ===");
const before = (await lab.bubbles()).filter((b) => /^v\d/.test(b.id)).map((b) => b.id + ":hist" + b.hist);
const qv = await lab.call("headerPointOf", "v1");
await lab.page.mouse.click(qv.x, qv.y);
await lab.settle();
const after = (await lab.bubbles()).filter((b) => /^v\d/.test(b.id)).map((b) => b.id + ":hist" + b.hist);
console.log("  前:", JSON.stringify(before));
console.log("  後:", JSON.stringify(after), before.join() === after.join() ? "→ 変わらない（正しい）" : "→ ★変わった");

console.log("\nエラー:", lab.errors().length);
await lab.close();
