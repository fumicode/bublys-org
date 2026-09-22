/* ============================================================================
   bench.mjs —— 測る。**5案で共有する。ここは触らない**

     node docs/bubble-space-prototype/v5-dom/bench/bench.mjs                 … 全案 × 全場面
     node docs/bubble-space-prototype/v5-dom/bench/bench.mjs --case absolute
     node docs/bubble-space-prototype/v5-dom/bench/bench.mjs --scene A --runs 5
     node docs/bubble-space-prototype/v5-dom/bench/bench.mjs --case v4       … canvas の基準（v4/lab.html を直に）

   台本（全案・全場面で同じ。1ステップ ＝ 1フレーム。ページの中から流す）
     (a) drag   いちばん外の泡のヘッダを掴んで、60 フレームで 300px 右へ（位置だけ変わる）
     (b) wheel  背景でホイール。焦点 Z を 30 送って 30 戻す（全部の泡の倍率が変わる）
     (c) resize 泡の右下の角を掴んで、60 フレームで +120px（⑤ pin が働いて値が書き換わる）

   測り方
     ・時計は requestAnimationFrame の中。コールバックに入った時刻と、出るまでの時間を毎フレーム記録する。
       これを v4/lab.html にも同じ仕掛けで当てるので、**基準と案は同じ物差し**で測れる
     ・1フレームの時間 ＝ コールバックに入った時刻の差（間隔）。work ＝ コールバックの中にいた時間
       （雛形は work の終わりに style と layout を吐かせているので、DOM の代金は work に入る）
     ・ウォームアップ 60 フレームは測らない。各フェーズの最初の 10 フレームも捨てる
     ・同じ台本を 3 回走らせて、指標ごとに中央値
     ・内訳は CDP の Performance.getMetrics の差分（Script / RecalcStyle / Layout / Task）

   ★ headless Chromium の注意
     合成（compositor）と GPU ラスタの振る舞いは実機と違うことがある。
     rAF の中で測る work には **ラスタと合成は入らない**（別スレッド）。
     だから「transform だけの案」は work では有利に出る。CDP の Task との差（other）と、
     フレームの間隔・落ちたフレーム数を合わせて読むこと。
   ============================================================================ */
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BENCH = HERE;
const PROTO = path.resolve(HERE, "../..");            // docs/bubble-space-prototype
const RESULTS = path.join(BENCH, "results");

/* ── 引数 ── */
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 ? argv[i + 1] : d; };
const RUNS = Number(arg("runs", 3));
const SCENES = String(arg("scene", "A,B,C")).split(",").map(s => s.trim()).filter(Boolean);
const ONLY = arg("case", null);
const STEPS = Number(arg("steps", 60));
const WARMUP = Number(arg("warmup", 60));
const DROP = Number(arg("drop", 10));

/* ── 小さな静かなサーバ（ループバックだけ。外へは出ない） ── */
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
               ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
               ".css": "text/css; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".md": "text/plain; charset=utf-8" };
