// 03-pack-or-equal：画面に収まっているか（ツールバーの高さ・右上の一覧の下端・1フレームの時間）。
//   node docs/bubble-space-prototype/v3/_check/03-fit.mjs
import { openLab, V3 } from "./lab.mjs";

const lab = await openLab(`${V3}/03-pack-or-equal.html`);
const box = (sel) => lab.page.evaluate((s) => {
  const el = document.querySelector(s); if (!el) return null;
  const r = el.getBoundingClientRect(); return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), bottom: +r.bottom.toFixed(1) };
}, sel);
const barRows = () => lab.page.evaluate(() =>
  [...document.querySelectorAll("#bar .row")].map((r) => +r.getBoundingClientRect().height.toFixed(1)));

console.log("ツールバー", await box("#bar"), "行の高さ", await barRows());
console.log("canvas   ", await box("#cv"));
for (const sc of ["kinmu", "row", "cover", "nest"]) {
  await lab.call("scene", sc);
  await lab.settle();
  const s = await box("#spaces"), sel = await box("#selection"), cv = await box("#cv");
  console.log(`  ${sc.padEnd(6)} 一覧 ${s.h}  選択欄の下端 ${sel.bottom}  canvas の下端 ${cv.bottom}  ${sel.bottom <= cv.bottom ? "入る" : "★はみ出す"}`);
}
const ms = await lab.page.evaluate(() => {
  const t0 = performance.now(); for (let i = 0; i < 20; i++) window.__lab.frame(); return (performance.now() - t0) / 20;
});
console.log("1フレーム", ms.toFixed(1) + "ms", "泡", (await lab.placements()).length);
console.log("エラー:", lab.errors());
await lab.close();
