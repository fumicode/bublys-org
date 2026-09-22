// 「同じマスに2つ入る」のはどんなときか。そして 自由に置く空間の重なりはどうか。
//   node docs/bubble-space-prototype/v3/_check/same-cell.mjs
import { openLab, V3 } from "./lab.mjs";

const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

// ① 同じ空間の中でマスを移す → 入れ替わるか
{
  const lab = await openLab(`${V3}/00-core.html`);
  const cellOf = async (id) => (await lab.bubbles()).find((b) => b.id === id)?.cell;
  console.log("① 勤務表の中で 制約 を カレンダーのマスへ動かす（同じ空間）");
  console.log("   前:", "制約", JSON.stringify(await cellOf("seiyaku")), " カレンダー", JSON.stringify(await cellOf("cal")));
  const c = await lab.rect("cal");
  await lab.dragBubble("seiyaku", { to: { x: c.x + c.w / 2, y: c.y + c.h / 2 } });
  console.log("   後:", "制約", JSON.stringify(await cellOf("seiyaku")), " カレンダー", JSON.stringify(await cellOf("cal")));
  const a = await lab.rect("seiyaku"), b = await lab.rect("cal");
  console.log(`   重なっているか: ${overlap(a, b) ? "★重なった" : "重なっていない（入れ替わった）"}`);
  await lab.close();
}

// ② よその空間から落とす → 重なるか
{
  const lab = await openLab(`${V3}/00-core.html`);
  const s = await lab.rect("seiyaku");
  await lab.dragBubble("memo3", { to: { x: s.x + s.w / 2, y: s.y + s.h / 2 } });
  const bs = await lab.bubbles();
  const m = bs.find((b) => b.id === "memo3"), sy = bs.find((b) => b.id === "seiyaku");
  const a = await lab.rect("memo3"), b = await lab.rect("seiyaku");
  console.log("\n② 外の空間の 思いつき を 制約 のマスへ落とす（よそから）");
  console.log(`   思いつき cell=${JSON.stringify(m.cell)} 制約 cell=${JSON.stringify(sy.cell)}`);
  console.log(`   重なっているか: ${overlap(a, b) ? "★重なった（同じマス）" : "重なっていない"}`);
  await lab.close();
}

// ③ 自由に置く空間で、泡を別の泡の上に重ねる → View は上下を決められるか
{
  const lab = await openLab(`${V3}/00-core.html`);
  const before = (await lab.bubbles()).filter((b) => /memo/.test(b.id)).map((b) => ({ id: b.id, z: b.free?.z, stack: b.stack }));
  console.log("\n③ 外の空間（自由に置く）で 思いつき を メモ の上に重ねる");
  console.log("   前:", JSON.stringify(before));
  const t = await lab.rect("memo1");
  await lab.dragBubble("memo3", { to: { x: t.x + 30, y: t.y + 30 } });
  const after = (await lab.bubbles()).filter((b) => /memo/.test(b.id)).map((b) => ({ id: b.id, z: b.free?.z, stack: b.stack }));
  console.log("   後:", JSON.stringify(after));
  const a = await lab.rect("memo3"), b = await lab.rect("memo1");
  const ps = await lab.placements();
  const ia = ps.findIndex((p) => p.id === "memo3"), ib = ps.findIndex((p) => p.id === "memo1");
  console.log(`   重なっているか: ${overlap(a, b) ? "重なった" : "重なっていない"}  描く順: 思いつき ${ia} / メモ ${ib} → ${ia > ib ? "思いつきが手前" : "メモが手前"}`);
  console.log(`   Z は同じか: 思いつき z=${after.find((x) => x.id === "memo3").z} メモ z=${after.find((x) => x.id === "memo1").z}`);
  await lab.close();
}

// ④ v3 に「面へのスナップ（量子化）」はあるか
{
  const lab = await openLab(`${V3}/00-core.html`);
  const v = await lab.viewOf("root");
  console.log("\n④ root の View:", JSON.stringify(v));
  await lab.close();
}
