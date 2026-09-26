// 「視界の外へ出たもの」を、いまの解決結果から取り出せるか。
// 取り出せるなら、スタックは新しい状態を持たない ── カメラの位置の関数になる。
import { openLab } from "../v5-dom/_check/lab.mjs";
const V5 = "/Users/masa/git/bublys-org-2/docs/bubble-space-prototype/v5-dom";
const lab = await openLab(`${V5}/lab.html`);
await lab.settle();
await lab.page.evaluate(() => window.__lab.preset("stackZ", "root"));
await lab.settle();

const keys = Object.keys((await lab.placements())[0]);
console.log("placements が返すもの:", keys.join(" "));

const look = async (tag) => {
  const ps = await lab.placements();
  const gone = ps.filter(p => (p.alpha ?? 1) === 0);
  const off  = ps.filter(p => (p.alpha ?? 1) > 0 && (p.x + p.w < 0 || p.x > 1440 || p.y + p.h < 0 || p.y > 900));
  console.log(`  ${tag.padEnd(20)} 泡 ${ps.length}  ／  手前へ抜けた ${gone.length}  ／  画面の外 ${off.length}`);
  return gone.map(p => p.id);
};

console.log("\n■ カメラを奥へ送ると");
await look("はじめ");
const c = { x: 300, y: 500 };
for (const n of [1, 2, 3]) {
  await lab.wheel(c.x, c.y, 120);
  const g = await look(`ホイール ${n}回`);
  if (n === 3) console.log(`    抜けた泡: ${g.slice(0, 8).join(" ")}${g.length > 8 ? " …" : ""}`);
}
console.log("\n■ カメラを戻すと");
for (const n of [1, 2, 3]) await lab.wheel(c.x, c.y, -120);
await look("戻した");
console.log("\n  → 状態ではなくカメラの関数。戻せば勝手に空になる。");
console.log("\nエラー:", lab.errors().length);
await lab.close();
