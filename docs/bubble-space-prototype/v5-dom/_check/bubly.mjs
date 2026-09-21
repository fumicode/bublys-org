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

  // ── ★ 同じ一覧から続けて開いたら、重ならずに並ぶか（共通の見えない親に入る）──
  for (const row of [0, 1]) {                       // さらに2つ、同じ一覧から開く
    const list = await page.evaluate(() =>
      [...document.querySelectorAll(".bl-layer .bub")].find((e) => e.dataset.id.endsWith("/objects"))?.dataset.id);
    const items = await page.$$(".bl-layer [data-object-view]");
    const rr = await items[row].boundingBox();
    void list;
    await page.mouse.dblclick(rr.x + rr.width / 2, rr.y + rr.height / 2);
    await page.waitForTimeout(180);
  }
  const three = await bubs();
  const imp = await page.evaluate(() =>
    [...document.querySelectorAll(".bl-layer .bub.imp")].map((e) => e.dataset.id));
  check(imp.length === 1, `★ 共通の見えない親（並び）が1つできる（${imp.length} 個）`);
  const dets = three.filter((b) => /\/objects\/r\d+$/.test(b.url)).sort((a, b) => a.x - b.x);
  check(dets.length === 3, `詳細が3つある（${dets.length} 個）`);
  if (dets.length === 3) {
    const xs = dets.map((d) => Math.round(d.x));
    check(new Set(xs).size === 3, `★ 重ならない ── x が3つとも違う（${xs.join(" / ")}）`);
    const ks = dets.map((d) => +d.k.toFixed(3));
    check(new Set(ks).size === 1, `並びの中では同じ大きさ（${ks.join(" / ")}）`);
    const readable = await page.evaluate(() =>
      [...document.querySelectorAll(".bl-layer .bub")].filter((e) => !e.className.includes("imp") && !e.className.includes("nt")).length);
    check(readable === 4, `一覧も詳細3つも、題名が読める大きさで残る（${readable} / 4）`);
  }
  // ── ★ 囲っている親が見えて、まとめて動かせるか ──
  const impBox = await page.evaluate(() => {
    const el = document.querySelector(".bl-layer .bub.imp");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: r.left + r.width / 2, y: r.top, w: r.width, h: r.height,
      枠: !!el.querySelector(".fr"), 札: el.querySelector(".lb")?.textContent ?? null,
      縁: el.querySelectorAll(".rg").length,
    };
  });
  check(!!impBox?.枠, "★ 囲っている親に点線の枠が出る");
  check(impBox?.札 === "見えない親 · 横に並べる", `札が出る（${impBox?.札}）`);
  check(impBox?.縁 === 4, `掴める縁が4本ある（${impBox?.縁} 本）`);
  if (impBox) {
    const kids0 = (await bubs()).filter((b) => /\/objects\/r\d+$/.test(b.url)).map((b) => ({ url: b.url, x: b.x, y: b.y }));
    const gy = impBox.y - 6;                        // 枠の外周（縁 12px の帯）を掴む
    await page.mouse.move(impBox.x, gy);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) { await page.mouse.move(impBox.x + 12 * i, gy + 9 * i); await page.waitForTimeout(8); }
    await page.mouse.up();
    await page.waitForTimeout(160);
    const kids1 = (await bubs()).filter((b) => /\/objects\/r\d+$/.test(b.url)).map((b) => ({ url: b.url, x: b.x, y: b.y }));
    const moved = kids0.map((k, i) => ({ dx: kids1[i].x - k.x, dy: kids1[i].y - k.y }));
    const allMoved = moved.every((m) => Math.abs(m.dy) > 40);
    check(allMoved, `★ 親の縁を引くと、中の泡が全部ついてくる（${moved.map((m) => m.dy.toFixed(0)).join(" / ")}px）`);
    // ★ Y には魚眼が無いので、縦は全員そろう
    check(new Set(moved.map((m) => m.dy.toFixed(3))).size === 1,
      `ばらけない ── 縦は全員そろう（${moved.map((m) => m.dy.toFixed(1)).join(" / ")}px）`);
    // ★ 横は **そろわないのが正しい**：X に魚眼が点いているので、同じだけ動かしても
    //   端にいる泡ほど画面での動きは縮む。値の上では1つの並びが動いただけ
    check(moved.every((m) => m.dx > 0) && moved[0].dx > moved[moved.length - 1].dx,
      `横は端ほど縮む（魚眼が効いている証拠：${moved.map((m) => m.dx.toFixed(0)).join(" / ")}px）`);
    // 中の泡は「触っていない」ので、自分の値は1つも書かれていない
    const kept = await page.evaluate(() => (window.__v6.stateOf ? "ある" : "なし"));
    void kept;
  }

  // 片づけて、以降の検査は2つの状態から。★ 1つずつ閉じる
  //   （同じ tick で2つ閉じると、2つ目が閉じる前の世界を見て取り消される）
  for (const r of ["r1", "r2"]) {
    await page.evaluate((id) => {
      const el = [...document.querySelectorAll(".bl-layer .bub")].find((e) => e.dataset.id.endsWith("/objects/" + id));
      el?.querySelector(".bl-close")?.click();
    }, r);
    await page.waitForTimeout(160);
  }
  const left = await bubs();
  check(left.filter((b) => /\/objects\/r\d+$/.test(b.url)).length === 1,
    `2つ閉じたら詳細は1つ（${left.filter((b) => /\/objects\/r\d+$/.test(b.url)).length} 個）`);
  const impLeft = await page.evaluate(() => document.querySelectorAll(".bl-layer .bub.imp").length);
  check(impLeft === 0, `★ ③ 並びは2つ以上 ── 1つになったら見えない親も消える（${impLeft} 個）`);

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
