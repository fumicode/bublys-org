// 先客を空きマスへ逃がすとき、付け替えたあとの兄弟で決めているか（reindex）。
// そして先客が複数いるとき、全員が同じマスへ逃げていないか。
//   node docs/bubble-space-prototype/v3/_check/same-cell3.mjs
import { openLab, V3 } from "./lab.mjs";

const lab = await openLab(`${V3}/00-core.html`);
// 議事録（版が10個）を格子にすると、版は cell を持たないので全員 (0,0) に重なる
await lab.select("v0");
await lab.page.evaluate(() => window.__lab.preset("grid", "giji"));
await lab.settle();
const cells = async () => (await lab.bubbles()).filter((b) => b.parent === "giji")
  .map((b) => `${b.cell.col},${b.cell.row}`);
console.log("格子にした直後:", JSON.stringify(await cells()), "→ マスの種類", new Set(await cells()).size);

// よその空間から1つ落とす
const g = await lab.rect("giji");
await lab.dragBubble("memo3", { to: { x: g.x + g.w / 2, y: g.y + g.h / 2 } });
const after = (await lab.bubbles()).filter((b) => (b.parent === "giji")).map((b) => `${b.id}:${b.cell.col},${b.cell.row}`);
const keys = after.map((s) => s.split(":")[1]);
console.log("落としたあと:", JSON.stringify(after));
console.log(`  泡 ${keys.length} 個 / マス ${new Set(keys).size} 種類 →`,
  keys.length === new Set(keys).size ? "同じマスに2つ無い" : `★ ${keys.length - new Set(keys).size} 個かぶった`);
console.log("\nエラー:", lab.errors().length);
await lab.close();