function serve() {
  const srv = http.createServer((req, res) => {
    const p = path.join(PROTO, decodeURIComponent(req.url.split("?")[0]));
    if (!p.startsWith(PROTO) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": MIME[path.extname(p)] ?? "application/octet-stream", "cache-control": "no-store" });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise(r => srv.listen(0, "127.0.0.1", () => r({ srv, port: srv.address().port })));
}

/* ── ページに先に仕込むもの：rAF の時計 と setPointerCapture の当て木 ── */
const INIT = () => {
  const raf = window.requestAnimationFrame.bind(window);
  window.__raf = raf;                       // 台本が使う素の rAF（時計に入れない）
  window.__rec = [];
  window.requestAnimationFrame = cb => raf(t => {
    const a = performance.now();
    cb(t);
    window.__rec.push([a, performance.now() - a]);
  });
  // 合成した PointerEvent は pointerId が生きていないので setPointerCapture が投げる。
  // v4/lab.html は pointerdown の頭でこれを呼ぶ（ファイルは触らないので、当て木をここで）
  const sp = Element.prototype.setPointerCapture, rp = Element.prototype.releasePointerCapture;
  Element.prototype.setPointerCapture = function (id) { try { return sp.call(this, id); } catch { } };
  Element.prototype.releasePointerCapture = function (id) { try { return rp.call(this, id); } catch { } };
};

/* ── 台本（ページの中で動く。v4 でも雛形でも同じもの） ── */
const PLAYER = () => {
  const nf = () => new Promise(r => window.__raf(() => r()));
  const el = (x, y) => document.elementFromPoint(x, y) || document.body;
  const pe = (type, x, y, extra) => new PointerEvent(type, {
    pointerId: 1, pointerType: "mouse", isPrimary: true, bubbles: true, cancelable: true,
    clientX: x, clientY: y, buttons: type === "pointerup" ? 0 : 1, button: 0, ...extra });
  const we = (x, y, dy) => new WheelEvent("wheel", { bubbles: true, cancelable: true, clientX: x, clientY: y, deltaY: dy, deltaMode: 0 });

  /** 泡に当たらない点（＝背景＝root）を探す */
  function background() {
    const L = window.__lab;
    for (const y of [140, 200, 300, 450, 600, 760, 840])
      for (const x of [1420, 1400, 1360, 24, 60, 720, 1000])
        if (!L.hitAt(x, y) && document.elementFromPoint(x, y)) return { x, y };
    return { x: 1420, y: 840 };
  }

  window.__play = {
    background,
    async idle(n) { for (let i = 0; i < n; i++) await nf(); },
    async drag(id, steps, dx) {
      const L = window.__lab, p = L.headerPointOf(id);
      if (!p) throw new Error("掴めない: " + id);
      const before = L.bubbles().find(b => b.id === id);
      const tgt = el(p.x, p.y);
      tgt.dispatchEvent(pe("pointerdown", p.x, p.y)); await nf();
      for (let i = 1; i <= steps; i++) { tgt.dispatchEvent(pe("pointermove", p.x + dx * i / steps, p.y)); await nf(); }
      tgt.dispatchEvent(pe("pointerup", p.x + dx, p.y)); await nf();
      const after = L.bubbles().find(b => b.id === id);
      return { moved: +(after.free.x - before.free.x).toFixed(2), screen: +(L.rectOf(id).x - p.x + 0).toFixed(2) };
    },
    async wheel(steps, dy) {
      const L = window.__lab, b = background(), tgt = el(b.x, b.y);
      const z0 = L.focusOf("root").z;
      for (let i = 0; i < steps / 2; i++) { tgt.dispatchEvent(we(b.x, b.y, dy)); await nf(); }
      const zMid = L.focusOf("root").z;                 // 送りきった所（ここで倍率が一番変わっている）
      for (let i = 0; i < steps / 2; i++) { tgt.dispatchEvent(we(b.x, b.y, -dy)); await nf(); }
      return { at: b, z0, zMid, z1: L.focusOf("root").z };
    },
    async resize(id, steps, d) {
      const L = window.__lab;
      L.select(id); await nf(); await nf();
      const r = L.rectOf(id);
      if (!r) throw new Error("角が無い: " + id);
      const x = r.x + r.w - 4, y = r.y + r.h - 4, tgt = el(x, y);
      const b0 = L.bubbles().find(b => b.id === id).size;
      tgt.dispatchEvent(pe("pointerdown", x, y)); await nf();
      for (let i = 1; i <= steps; i++) { tgt.dispatchEvent(pe("pointermove", x + d * i / steps, y + d * i / steps)); await nf(); }
      tgt.dispatchEvent(pe("pointerup", x + d, y + d)); await nf();
      const b1 = L.bubbles().find(b => b.id === id).size;
      return { grew: +(b1.w - b0.w).toFixed(2) };
    },
    rec() { const r = window.__rec; window.__rec = []; return r; },
    onScreen() {
      const L = window.__lab, ps = L.placements();
      return ps.filter(p => p.alpha > 0.01 && p.w > 0.5 && p.h > 0.5
        && p.x + p.w > 0 && p.x < innerWidth && p.y + p.h > 0 && p.y < innerHeight).length;
    },
    counts() {
      const ps = window.__lab.placements();
      return { placements: ps.length, depth: Math.max(...ps.map(p => p.depth)),
               onScreen: window.__play.onScreen(), dom: document.getElementsByTagName("*").length };
    },
  };
  return true;
};

/* ── 統計 ── */
const q = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + .5))]; };
const r2 = v => v == null ? null : +v.toFixed(2);
const stat = a => ({ p50: r2(q(a, .5)), p95: r2(q(a, .95)), max: r2(Math.max(...a)),
                     mean: r2(a.reduce((x, y) => x + y, 0) / (a.length || 1)), n: a.length });
const median = a => { const s = a.filter(v => v != null).sort((x, y) => x - y); return s.length ? s[(s.length - 1) >> 1] : null; };
const medObj = list => {                       // 同じ形のオブジェクトの配列 → 各値の中央値
  if (!list.length) return null;
  const out = {};
  for (const k of Object.keys(list[0])) {
    const vs = list.map(o => o?.[k]);
    out[k] = typeof vs[0] === "object" && vs[0] !== null ? medObj(vs) : r2(median(vs));
  }
  return out;
};

const METRICS = ["ScriptDuration", "RecalcStyleDuration", "LayoutDuration", "TaskDuration",
                 "LayoutCount", "RecalcStyleCount", "JSHeapUsedSize", "Nodes", "LayoutObjects"];
