// v7 ── 旧 bubbles-ui の「面」（process.layers）を Z で書いた開き方が、本物のバブリの画面で出るか。
//   node docs/bubble-space-prototype/v5-dom/_check/plane.mjs
//
// 物差しは旧の実物（2026-09-21・users 一覧 → user 詳細 ×3 を同じ順で触って測った）：
//   詳細 1.00 ×3 ／ 元の泡は1段下がる ／ 縁が接する ／ 兄弟を閉じても他は動かない ／ 面が空くと後ろが上がる
// ★ 既定（魚眼）は bubly.mjs が見ている。ここは `#plane` で開いた側だけ。
import { spawnSync } from "node:child_process";
import path from "node:path";
import { chromium } from "playwright";
import { ok, num, V5 } from "./lab.mjs";

const REPO = path.resolve(V5, "../../..");
const V6 = path.join(REPO, "docs/bubble-space-prototype/v6-bubly");
const PAGE = path.join(V6, "dist/index.html");
const W = 1440;

let ng = 0;
const check = (c, m) => { ok(c, m); if (!c) ng++; };

async function main() {
  const b = spawnSync(process.execPath, [path.join(V6, "build.mjs")], { encoding: "utf8" });
  if (b.status !== 0) { console.log(b.stdout, b.stderr); throw new Error("焼けなかった"); }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: W, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("pageerror: " + (e.stack || e.message)));
  await page.goto("file://" + PAGE + "#plane");
  await page.waitForFunction(() => !!window.__v6, null, { timeout: 8000 });
  await page.waitForTimeout(120);

  const bubs = () => page.evaluate(() => window.__v6.bubbles().map((b) => {
    const m = b.tf.match(/translate\(([-\d.]+)px, ([-\d.]+)px\) scale\(([\d.]+)\)/);
    const k = m ? +m[3] : 0, x = m ? +m[1] : 0;
    return { id: b.id, tail: b.id.split("/").pop(), row: !b.id.includes(":"), x, k, right: x + parseFloat(b.w) * k };
  }));
  const dbl = async (n) => {
    const r = await (await page.$$(".bl-layer [data-object-view]"))[n].boundingBox();
    await page.mouse.dblclick(r.x + r.width / 2, r.y + r.height / 2);
    await page.waitForTimeout(200);
  };
  const close = async (tail) => {
    await page.evaluate((t) => {
      const el = [...document.querySelectorAll(".bl-layer .bub")].find((e) => (e.dataset.id || "").endsWith("/" + t));
      el.querySelector(".bl-close").click();
    }, tail);
    await page.waitForTimeout(200);
  };
  const by = (list, tail) => list.find((p) => p.tail === tail);

  // ── ① 別の種類を開く：元の泡は1段下がり、開いた泡は手前 ──
  const s0 = await bubs();
  check(s0.length === 1 && Math.abs(s0[0].k - 1) < 1e-6, `起動直後は一覧が1つ・倍率 ${num(s0[0]?.k, 3)}`);
  await dbl(2);
  const s1 = await bubs();
  const list1 = by(s1, "objects"), d1 = by(s1, "r3");
  check(!!list1 && !!d1, "ダブルクリックで詳細が開く");
  check(Math.abs(list1.k - 0.9) < 1e-3, `★ 一覧は1段下がる（${num(list1.k, 3)}・旧の1段目は 0.90）`);
  check(Math.abs(d1.k - 1) < 1e-3, `開いた詳細は手前（${num(d1.k, 3)}）`);
  check(Math.abs(d1.x - list1.right) < 0.01, `★ 縁が接する（一覧の右辺 ${num(list1.right)} ／ 詳細の左辺 ${num(d1.x)}）── 測らずに置いている`);

  // ── ② 同じ種類を続けて開く：同じ面に並ぶ。関心の順が逆転しない ──
  await dbl(4); await dbl(0);
  const s3 = await bubs();
  const details = ["r3", "r5", "r1"].map((t) => by(s3, t));
  const list3 = by(s3, "objects");
  check(details.every(Boolean), "詳細が3つある");
  check(details.every((d) => Math.abs(d.k - 1) < 1e-3), `★ 3つとも手前のまま（${details.map((d) => num(d.k, 3)).join(" / ")}）── 魚眼だと 0.755 まで落ちた`);
  check(details.every((d) => d.k > list3.k), `★ 関心の順が保たれる ── 詳細 ＞ 一覧（一覧 ${num(list3.k, 3)}）`);
  check(details.every((d) => d.right <= W + 0.01 && d.x >= 0), `窓からはみ出さない（右端 ${details.map((d) => num(d.right, 0)).join(" / ")} ≤ ${W}）`);
  check(Math.abs(details[1].x - details[0].right) < 0.01 && Math.abs(details[2].x - details[1].right) < 0.01, "兄弟どうしも縁が接する");
  check(s3.filter((p) => p.row).length === 1, "共通の見えない親（並び）は1つ");

  // ── ③ 閉じる：兄弟は動かない。面が空になったら後ろが上がる ──
  await close("r1");
  const s4 = await bubs();
  check(Math.abs(by(s4, "r3").x - details[0].x) < 0.01 && Math.abs(by(s4, "r5").x - details[1].x) < 0.01,
    `★ 右端の兄弟を閉じても、残りは動かない（${num(by(s4, "r3").x - details[0].x)} / ${num(by(s4, "r5").x - details[1].x)}px）`);
  await close("r3");
  const s5 = await bubs();
  check(Math.abs(by(s5, "r5").x - details[1].x) < 0.01, `先頭の兄弟を閉じても、残りは動かない（${num(by(s5, "r5").x - details[1].x)}px）`);
  check(Math.abs(by(s5, "objects").k - 0.9) < 1e-3, `兄弟が残っているあいだ、一覧は下がったまま（${num(by(s5, "objects").k, 3)}）`);
  await close("r5");
  const s6 = await bubs();
  check(s6.length === 1 && Math.abs(s6[0].k - 1) < 1e-3, `★ 面が空になったら、一覧が上がってくる（${num(s6[0]?.k, 3)}）`);
  check(s6.filter((p) => p.row).length === 0, "見えない親の残骸 0");

  // （3段 1.00 / 0.90 / 0.818 は openAt.spec.ts が見ている ── この画面の詳細には、別の種類を開く口が無い）
  check(errors.filter((e) => !e.includes("favicon")).length === 0, `コンソールエラー 0（${errors.length}）`);

  await browser.close();
  console.log(ng ? `\n面の検証 NG ${ng} 件` : "\n面の検証 全部 OK");
  process.exit(ng ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
