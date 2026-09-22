// React 版とラボを、**本物のマウスで同じように触って**、書かれた値を突き合わせる。
//   node docs/bubble-space-prototype/v5-dom/_check/react-drag.mjs
//
// ★ 上の react.mjs は「同じ状態なら同じ絵になるか」。こちらは「同じ触り方なら同じ値が書かれるか」。
//   ドラッグする点は **ラボが返した窓の座標をそのまま React にも当てる**（同じ場面なので同じ点が同じ泡を指す）。
import { spawnSync } from "node:child_process";
import path from "node:path";
import { chromium } from "playwright";
import { openLab, ok, V5 } from "./lab.mjs";

const REPO = path.resolve(V5, "../../..");
const DEMO = path.join(REPO, "bublys-libs/bubble-layout-ui/demo");
const PAGE = path.join(DEMO, "dist/index.html");

async function openReact() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  page.on("pageerror", (e) => errors.push("pageerror: " + (e.stack || e.message)));
  await page.goto("file://" + PAGE);
  await page.waitForFunction(() => !!window.__react, null, { timeout: 8000 });
  const o = {
    page, browser, errors: () => errors.slice(),
    call: (fn, ...args) => page.evaluate(([fn, args]) => window.__react[fn](...args), [fn, args]),
    async settle() { await page.waitForTimeout(90); },
    async close() { await browser.close(); },
  };
  return o;
}

/** 同じ道すじを、両方の画面に当てる */
async function both(lab, re, run) {
  await run(lab.page, "lab");
  await lab.settle();
  await run(re.page, "react");
  await re.settle();
}

const dragPath = (from, to, steps = 16) => async (page) => {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(from.x + (to.x - from.x) * i / steps, from.y + (to.y - from.y) * i / steps);
    await page.waitForTimeout(8);
  }
  await page.mouse.up();
};

const KEYS = ["size", "parent", "free", "order", "cell", "hist", "branch", "implicit", "focus"];
const norm = (list) => {
  const m = new Map();
  for (const b of list) {
    const o = {};
    for (const k of KEYS) o[k] = b[k];
    m.set(b.id, o);
  }
  return m;
};

function compare(name, a, b, bad) {
  const A = norm(a), B = norm(b);
  let n = 0;
  const onlyA = [...A.keys()].filter((id) => !B.has(id));
  const onlyB = [...B.keys()].filter((id) => !A.has(id));
  if (onlyA.length || onlyB.length) {
    bad.push(`${name}：泡の顔ぶれが違う ラボだけ [${onlyA}] / React だけ [${onlyB}]`);
    n++;
  }
  for (const [id, x] of A) {
    const y = B.get(id);
    if (!y) continue;
    for (const k of KEYS) {
      const sx = JSON.stringify(x[k]), sy = JSON.stringify(y[k]);
      if (sx !== sy) { bad.push(`${name}：${id}.${k} ラボ ${sx} / React ${sy}`); n++; }
    }
  }
  return n;
}