const readMetrics = async cdp => {
  const { metrics } = await cdp.send("Performance.getMetrics");
  return Object.fromEntries(metrics.filter(m => METRICS.includes(m.name)).map(m => [m.name, m.value]));
};
const diff = (a, b) => ({
  scriptMs: r2((b.ScriptDuration - a.ScriptDuration) * 1000),
  styleMs: r2((b.RecalcStyleDuration - a.RecalcStyleDuration) * 1000),
  layoutMs: r2((b.LayoutDuration - a.LayoutDuration) * 1000),
  taskMs: r2((b.TaskDuration - a.TaskDuration) * 1000),
  otherMs: r2((b.TaskDuration - a.TaskDuration - (b.ScriptDuration - a.ScriptDuration)
    - (b.RecalcStyleDuration - a.RecalcStyleDuration) - (b.LayoutDuration - a.LayoutDuration)) * 1000),
  layoutCount: b.LayoutCount - a.LayoutCount,
  styleCount: b.RecalcStyleCount - a.RecalcStyleCount,
});

/* ── 1回走らせる ── */
async function once(browser, url, sc, shotAs) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const bad = [];
  page.on("console", m => { if (m.type() === "error") bad.push("console: " + m.text()); });
  page.on("pageerror", e => bad.push("pageerror: " + (e.stack || e.message)));
  page.on("request", r => { const u = r.url();
    if (!u.startsWith(`http://127.0.0.1:${sc.port}/`) && !u.startsWith("data:") && !u.startsWith("blob:"))
      bad.push("外へ出た: " + u); });
  await page.addInitScript(INIT);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");

  await page.goto(url);
  await page.waitForFunction(() => !!window.__lab, null, { timeout: 15000 });
  await page.evaluate(PLAYER);
  await page.evaluate(n => window.__play.idle(n), WARMUP);      // ウォームアップは測らない
  const scene = await page.evaluate(() => window.__bench && window.__bench.scene) ?? V4_TARGETS;

  const counts = await page.evaluate(() => window.__play.counts());
  if (shotAs) {                                   // 絵が同じかを目で確かめるため（案どうしは同じ絵を描くこと）
    fs.mkdirSync(path.join(RESULTS, "shots"), { recursive: true });
    await page.screenshot({ path: path.join(RESULTS, "shots", shotAs + ".png") });
  }
  const cadence = (raw => { const iv = []; for (let i = 1; i < raw.length; i++) iv.push(raw[i][0] - raw[i - 1][0]); return q(iv, .5); })
    (await page.evaluate(async () => { await window.__play.idle(40); return window.__play.rec(); }));

  const phases = {};
  const script = [
    ["drag",   p => p.evaluate(([id, s]) => window.__play.drag(id, s, 300), [scene.drag, STEPS])],
    ["wheel",  p => p.evaluate(s => window.__play.wheel(s, -8), STEPS)],
    ["resize", p => p.evaluate(([id, s]) => window.__play.resize(id, s, 120), [scene.resize, STEPS])],
  ];
  for (const [nameP, run] of script) {
    await page.evaluate(() => { window.__play.rec(); if (window.__bench) window.__bench.resetSplit(); });
    const m0 = await readMetrics(cdp);
    const info = await run(page);
    const m1 = await readMetrics(cdp);
    const raw = await page.evaluate(() => window.__play.rec());
    const rec = raw.slice(DROP);                                  // 最初の10フレームは測らない
    const work = rec.map(r => r[1]);
    const iv = []; for (let i = 1; i < rec.length; i++) iv.push(rec[i][0] - rec[i - 1][0]);
    const lim = (cadence ?? 16.7) * 1.5;
    const sp = (await page.evaluate(() => (window.__bench ? window.__bench.split() : []))).slice(DROP);
    phases[nameP] = {
      work: stat(work), frame: stat(iv),
      dropped: iv.filter(v => v > lim).length,        // rAF の間隔が、何もしていないときの 1.5 倍を超えた数
      over60: work.filter(v => v > 1000 / 60).length, // 60fps の予算（16.7ms）を超えたフレームの数
      solve: sp.length ? stat(sp.map(x => x.solve)) : null,
      draw:  sp.length ? stat(sp.map(x => x.draw))  : null,
      onScreen: await page.evaluate(() => window.__play.onScreen()),
      cdp: diff(m0, m1), info,
    };
    await page.evaluate(() => window.__play.idle(20));            // 次のフェーズの前に落ち着かせる
  }
  const m = await readMetrics(cdp);
  const out = {
    counts, cadenceMs: r2(cadence), phases,
    heapMB: r2(m.JSHeapUsedSize / 1048576), nodes: m.Nodes, layoutObjects: m.LayoutObjects, bad,
  };
  await page.close();
  return out;
}

