// 面で開いた直後の詳細を少しドラッグすると、一覧と「並び」になってしまう（FINDINGS.md 決めどころ3）。
//   node docs/bubble-space-prototype/v6-bubly/build.mjs && node docs/bubble-space-prototype/v7-convergence/snap-conflict.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("file://" + path.join(REPO, "docs/bubble-space-prototype/v6-bubly/dist/index.html") + "#plane");
await page.waitForFunction(() => !!window.__v6); await page.waitForTimeout(120);
const bubs = () => page.evaluate(() => window.__v6.bubbles().map((b) => { const m = b.tf.match(/translate\(([-\d.]+)px, ([-\d.]+)px\) scale\(([\d.]+)\)/); return `${(b.id.includes(":") ? b.id.split("/").pop() : "(並び)").padEnd(8)} x${(+m[1]).toFixed(1)} y${(+m[2]).toFixed(1)} 倍率${(+m[3]).toFixed(3)}`; }));
const r = await (await page.$$(".bl-layer [data-object-view]"))[2].boundingBox();
await page.mouse.dblclick(r.x + r.width / 2, r.y + r.height / 2); await page.waitForTimeout(200);
console.log("開いた直後", await bubs());
for (const [dx, dy] of [[6, 4], [40, 0], [-30, 0]]) {
  const hd = await page.evaluate(() => { const el = [...document.querySelectorAll(".bl-layer .bub")].find((e) => (e.dataset.id || "").endsWith("/r3")); const b = el.getBoundingClientRect(); return { x: b.left + 120, y: b.top + 8 }; });
  await page.mouse.move(hd.x, hd.y); await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(hd.x + dx * i / 8, hd.y + dy * i / 8);
  await page.mouse.up(); await page.waitForTimeout(200);
  console.log(`詳細のヘッダを (${dx},${dy}) ドラッグして離す`, await bubs());
}
await browser.close();
