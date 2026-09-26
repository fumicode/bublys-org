// v5-dom の lab.html を本物のブラウザ（headless Chromium）で開いて、本物のマウスで触って確かめる道具。
// v4/_check/lab.mjs の写し（v4 は1文字も編集しない）。足したのは DOM 版の口（elAt / hitModelAt / domCount）。
//
//   node docs/bubble-space-prototype/v5-dom/_check/all.mjs
//
// ★ file:// で開く。http サーバーは立てない（v5-dom/bench が ES モジュールを外に出して
//    file:// で CORS に弾かれ、泡の要素数 0 になったのが、そもそもの発端）
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const V5 = path.resolve(HERE, "..");
export const LAB = path.join(V5, "lab.html");
export const SHOT_DIR = path.join(HERE, "shots-v5");

export async function openLab(file = LAB, { width = 1440, height = 900, waitLab = true } = {}) {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  page.on("pageerror", (e) => errors.push("pageerror: " + (e.stack || e.message)));
  page.on("request", (r) => {
    const u = r.url();
    if (!u.startsWith("file:") && !u.startsWith("data:") && !u.startsWith("blob:")) errors.push("ネットワークを使った: " + u);
  });

  await page.goto("file://" + file);
  if (waitLab) {
    await page.waitForFunction(() => !!window.__lab, null, { timeout: 8000 })
      .catch(() => errors.push("window.__lab が出ていない"));
  }
  const base = path.basename(file, ".html");

  const lab = {
    page, browser,
    errors: () => errors.slice(),
    async call(fn, ...args) {
      return page.evaluate(([fn, args]) => {
        const f = window.__lab && window.__lab[fn];
        if (typeof f !== "function") throw new Error("__lab." + fn + " が無い");
        return f(...args);
      }, [fn, args]);
    },
    async settle() { try { await lab.call("settle"); } catch {} await page.waitForTimeout(60); },
    async shot(label) {
      await lab.settle();
      const p = path.join(SHOT_DIR, `${base}-${label}.png`);
      await page.screenshot({ path: p });
      return p;
    },
    rect: (id) => lab.call("rectOf", id),
    placements: () => lab.call("placements"),
    viewOf: (s) => lab.call("viewOf", s),
    focusOf: (s) => lab.call("focusOf", s),
    bubbles: () => lab.call("bubbles"),
    select: (id) => lab.call("select", id),
    preset: (n, s) => lab.call("preset", n, s),
    setAxis: (s, a, p) => lab.call("setAxis", s, a, p),
    headerPointOf: (id) => lab.call("headerPointOf", id),
    elAt: (x, y) => lab.call("elAt", x, y),
    hitAt: (x, y) => lab.call("hitAt", x, y),
    hitModelAt: (x, y) => lab.call("hitModelAt", x, y),
    domCount: () => lab.call("domCount"),
    /** 泡のヘッダを本物のマウスで掴んで動かす */
    async dragBubble(id, { dx = 0, dy = 0, to = null, steps = 16, hold = 0, onMove = null } = {}) {
      await lab.settle();
      const p = await lab.call("headerPointOf", id);
      const tx = to ? to.x : p.x + dx, ty = to ? to.y : p.y + dy;
      await page.mouse.move(p.x, p.y);
      await page.mouse.down();
      for (let i = 1; i <= steps; i++) {
        await page.mouse.move(p.x + (tx - p.x) * i / steps, p.y + (ty - p.y) * i / steps);
        await page.waitForTimeout(8);
        if (onMove) await onMove(i, steps);
      }
      if (hold) await page.waitForTimeout(hold);
      await page.mouse.up();
      await lab.settle();
      return { from: p, to: { x: tx, y: ty } };
    },
    async dragPoint(x1, y1, x2, y2, steps = 16) {
      await page.mouse.move(x1, y1); await page.mouse.down();
      for (let i = 1; i <= steps; i++) { await page.mouse.move(x1 + (x2 - x1) * i / steps, y1 + (y2 - y1) * i / steps); await page.waitForTimeout(8); }
      await page.mouse.up(); await lab.settle();
    },
    async wheel(x, y, deltaY) { await page.mouse.move(x, y); await page.mouse.wheel(0, deltaY); await page.waitForTimeout(60); await lab.settle(); },
    async hover(x, y) { await page.mouse.move(x, y); await page.waitForTimeout(80); },
    async textOf(sel) { return page.evaluate((s) => document.querySelector(s)?.innerText ?? null, sel); },
    async close() { await browser.close(); },
  };
  return lab;
}

export const ok = (c, m) => console.log((c ? "  ok   " : "  NG   ") + m);
export const num = (v, d = 2) => (typeof v === "number" ? v.toFixed(d) : String(v));