/* ── 並べる ── */
function table(name, sceneId, r) {
  const L = [];
  L.push(`  場面${sceneId}  泡 ${r.counts.placements}（画面の中 ${r.counts.onScreen}）  入れ子 ${r.counts.depth} 段  DOM 要素 ${r.counts.dom}  rAF の間隔 ${r.cadenceMs}ms`);
  L.push(`    ${"操作".padEnd(8)}${"work p50".padStart(9)}${"p95".padStart(8)}${"max".padStart(8)}${"解く".padStart(8)}${"描く".padStart(8)}${"間隔p50".padStart(9)}${"落ち".padStart(5)}${">16.7".padStart(6)}${"script".padStart(8)}${"style".padStart(8)}${"layout".padStart(8)}${"other".padStart(8)}`);
  for (const [k, p] of Object.entries(r.phases))
    L.push(`    ${k.padEnd(10)}${String(p.work.p50).padStart(8)}${String(p.work.p95).padStart(8)}${String(p.work.max).padStart(8)}${String(p.solve ? p.solve.p50 : "-").padStart(8)}${String(p.draw ? p.draw.p50 : "-").padStart(8)}${String(p.frame.p50).padStart(8)}${String(p.dropped).padStart(5)}${String(p.over60).padStart(6)}${String(p.cdp.scriptMs).padStart(8)}${String(p.cdp.styleMs).padStart(8)}${String(p.cdp.layoutMs).padStart(8)}${String(p.cdp.otherMs).padStart(8)}`);
  L.push(`    heap ${r.heapMB}MB  Nodes ${r.nodes}  LayoutObjects ${r.layoutObjects}（1フレームあたりの ms は work、script〜other はフェーズ合計の ms）`);
  return L.join("\n");
}

/* ── main ── */
const { srv, port } = await serve();
const sc = { port };
const cases = ONLY ? [ONLY]
  : ["v4", ...fs.readdirSync(BENCH).filter(f => f.endsWith(".html") && !f.startsWith("_")).map(f => f.slice(0, -5)).sort()];
const urlOf = (c, s) => c === "v4"
  ? `http://127.0.0.1:${port}/v4/lab.html`
  : `http://127.0.0.1:${port}/v5-dom/bench/${c}.html?scene=${s}`;

const browser = await chromium.launch({ headless: true });
const version = browser.version();
fs.mkdirSync(RESULTS, { recursive: true });
// v4/lab.html は __bench を持たないので、そこだけ台本のねらう泡を書いておく（場面A と同じ泡）
const V4_TARGETS = { drag: "memo1", resize: "staff" };

let bad = 0;
for (const c of cases) {
  const out = { case: c, when: new Date().toISOString(), runs: RUNS, viewport: [1440, 900],
                chromium: version, steps: STEPS, warmup: WARMUP, drop: DROP, scenes: {} };
  console.log(`\n■ ${c}${c === "v4" ? "（canvas の基準：docs/bubble-space-prototype/v4/lab.html）" : ""}`);
  const scenes = c === "v4" ? ["A"] : SCENES;       // v4 は自前の場面しか持たない＝場面A だけ
  for (const s of scenes) {
    const runs = [];
    for (let i = 0; i < RUNS; i++) runs.push(await once(browser, urlOf(c, s), sc, i === 0 ? `${c}-${s}` : null));
    const errs = runs.flatMap(r => r.bad);
    if (errs.length) { bad++; console.log(`  ！ ${errs.length} 件: ${errs[0].slice(0, 120)}`); }
    const merged = medObj(runs.map(({ bad, ...r }) => r));
    merged.counts = runs[0].counts;
    merged.info = Object.fromEntries(Object.entries(runs[0].phases).map(([k, p]) => [k, p.info]));
    out.scenes[s] = merged;
    console.log(table(c, s, merged));
    const tell = merged.info;
    console.log(`    台本が効いたか：drag 値 +${tell.drag.moved} ／ wheel 焦点Z ${r2s(tell.wheel.z0)}→${r2s(tell.wheel.zMid)}→${r2s(tell.wheel.z1)}（背景 ${tell.wheel.at.x},${tell.wheel.at.y}）／ resize 幅 +${tell.resize.grew}`);
    if (Math.abs(tell.drag.moved) < 1) { bad++; console.log("    ！ drag が効いていない"); }
    if (Math.abs(tell.wheel.zMid - tell.wheel.z0) < 1e-6) { bad++; console.log("    ！ wheel が効いていない（焦点Zが動かない）"); }
    if (!(tell.resize.grew > 1)) { bad++; console.log("    ！ resize が効いていない"); }
  }
  fs.writeFileSync(path.join(RESULTS, `${c}.json`), JSON.stringify(out, null, 1));
}
function r2s(v) { return v == null ? "-" : (+v).toFixed(3); }
await browser.close();
srv.close();
console.log(`\n結果: ${RESULTS}/*.json`);
process.exit(bad ? 1 : 0);
