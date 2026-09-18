// React 版（@bublys-org/bubble-layout-ui）と、このラボが、px で同じものを描くか。
//   node docs/bubble-space-prototype/v5-dom/_check/react.mjs
//
// ★ 受け入れ条件は「React 版とラボが px で差 0」。比べるのは
//   ① 模型の答え（placements）と ② 本物の DOM の矩形（getBoundingClientRect）の両方。
//   ② は層の左上から測るので、ツールバーのぶんのずれは入らない。
import { spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { chromium } from "playwright";
import { openLab, ok, num, V5 } from "./lab.mjs";

const REPO = path.resolve(V5, "../../..");
const DEMO = path.join(REPO, "bublys-libs/bubble-layout-ui/demo");
const PAGE = path.join(DEMO, "dist/index.html");

// ── ラボと React に、同じ順で当てる操作 ──
const SCENES = [
  ["起動直後", []],
  ["coverflow の端を触る", [["select", "cf6"], ["focusOn", "cf6"]]],
  ["勤務表を 格子 に", [["preset", "grid", "kinmu"]]],
  ["外の空間を coverflow に", [["preset", "coverflow", "root"]]],
  ["外の空間を X魚眼 に", [["preset", "fisheyeX", "root"]]],
  ["描く下限 0（ぜんぶ描く）", [["setDrawMin", 0]]],
  ["描く下限 16（消しすぎ）", [["setDrawMin", 16]]],
  ["描く下限 5 に戻す", [["setDrawMin", 5]]],
  ["議事録を触る（Z の焦点）", [["select", "g0"], ["focusOn", "g0"]]],
  ["並び（見えない親）を選ぶ", [["select", "snap1"]]],
  ["X魚眼の端を触る", [["select", "v9"], ["focusOn", "v9"]]],
  ["カレンダーを 列·等間隔·魚眼 に", [["preset", "coverflow", "cal"]]],
];

const KEYS = ["x", "y", "w", "h", "scale", "local", "alpha", "vis", "depth"];

async function openReact() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  page.on("pageerror", (e) => errors.push("pageerror: " + (e.stack || e.message)));
  await page.goto("file://" + PAGE);
  await page.waitForFunction(() => !!window.__react, null, { timeout: 8000 });
  return {
    page, browser, errors: () => errors.slice(),
    call: (fn, ...args) => page.evaluate(([fn, args]) => window.__react[fn](...args), [fn, args]),
    async settle() { await page.waitForTimeout(80); },
    async close() { await browser.close(); },
  };
}

/** ラボ側：泡ひとつひとつの、層の左上から測った矩形 */
const labRects = (lab) => lab.page.evaluate(() => {
  const layer = document.querySelector("#layer");
  const o = layer.getBoundingClientRect();
  const out = {};
  for (const el of document.querySelectorAll("#layer [data-id]")) {
    const r = el.getBoundingClientRect();
    out[el.dataset.id] = { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height };
  }
  return out;
});

