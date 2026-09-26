// 05 の既定の大きさの決め方を「横だけ」→「小さい方（min）」にしても、絵は変わらないか。
//   05 の冒頭は「Y が平行なので 小さい方・横×縦 と同じ絵」と書いている。измер測って確かめる。
//   node docs/bubble-space-prototype/v3/_check/05-size-min.mjs
import { openLab, V3 } from "./lab.mjs";

const snap = async (lab) => Object.fromEntries((await lab.placements()).map((p) => [p.id, p]));

const lab = await openLab(`${V3}/05-kinmuhyo.html`);
await lab.settle();
const opts = await lab.page.evaluate(() => [...document.getElementById("sizerule").options].map((o) => o.value));
console.log("選べる決め方:", JSON.stringify(opts), "／ いまの既定:",
  await lab.page.evaluate(() => document.getElementById("sizerule").value));

const base = await snap(lab);
for (const v of opts) {
  await lab.page.evaluate((v) => {
    const s = document.getElementById("sizerule"); s.value = v; s.dispatchEvent(new Event("change", { bubbles: true }));
  }, v);
  await lab.settle();
  const now = await snap(lab);
  let max = 0, who = "";
  for (const id of Object.keys(base)) {
    const a = base[id], b = now[id]; if (!b) continue;
    const d = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.w - b.w), Math.abs(a.h - b.h));
    if (d > max) { max = d; who = id; }
  }
  console.log(`  ${v.padEnd(8)} 既定（横だけ）との差 最大 ${max.toFixed(4)}px ${max > 0.01 ? `（${who}）` : ""}`);
}
console.log("\nエラー:", lab.errors().length);
await lab.close();
