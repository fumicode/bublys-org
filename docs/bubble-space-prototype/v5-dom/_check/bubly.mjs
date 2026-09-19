// v6 ── 本物のバブリ（csv-importer）の画面が、新しいライブラリの上で動くか。
//   node docs/bubble-space-prototype/v5-dom/_check/bubly.mjs
//
// ★ バブリの画面（CsvObjectListView / CsvObjectDetailView）は **1文字も編集していない**。
//   esbuild の alias で `@bublys-org/bubbles-ui` を新しい ObjectView へ向けているだけ。
import { spawnSync } from "node:child_process";
import path from "node:path";
import { chromium } from "playwright";
import { ok, num, V5 } from "./lab.mjs";

const REPO = path.resolve(V5, "../../..");
const V6 = path.join(REPO, "docs/bubble-space-prototype/v6-bubly");
const PAGE = path.join(V6, "dist/index.html");

const LIST = "csv-importer/sheets/demo/objects";
const DETAIL = LIST + "/r3";

let ng = 0;
const check = (c, m) => { ok(c, m); if (!c) ng++; };

async function main() {
  const b = spawnSync(process.execPath, [path.join(V6, "build.mjs")], { encoding: "utf8" });
  if (b.status !== 0) { console.log(b.stdout, b.stderr); throw new Error("焼けなかった"); }
  console.log(" ", b.stdout.trim());

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("pageerror: " + (e.stack || e.message)));
  await page.goto("file://" + PAGE);
  await page.waitForFunction(() => !!window.__v6, null, { timeout: 8000 });
  await page.waitForTimeout(120);

  const bubs = () => page.evaluate(() => window.__v6.bubbles().map((b) => {
    const m = b.tf.match(/translate\(([-\d.]+)px, ([-\d.]+)px\) scale\(([\d.]+)\)/);
    return { id: b.id, url: b.id.split(":").slice(1).join(":"),
             x: m ? +m[1] : 0, y: m ? +m[2] : 0, k: m ? +m[3] : 0, cls: b.cls };
  }));

  // ── ① バブリの画面が、そのまま泡の中に出るか ──
  const first = await bubs();
  check(first.length === 1 && first[0].url === LIST, `起動直後に一覧の泡が1つ（${first.length} 個）`);
  const items = await page.$$eval(".bl-layer [data-object-view]", (els) => els.map((e) => e.textContent?.slice(0, 12)));
  check(items.length === 7, `バブリの ObjectView が 7 つ出る（${items.length} つ）`);
  const hasSelect = await page.$$eval(".bl-layer select option", (o) => o.length);
  check(hasSelect === 5, `本物の選択欄（タイトル列）が中にある（option ${hasSelect}）`);
  const styled = await page.$$eval(".bl-layer .e-card-title", (e) => e.length);
  check(styled === 7, `styled-components の見た目が効いている（.e-card-title ${styled}）`);

  // ── ② 項目をダブルクリック：隣に開いて、リストが小さくなるか ──
  const box = await page.$eval('.bl-layer [data-object-view]:nth-of-type(1)', () => null).catch(() => null);
  void box;
  const target = (await page.$$(".bl-layer [data-object-view]"))[2];   // 3つめ＝夜勤の引き継ぎ表
  const r = await target.boundingBox();
  await page.mouse.dblclick(r.x + r.width / 2, r.y + r.height / 2);
  await page.waitForTimeout(200);

  const after = await bubs();
  const list0 = first[0], list1 = after.find((b) => b.url === LIST), det = after.find((b) => b.url === DETAIL);
  check(after.length === 2, `ダブルクリックで泡が2つになる（${after.length} 個）`);
  check(!!det, "開いたのは詳細の url（route のパラメータが効いている）");
  if (det && list1) {
    check(det.x > list1.x, `詳細は一覧の右（一覧 x ${num(list1.x)} / 詳細 x ${num(det.x)}）`);
    check(list1.k < list0.k - 0.05,
      `★ 一覧が小さくなる（${num(list0.k, 3)} → ${num(list1.k, 3)}）── 横に開くと X に魚眼が点く`);
    check(det.k > list1.k, `詳細のほうが大きい（詳細 ${num(det.k, 3)} / 一覧 ${num(list1.k, 3)}）`);
    check(det.cls.includes("sel"), "開いた泡が選ばれている");
  }
  const detailText = await page.$$eval(".bl-layer .e-detail-value, .bl-layer *", () => null).catch(() => null);
  void detailText;
  const shows = await page.evaluate(() => document.querySelector(".bl-layer")?.textContent ?? "");
  check(shows.includes("鈴木") && shows.includes("10/09"), "詳細にその行の中身が出ている（鈴木・10/09）");

  // ── ③ 泡の中の本物の UI が触れるか ──
  const sel = await page.$(".bl-layer select");
  const hit = await page.evaluate(() => {
    const s = document.querySelector(".bl-layer select");
    if (!s) return false;
    const q = s.getBoundingClientRect();
    return document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2) === s;
  });
  check(!!sel && hit, "拡大縮小のかかった泡の中でも、選択欄がその場所で当たる");

  // ── ④ ヘッダでは掴めて、本文では掴めないか ──
  const before = (await bubs()).find((b) => b.url === DETAIL);
  const drag = async (dy, atHeader) => {
    const q = await page.evaluate((url) => {
      const el = [...document.querySelectorAll(".bl-layer .bub")].find((e) => e.dataset.id.endsWith(url));
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width * 0.5, y: r.top, h: r.height };
    }, DETAIL);
    const y = atHeader ? q.y + 8 : q.y + q.h * 0.6;
    await page.mouse.move(q.x, y);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) { await page.mouse.move(q.x, y + (dy * i) / 10); await page.waitForTimeout(8); }
    await page.mouse.up();
    await page.waitForTimeout(120);
    return (await bubs()).find((b) => b.url === DETAIL);
  };
  const byBody = await drag(70, false);
  check(Math.abs(byBody.y - before.y) < 0.5, `本文を引いても泡は動かない（${num(before.y)} → ${num(byBody.y)}）`);
  const byHead = await drag(70, true);
  check(byHead.y - before.y > 40, `ヘッダを引くと泡が動く（${num(before.y)} → ${num(byHead.y)}）`);

  // ── ⑤ 閉じる ──
  await page.evaluate((url) => {
    const el = [...document.querySelectorAll(".bl-layer .bub")].find((e) => e.dataset.id.endsWith(url));
    el.querySelector(".bl-close").click();
  }, DETAIL);
  await page.waitForTimeout(150);
  const closed = await bubs();
  check(closed.length === 1 && closed[0].url === LIST, `閉じると1つに戻る（${closed.length} 個）`);

  // ── ⑥ 約束 ──
  const real = errors.filter((e) => !/Unsafe attempt to load URL|file: URLs are treated/.test(e));
  check(real.length === 0, `コンソールエラー ${real.length}（file:// の favicon は除く）`);
  for (const e of real.slice(0, 5)) console.log("     " + e);

  await browser.close();
  console.log(ng ? `\nバブリの検証 ${ng} 件で食い違った` : `\nバブリの検証 全部 OK`);
  process.exit(ng ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