async function main() {
  console.log("── React 版を焼く ──");
  const b = spawnSync(process.execPath, [path.join(DEMO, "build.mjs")], { encoding: "utf8" });
  if (b.status !== 0) { console.log(b.stdout, b.stderr); throw new Error("焼けなかった"); }

  const lab = await openLab();
  const re = await openReact();
  await lab.settle(); await re.settle();

  const bad = [];
  let ng = 0;

  // ドラッグする点はラボから取る（同じ場面なので、同じ点が同じ泡を指す）
  const at = (id) => lab.call("headerPointOf", id);

  const CASES = [
    ["自由に置く空間で 思いつき をドラッグする", async () => {
      const p = await at("memo3");
      return dragPath(p, { x: p.x + 140, y: p.y + 60 });
    }],
    ["並べ替え：横に並べる の 小 を右へ", async () => {
      const p = await at("row0");
      return dragPath(p, { x: p.x + 220, y: p.y });
    }],
    ["マス移動：カレンダーの 4 を別のマスへ", async () => {
      const p = await at("d3");
      return dragPath(p, { x: p.x + 74, y: p.y + 30 });
    }],
    ["視点が動く空間：X魚眼ビューの 版5 を横へ", async () => {
      const p = await at("v4");
      return dragPath(p, { x: p.x + 70, y: p.y });
    }],
    ["なしの空間：議事録の 確定 をドラッグする（何も起きない）", async () => {
      const p = await at("g3");
      return dragPath(p, { x: p.x + 70, y: p.y + 40 });
    }],
    ["背景をドラッグする（外の空間の焦点）", async () => dragPath({ x: 240, y: 140 }, { x: 340, y: 200 })],
    ["② ドラッグせずに離す ＝ 触る（coverflow の写真7）", async () => {
      const p = await at("cf6");
      return async (page) => { await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.up(); };
    }],
    ["ホイール：背景で回す（外の空間の Z）", async () => async (page) => {
      await page.mouse.move(240, 140); await page.mouse.wheel(0, -300); await page.waitForTimeout(80);
    }],
    ["大きさの角をドラッグする（メモ）", async () => {
      await lab.call("select", "memo1"); await re.call("select", "memo1");
      await lab.settle(); await re.settle();
      const r = await lab.rect("memo1");
      const o = await lab.page.evaluate(() => { const q = document.querySelector("#stage").getBoundingClientRect(); return { x: q.left, y: q.top }; });
      void o;
      const c = { x: r.x + r.w - 6, y: r.y + r.h - 6 };
      return dragPath(c, { x: c.x + 60, y: c.y + 40 });
    }],
  ];

  let prev = norm(await lab.bubbles());
  let rootFocus = JSON.stringify(await lab.focusOf("root"));
  for (const [name, make] of CASES) {
    const run = await make();
    await both(lab, re, run);
    const lb = await lab.bubbles(), rb = await re.call("bubbles");
    const moves = [];
    let n = compare(name, lb, rb, bad);
    // ★ 外の空間は泡ではないので bubbles() に出ない。焦点はここで別に見る
    const lf = JSON.stringify(await lab.focusOf("root")), rf = JSON.stringify(await re.call("focusOf", "root"));
    if (lf !== rf) { bad.push(`${name}：外の空間の焦点 ラボ ${lf} / React ${rf}`); n++; }
    if (lf !== rootFocus) { moves.push("root.focus"); rootFocus = lf; }
    // ★「両方とも何も起きなかった」でも一致してしまうので、何が変わったかを出す
    const now = norm(lb);
    const moved = moves.splice(0);
    for (const [id, x] of now) {
      const was = prev.get(id);
      if (!was) { moved.push(id + "(新)"); continue; }
      for (const k of KEYS) if (JSON.stringify(x[k]) !== JSON.stringify(was[k])) moved.push(id + "." + k);
    }
    prev = now;
    const what = moved.length
      ? `変わった値 ${moved.length}（${moved.slice(0, 4).join(" ")}${moved.length > 4 ? " …" : ""}）`
      : "変わった値 0　★ 何も起きない";
    ok(n === 0, `${name}　${what}`);
    if (n) ng++;
  }

  // ── ★ ドラッグしている「途中」の見え（持ち上げ）。値の突き合わせでは出ないので、ここで別に見る ──
  console.log("\n── ドラッグしている途中（持ち上げ）──");
  const midRects = async (page, sel) => page.evaluate((s) => {
    const layer = document.querySelector(s);
    const o = layer.getBoundingClientRect();
    const out = {};
    for (const el of layer.querySelectorAll("[data-id]")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      out[el.dataset.id] = { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height,
                             z: +getComputedStyle(el).zIndex };
    }
    return out;
  }, sel);

  for (const [name, id, dx, dy] of [
    ["並べ替え：小 を右へドラッグした途中", "row0", 150, 10],
    ["マス移動：カレンダーの 5 をドラッグした途中", "d4", 60, 34],
    ["自由：思いつき をドラッグした途中", "memo3", 90, 50],
  ]) {
    const p = await at(id);
    const hold = async (page) => {
      await page.mouse.move(p.x, p.y);
      await page.mouse.down();
      for (let i = 1; i <= 12; i++) { await page.mouse.move(p.x + dx * i / 12, p.y + dy * i / 12); await page.waitForTimeout(8); }
      await page.waitForTimeout(120);
    };
    await hold(lab.page);
    const lr = await midRects(lab.page, "#layer");
    await hold(re.page);
    await re.settle();
    const rr = await midRects(re.page, ".bl-layer");
    let worst = 0, n = 0, zbad = 0;
    for (const k of Object.keys(lr)) {
      if (!rr[k]) { bad.push(`${name}：ドラッグしている途中、React に ${k} が無い`); ng++; continue; }
      n++;
      for (const f of ["x", "y", "w", "h"]) worst = Math.max(worst, Math.abs(lr[k][f] - rr[k][f]));
      if (lr[k].z !== rr[k].z) zbad++;
    }
    // 掴んでいる泡が一番手前にいるか（持ち上げの肝）
    const top = (m) => Object.keys(m).reduce((a, k) => (m[k].z > m[a].z ? k : a), Object.keys(m)[0]);
    const okTop = top(lr) === top(rr);
    ok(worst <= 0.01 && zbad === 0 && okTop,
       `${name}　泡 ${n} 枚 いちばん大きい差 ${worst.toExponential(1)}px　描く順の食い違い ${zbad}　一番手前 ラボ ${top(lr)} / React ${top(rr)}`);
    if (!(worst <= 0.01 && zbad === 0 && okTop)) ng++;
    await lab.page.mouse.up(); await re.page.mouse.up();
    await lab.settle(); await re.settle();
  }

  console.log("");
  for (const m of bad.slice(0, 30)) console.log("   ！ " + m);
  const rle = re.errors();
  ok(rle.length === 0, `React のコンソールエラー ${rle.length}`);
  for (const e of rle.slice(0, 5)) console.log("     " + e);

  await lab.close(); await re.close();
  console.log(ng ? `\n触り方 ${ng} 件で食い違った` : `\n触り方 全部 OK（${CASES.length} 件）`);
  process.exit(ng || rle.length ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