async function main() {
  console.log("── React 版を焼く ──");
  const b = spawnSync(process.execPath, [path.join(DEMO, "build.mjs")], { encoding: "utf8" });
  if (b.status !== 0) { console.log(b.stdout, b.stderr); throw new Error("焼けなかった"); }
  console.log(" ", b.stdout.trim());
  if (!fs.existsSync(PAGE)) throw new Error("ページが無い: " + PAGE);

  const lab = await openLab();
  const re = await openReact();
  await lab.settle(); await re.settle();

  let ng = 0, worstModel = 0, worstDom = 0, cells = 0;
  const bad = [];

  for (const [name, ops] of SCENES) {
    for (const [fn, ...args] of ops) {
      await lab.call(fn, ...args);
      await re.call(fn, ...args);
    }
    await lab.settle(); await re.settle();
    await lab.call("keep");           // 補間を進めずに、いまの状態で解き直す（React は補間を持たない）
    await lab.settle(); await re.settle();

    // ① 模型の答え。★ ラボの placements は窓の座標（舞台の左上を足してある）ので、引いてそろえる
    const off = await lab.page.evaluate(() => { const r = document.querySelector("#stage").getBoundingClientRect(); return { x: r.left, y: r.top }; });
    const lp = (await lab.placements()).map((p) => ({ ...p, x: p.x - off.x, y: p.y - off.y }));
    const rp = await re.call("placements");
    const lm = new Map(lp.map((p) => [p.id, p])), rm = new Map(rp.map((p) => [p.id, p]));
    let mDiff = 0, mBad = 0;
    if (lp.length !== rp.length) { mBad++; bad.push(`${name}：泡の数が違う ラボ ${lp.length} / React ${rp.length}`); }
    for (let i = 0; i < Math.min(lp.length, rp.length); i++) {
      if (lp[i].id !== rp[i].id) { mBad++; bad.push(`${name}：描く順が違う ${i} 番目 ラボ ${lp[i].id} / React ${rp[i].id}`); break; }
    }
    for (const [id, a] of lm) {
      const c = rm.get(id);
      if (!c) { mBad++; bad.push(`${name}：React に ${id} がいない`); continue; }
      for (const k of KEYS) {
        cells++;
        const d = Math.abs(a[k] - c[k]);
        if (d > mDiff) mDiff = d;
        if (!Object.is(a[k], c[k]) && d > 1e-9) { mBad++; if (bad.length < 40) bad.push(`${name}：${id}.${k} ラボ ${a[k]} / React ${c[k]}`); }
      }
    }

    // ② 本物の DOM の矩形。★ 描いていない泡（display:none）は矩形が 0 になるので、
    //   「描いた／描かなかった」の顔ぶれを突き合わせてから、描いたものだけ px で比べる
    const lr = await labRects(lab), rr = await re.call("rects");
    const drawn = (r) => r.w > 0 || r.h > 0;
    const lHid = Object.keys(lr).filter((id) => !drawn(lr[id])).sort();
    const rHid = Object.keys(rr).filter((id) => !drawn(rr[id])).sort();
    let dDiff = 0, dBad = 0, n = 0;
    if (lHid.join(",") !== rHid.join(",")) {
      dBad++;
      bad.push(`${name}：描かなかった泡の顔ぶれが違う ラボ [${lHid}] / React [${rHid}]`);
    }
    for (const id of Object.keys(lr)) {
      const c = rr[id];
      if (!c) { dBad++; if (bad.length < 40) bad.push(`${name}：React の DOM に ${id} が無い`); continue; }
      if (!drawn(lr[id])) continue;                       // どちらも描いていない（顔ぶれは上で見た）
      n++;
      for (const k of ["x", "y", "w", "h"]) {
        const d = Math.abs(lr[id][k] - c[k]);
        if (d > dDiff) dDiff = d;
        if (d > 0.01) { dBad++; if (bad.length < 40) bad.push(`${name}：${id} の DOM ${k} ラボ ${num(lr[id][k], 3)} / React ${num(c[k], 3)}`); }
      }
    }
    ok(mBad === 0 && dBad === 0,
       `${name}　模型 ${lp.length} 個 差 ${mDiff.toExponential(1)}　DOM ${n} 枚 差 ${dDiff.toExponential(1)}`);
    if (mBad || dBad) ng++;
    if (mDiff > worstModel) worstModel = mDiff;
    if (dDiff > worstDom) worstDom = dDiff;
  }

  console.log("");
  for (const m of bad.slice(0, 40)) console.log("   ！ " + m);
  console.log(`\n  突き合わせた数 ${cells}　模型のいちばん大きい差 ${worstModel.toExponential(2)}　DOM のいちばん大きい差 ${worstDom.toExponential(2)}px`);
  const le = lab.errors(), rle = re.errors();
  ok(le.length === 0, `ラボのコンソールエラー ${le.length}`);
  ok(rle.length === 0, `React のコンソールエラー ${rle.length}`);
  for (const e of rle.slice(0, 5)) console.log("     " + e);

  await lab.close(); await re.close();
  console.log(ng ? `\nReact 版 ${ng} 場面で食い違った` : `\nReact 版 全部 OK（${SCENES.length} 場面）`);
  process.exit(ng || rle.length ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
