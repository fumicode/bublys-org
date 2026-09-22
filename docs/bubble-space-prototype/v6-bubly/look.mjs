// v6 のいまの見えを、段階ごとに撮る（一覧 → 詳細1 → 2 → 3）。
//   node docs/bubble-space-prototype/v6-bubly/look.mjs <出力先のディレクトリ>   ※ `#plane` を付けたいときは第2引数に plane
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const V6 = path.join(REPO, "docs/bubble-space-prototype/v6-bubly");
const OUT = process.argv[2];

const b = spawnSync(process.execPath, [path.join(V6, "build.mjs")], { encoding: "utf8" });
if (b.status !== 0) { console.log(b.stdout, b.stderr); process.exit(1); }

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await page.goto("file://" + path.join(V6, "dist/index.html") + (process.argv[3] === "plane" ? "#plane" : ""));
await page.waitForFunction(() => !!window.__v6, null, { timeout: 8000 });
await page.waitForTimeout(150);

const bubs = () => page.evaluate(() => window.__v6.bubbles().map((b) => {
  const m = b.tf.match(/translate\(([-\d.]+)px, ([-\d.]+)px\) scale\(([\d.]+)\)/);
  return { url: b.id.split(":").slice(1).join(":") || "(並び)", x: m ? +m[1] : 0, y: m ? +m[2] : 0, k: m ? +m[3] : 0, w: b.w, h: b.h, disp: b.disp };
}));
const dbl = async (sel, n) => {
  const t = (await page.$$(sel))[n];
  const r = await t.boundingBox();
  await page.mouse.dblclick(r.x + r.width / 2, r.y + r.height / 2);
  await page.waitForTimeout(250);
};
const shot = async (name) => { await page.screenshot({ path: path.join(OUT, name + ".png") }); console.log("#", name); console.table(await bubs()); };

await shot("1-list");
await dbl(".bl-layer [data-object-view]", 2);           // 一覧 → 詳細1
await shot("2-detail1");
await dbl(".bl-layer [data-object-view]", 4);           // 一覧 → 詳細2（同じ種類）
await shot("3-detail2");
await dbl(".bl-layer [data-object-view]", 0);           // 一覧 → 詳細3
await shot("4-detail3");
// 詳細の中に ObjectView があれば、そこからさらに開く
const inner = await page.$$eval(".bl-layer [data-object-view]", (els) => els.map((e) => ({ url: e.getAttribute("data-object-view") || e.dataset.url || "", text: (e.textContent || "").slice(0, 16) })));
console.log("ObjectView 一覧", inner.length); console.log(inner.slice(0, 14));
console.log("errors", errors);
await browser.close();
