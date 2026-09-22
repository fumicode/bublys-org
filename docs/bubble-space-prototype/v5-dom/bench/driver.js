/* ============================================================================
   driver.js —— 台。**5案で共有する。ここは触らない**

   やること
     1. ?scene=A|B|C で場面を読む
     2. 解く（resolve.js）。ここは全案で同じ
     3. placements（画面座標の配列）を作って、案の render / update へ渡す
     4. 1フレームの時間を測る。style と layout は案の仕事なので、
        フレームの終わりに **わざとレイアウトを吐かせてから** 時計を止める
        （transform だけの案はここが 0 に近く、left/top の案はここに出る）
     5. window.__lab（v4 と同じ形）と window.__bench を出す。ベンチはこれだけを見る

   ★ 入力は #stage が1つで受ける。泡の要素は pointer-events:none にすること。
     当たり判定は placements から（resolve.js の hitTest）。案ごとに変えない
   ============================================================================ */
import { sceneOf, SCENES } from "./scene.js";
import * as E from "./resolve.js";

const qs = new URLSearchParams(location.search);
const HEADER = E.HEADER;

/** 案へ渡す1つの泡。x/y/w/h は画面（ステージ座標）。bw/bh はレンズを通す前の箱（w = bw × scale） */
function makePlacements(items, pool) {
  const out = [];
  for (let i = 0; i < items.length; i++) {
    const p = items[i], b = p.b;
    let o = pool.get(p.id);
    if (!o) pool.set(p.id, o = {});
    o.id = p.id; o.title = b.title; o.hue = b.hue; o.implicit = b.implicit;
    o.x = p.x; o.y = p.y; o.w = p.w; o.h = p.h;
    o.bw = p.box.w; o.bh = p.box.h;
    o.scale = p.scale; o.alpha = p.vis;
    o.header = b.implicit ? 0 : HEADER;
    o.depth = p.depth; o.space = p.space; o.i = i;
    out.push(o);
  }
  return out;
}

export function start({ name, render, update }) {
  const scene = sceneOf(qs.get("scene") || "A");
  const stage = document.getElementById("stage");
  const W = stage.clientWidth, H = stage.clientHeight;

  E.loadScene(scene);
  E.setViewport(W, H);
  E.installInput(stage);

  const api = {
    stage, scene, W, H, dpr: window.devicePixelRatio || 1,
    colorOf: p => `hsl(${p.hue} 70% 62%)`,
    headerH: E.HEADER,
  };

  const pool = new Map();
  const split = [];              // フレームごとの内訳（解く／描く）
  let first = true;

  function tick() {
    const t0 = performance.now();
    const items = E.resolveAll("step");
    const ps = makePlacements(items, pool);
    const t1 = performance.now();
    if (first) { render(ps, api); first = false; } else { update(ps, api); }
    // ★ style と layout をここで吐かせる。案の描き方の代金をフレームの中に入れるため
    void document.documentElement.offsetHeight;
    const t2 = performance.now();
    split.push({ solve: t1 - t0, draw: t2 - t1 });
    if (split.length > 4000) split.splice(0, 2000);
    requestAnimationFrame(tick);
  }

  // 最初の1枚は落ち着かせてから（補間を進めない）
  E.resolveAll("snap"); E.resolveAll("snap");

  const lab = E.labApi(stage);
  window.__lab = lab;
  window.__bench = {
    name, scene: { id: scene.id, label: scene.label, note: scene.note, bubbles: scene.bubbles.length,
                   drag: scene.drag, resize: scene.resize },   // 台本がねらう泡
    ready: false,
    split: () => split.slice(),
    resetSplit: () => { split.length = 0; },
    /** 生きている DOM 要素の数 */
    domCount: () => document.getElementsByTagName("*").length,
    /** 画面に出ている泡の数（消えていない・小さすぎない・1440×900 と重なる） */
    onScreen() {
      const r = stage.getBoundingClientRect();
      return lab.placements().filter(p => p.alpha > 0.01 && p.w > 0.5 && p.h > 0.5
        && p.x + p.w > r.left && p.x < r.right && p.y + p.h > r.top && p.y < r.bottom).length;
    },
    counts() {
      const ps = lab.placements();
      return { placements: ps.length, depth: Math.max(...ps.map(p => p.depth)), onScreen: this.onScreen(), dom: this.domCount() };
    },
    scenes: Object.keys(SCENES),
  };

  requestAnimationFrame(() => { requestAnimationFrame(() => { window.__bench.ready = true; }); });
  requestAnimationFrame(tick);
}
