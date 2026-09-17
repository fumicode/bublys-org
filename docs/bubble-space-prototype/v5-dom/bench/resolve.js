/* ============================================================================
   resolve.js —— 値 → 画面上の配置。**5案で共有する。ここは触らない**

   docs/bubble-space-prototype/v4/lab.html の §1〜§3 を写したもの。
   仕様は docs/bubble-space-prototype/v4/RULES.md（正はそこ）。

   ベンチで比べたいのは「描き方」であって「解き方」ではない。
   だから解く所は1つにして、各案は placements（画面座標の配列）を受け取って描くだけにする。

   v4 から落としたもの（ベンチの台本で使わない。落としても placements の式は変わらない）
     落とし込み（commitDrop・slotAt・snapAt・spaceSlotAt）／くっつける操作（snapOp）／
     描画・札・ヒント・右上の一覧・軸セレクタ。
   v4 から残したもの
     次元・並べ方・レンズ・帯・泡の像・measure・resolveSpace・合成・補間・
     当たり判定・泡のドラッグ（②）・背景と角のドラッグ・ホイール・⑤ pin。
   見えない親（③）は、操作で作らず**場面のデータに最初から書く**（v4 の起動直後と同じ形）。
   ============================================================================ */

export const HEADER = 24;
export const PAD = 14;
export const GAP = 14;
export const K_PERSP = 0.26;
export const ROOT_VP = { x: -130, y: -165 };
const VP_CHILD = { fx: 1, fy: 1 };
const RING = 12;
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

const headOf = b => b && b.implicit ? 0 : HEADER;
const padOf = b => b && b.implicit ? 0 : PAD;

/** 次元：泡 → 値。write は null＝書けない＝視点が動く */
export const DIMS = {
  "none":           { label: "なし",       write: null,      read: () => 0 },
  "free.x":         { label: "自由X",      write: "coord",   key: "x",   read: b => b.free.x },
  "free.y":         { label: "自由Y",      write: "coord",   key: "y",   read: b => b.free.y },
  "free.z":         { label: "自由Z",      write: "coord",   key: "z",   read: b => b.free.z },
  "order":          { label: "順序",       write: "reorder",             read: b => b.order },
  "col":            { label: "列",         write: "cell",    key: "col", read: b => b.cell.col },
  "row":            { label: "行",         write: "cell",    key: "row", read: b => b.cell.row },
  "history.index":  { label: "履歴の世代", write: null,                  read: b => b.hist },
  "history.age":    { label: "履歴の古さ", write: null,                  read: (b, space) => maxHistIn(space) - b.hist },
  "history.branch": { label: "履歴の枝",   write: null,                  read: b => b.branch },
};
const verbOf = dimId => dimId === "none" ? "none" : (DIMS[dimId].write ?? "focus");

const TANH_EDGE = 1 - 1e-12;
export const LENS_XY = {
  parallel: { label: "平行", project: (u, H) => ({ s: u, k: 1 }), unproject: (s, H) => s },
  fisheye:  { label: "魚眼",
    project: (u, H) => { const t = u / H, c = Math.cosh(t); return { s: H * Math.tanh(t), k: 1 / (c * c) }; },
    unproject: (s, H) => H * Math.atanh(clamp(s / H, -TANH_EDGE, TANH_EDGE)) },
};
export const LENS_Z = {
  perspective: { label: "透視", mag: dz => 1 / Math.max(0.05, 1 + K_PERSP * dz), alpha: dz => dz < -1e-9 ? 0 : 1 },
  flat:        { label: "平行", mag: () => 1, alpha: () => 1 },
};

const AX = (dim, arrange, lens, step, extra) => ({ dim, arrange, lens, step, ...extra });
export const PRESETS = {
  free:      { x: AX("free.x", "as-is", "parallel", 110),         y: AX("free.y", "as-is", "parallel", 80),          z: AX("free.z", "as-is", "perspective", 1) },
  row:       { x: AX("order", "pack", "parallel", 110),           y: AX("none", "pack", "parallel", 80),             z: AX("none", "as-is", "flat", 1) },
  column:    { x: AX("none", "pack", "parallel", 110),            y: AX("order", "pack", "parallel", 80),            z: AX("none", "as-is", "flat", 1) },
  grid:      { x: AX("col", "pack", "parallel", 110),             y: AX("row", "pack", "parallel", 80),              z: AX("none", "as-is", "flat", 1) },
  fisheyeX:  { x: AX("history.index", "equal", "fisheye", 64),    y: AX("history.branch", "equal", "parallel", 44),  z: AX("none", "as-is", "flat", 1) },
  coverflow: { x: AX("order", "equal", "fisheye", 68),            y: AX("none", "pack", "parallel", 80),             z: AX("none", "as-is", "flat", 1) },
  histZ:     { x: AX("none", "as-is", "parallel", 110),           y: AX("none", "as-is", "parallel", 80),            z: AX("history.age", "equal", "perspective", 1) },
  stackZ:    { x: AX("free.x", "as-is", "parallel", 110),         y: AX("free.y", "as-is", "parallel", 80),          z: AX("order", "equal", "perspective", 0.15) },
  // ベンチの場面C用：X も Y も魚眼、Z は透視。泡ごとに倍率が全部ちがう
  fisheyeXY: { x: AX("free.x", "as-is", "fisheye", 110),          y: AX("free.y", "as-is", "fisheye", 80),           z: AX("free.z", "as-is", "perspective", 1) },
};
const viewFromPreset = id => { const p = PRESETS[id]; return { x: { ...p.x }, y: { ...p.y }, z: { ...p.z } }; };
const mkView = v => typeof v === "string" ? viewFromPreset(v)
  : { x: { ...(v.x ?? PRESETS.free.x) }, y: { ...(v.y ?? PRESETS.free.y) }, z: { ...(v.z ?? PRESETS.free.z) } };

/* ============================================================
   状態
   ============================================================ */
export let ROOT = { id: "root", title: "外の空間", hue: null, view: viewFromPreset("free"), focus: { x: 0, y: 0, z: 0 } };
export let bubbles = [];
let BYID = new Map();
export const byId = id => BYID.get(id);
export let selectedId = null;
export const select = id => { selectedId = id; };

export let frameItems = [];
export let PLACE = new Map();
export let LAYOUT = new Map();
const anim = new Map();
const EASE = 0.2;
let drag = null;
let VW = 1440, VH = 900;
let KIDS = new Map();

export function loadScene(scene) {
  bubbles = []; BYID = new Map(); anim.clear(); frameItems = []; PLACE = new Map(); LAYOUT = new Map(); drag = null;
  ROOT = { id: "root", title: "外の空間", hue: null, view: mkView(scene.rootView ?? "free"), focus: { x: 0, y: 0, z: 0 } };
  for (const p of scene.bubbles) {
    const b = {
      id: p.id, title: p.title, hue: p.hue,
      size: { w: p.w, h: p.h },
      parent: p.parent ?? null,
      free: { x: 0, y: 0, z: 0, ...p.free },
      order: p.order ?? 0,
      cell: { col: 0, row: 0, ...p.cell },
      hist: p.hist ?? 0, branch: p.branch ?? 0,
      view: p.view ? mkView(p.view) : null,
      implicit: !!p.implicit,
      focus: { x: 0, y: 0, z: 0 },
    };
    bubbles.push(b); BYID.set(b.id, b);
  }
  selectedId = scene.selected ?? (bubbles[0] && bubbles[0].id) ?? null;
  reindex();
}
export function setViewport(w, h) { VW = w; VH = h; }

function reindex() {
  KIDS = new Map([["root", []]]);
  for (const b of bubbles) {
    const p = b.parent ?? "root";
    if (!KIDS.has(p)) KIDS.set(p, []);
    KIDS.get(p).push(b);
  }
}
export const kidsOf = id => KIDS.get(id) ?? [];
const spaceObj = id => id === "root" ? ROOT : byId(id);
const parentOf = id => id === "root" ? null : (byId(id).parent ?? "root");
const isHost = b => b.view !== null || kidsOf(b.id).length > 0;
const maxHistIn = spaceId => Math.max(0, ...kidsOf(spaceId).map(b => b.hist));
function isAncestor(a, id) { for (let cur = id; cur; cur = parentOf(cur)) if (cur === a) return true; return false; }
function subtreeOf(id) { const s = new Set([id]); const walk = x => kidsOf(x).forEach(k => { s.add(k.id); walk(k.id); }); walk(id); return s; }
const windowOf = id => { let s = id; while (s !== "root" && byId(s) && byId(s).implicit) s = parentOf(s); return s; };
const focusZ = id => spaceObj(windowOf(id)).focus.z;

/* §4 継承：並べ方は外から継ぐ。焦点は継がない */
export function viewOf(spaceId) {
  const sp = spaceObj(spaceId);
  const src = sp.view ?? viewOf(parentOf(spaceId));
  const z = spaceId !== "root" && sp.implicit ? viewOf(windowOf(spaceId)).z : src.z;
  return { x: { ...src.x }, y: { ...src.y }, z: { ...z }, focus: sp.focus, own: !!sp.view };
}

/* ============================================================
   §2 並べ方：値 → 空間の中での位置（④ 帯の式）
   ============================================================ */
function arrangeAxis(A, kids, axis, spaceId, sizeOf) {
  const dim = DIMS[A.dim];
  const val = b => dim.read(b, spaceId);
  const len = b => axis === "x" ? sizeOf(b).w : sizeOf(b).h;
  const pos = new Map(), bands = [];
  const values = [...new Set(kids.map(val))].sort((p, q) => p - q);
  const gap = A.gap ?? GAP;
  let mid = 0;

  if (axis === "z") {
    for (const b of kids) {
      const v = val(b);
      pos.set(b.id, A.arrange === "equal" ? v * A.step : A.arrange === "pack" ? values.indexOf(v) : v);
    }
  } else if (A.arrange === "as-is") {
    for (const b of kids) pos.set(b.id, val(b));
  } else if (A.arrange === "equal") {
    let lo = Infinity, hi = -Infinity;
    for (const b of kids) { const c = val(b) * A.step; lo = Math.min(lo, c - len(b) / 2); hi = Math.max(hi, c + len(b) / 2); }
    if (kids.length) mid = (lo + hi) / 2;
    for (const b of kids) pos.set(b.id, val(b) * A.step - mid);
    for (const v of values) bands.push({ value: v, start: v * A.step - mid - A.step / 2, end: v * A.step - mid + A.step / 2 });
  } else {
    let total = -gap;
    const bandLen = new Map();
    for (const v of values) {
      const l = Math.max(...kids.filter(b => val(b) === v).map(len));
      bandLen.set(v, l); total += l + gap;
    }
    let at = -Math.max(0, total) / 2;
    for (const v of values) { bands.push({ value: v, start: at, end: at + bandLen.get(v) }); at += bandLen.get(v) + gap; }
    for (const b of kids) {
      const bd = bands.find(x => x.value === val(b));
      pos.set(b.id, A.align === "center" ? (bd.start + bd.end) / 2 : bd.start + len(b) / 2);
    }
  }
  return { pos, bands, mid, gap };
}

/** ① 泡の像：泡の端をレンズに通した間。k＝像の幅÷自前の幅、s＝像の中点 */
function projectIn(arr, b, lens, H, f, len) {
  const p = arr.pos.get(b.id);
  if (!(len > 1e-9)) return lens.project(p - f, H);
  const s0 = lens.project(p - len / 2 - f, H).s, s1 = lens.project(p + len / 2 - f, H).s;
  return { s: (s0 + s1) / 2, k: (s1 - s0) / len };
}

/** 箱の大きさ。等間隔・詰めるの軸は中身が収まるまで伸びる */
function measure(b, memo) {
  if (memo.has(b.id)) return memo.get(b.id);
  const box = { w: b.size.w, h: b.size.h };
  const kids = kidsOf(b.id), head = headOf(b), pad = padOf(b);
  if (kids.length) {
    const V = viewOf(b.id), sizeOf = k => measure(k, memo);
    for (const axis of ["x", "y"]) {
      const A = V[axis];
      if (A.arrange === "as-is" && !b.implicit) continue;
      const ar = arrangeAxis(A, kids, axis, b.id, sizeOf);
      const lens = LENS_XY[A.lens];
      const ownHalf = Math.max(0, axis === "x" ? b.size.w : b.size.h - head) / 2;
      const halfLen = k => (axis === "x" ? sizeOf(k).w : sizeOf(k).h) / 2;
      let half = ownHalf;
      for (let n = 0; n < 60; n++) {
        const H = Math.max(1, half);
        let need = 0;
        for (const k of kids) { const p = projectIn(ar, k, lens, H, 0, halfLen(k) * 2); need = Math.max(need, Math.abs(p.s) + halfLen(k) * p.k); }
        const next = Math.max(ownHalf, need + pad);
        if (Math.abs(next - half) < 1e-6) { half = next; break; }
        half = next;
      }
      if (axis === "x") box.w = half * 2; else box.h = half * 2 + head;
    }
  }
  memo.set(b.id, box);
  return box;
}

const halfOf = host => ({ x: Math.max(1, host.w / 2), y: Math.max(1, host.h / 2) });
function lensCtx(spaceId, host, focus) {
  const H = halfOf(host);
  return {
    focus: { ...focus }, H,
    vp: spaceId === "root" ? { ...ROOT_VP }
      : { x: -Math.max(0, H.x - padOf(byId(spaceId))) * VP_CHILD.fx, y: -Math.max(0, H.y - padOf(byId(spaceId))) * VP_CHILD.fy },
  };
}

/* ============================================================
   §2 解く順番（1フレーム）
   ============================================================ */
function ease(id, target, mode) {
  let a = anim.get(id);
  if (!a || mode === "snap") { a = { ...target }; anim.set(id, a); return a; }
  if (mode === "keep") return a;
  for (const k in target) a[k] += (target[k] - a[k]) * EASE;
  return a;
}
/** ★ 合成はここ1回だけ。深さ n でも scale は数値1つ */
function compose(host, a) {
  const scale = host.scale * a.scale;
  const w = a.w * scale, h = a.h * scale;
  return { x: host.cx + a.x * host.scale - w / 2, y: host.cy + a.y * host.scale - h / 2, w, h, scale, alpha: host.alpha * a.alpha };
}
const contentOf = p => { const hd = headOf(p.b); return {
  cx: p.x + p.w / 2, cy: p.y + (hd + (p.box.h - hd) / 2) * p.scale,
  w: p.box.w, h: p.box.h - hd, scale: p.scale, alpha: p.alpha, vis: p.vis, depth: p.depth }; };

function resolveSpace(spaceId, host, memo, sink, lifted, mode) {
  const V = viewOf(spaceId), kids = kidsOf(spaceId);
  const sizeOf = b => measure(b, memo);
  const arr = { x: arrangeAxis(V.x, kids, "x", spaceId, sizeOf),
                y: arrangeAxis(V.y, kids, "y", spaceId, sizeOf),
                z: arrangeAxis(V.z, kids, "z", spaceId, sizeOf) };
  const own = spaceId === "root" ? host : (m => ({ w: m.w, h: m.h - headOf(byId(spaceId)) }))(measure(byId(spaceId), memo));
  const L = { id: spaceId, host, V, arr, kids, sizeOf, H: halfOf(own) };
  const sp = spaceObj(spaceId);
  const passZ = windowOf(spaceId) !== spaceId;
  for (const axis of ["x", "y", "z"]) if (!(axis === "z" && passZ)) sp.focus[axis] = fitFocus(L, axis, sp.focus[axis], sp.focus[axis]);
  L.focus = { ...sp.focus, z: focusZ(spaceId) };
  const ctx = L.ctx = lensCtx(spaceId, host, L.focus);
  LAYOUT.set(spaceId, L);
  const lx = LENS_XY[V.x.lens], ly = LENS_XY[V.y.lens], lz = LENS_Z[V.z.lens];

  const items = kids.map((b, i) => {
    const pos = { x: arr.x.pos.get(b.id), y: arr.y.pos.get(b.id), z: arr.z.pos.get(b.id) };
    const box = sizeOf(b);
    const px = projectIn(arr.x, b, lx, ctx.H.x, ctx.focus.x, box.w);
    const py = projectIn(arr.y, b, ly, ctx.H.y, ctx.focus.y, box.h);
    const dz = b.implicit ? 0 : pos.z - ctx.focus.z, m = lz.mag(dz);
    const target = { x: ctx.vp.x + (px.s - ctx.vp.x) * m, y: ctx.vp.y + (py.s - ctx.vp.y) * m,
                     scale: m * Math.min(px.k, py.k), alpha: lz.alpha(dz), w: box.w, h: box.h };
    return { b, i, dz, m, pos, target };
  });
  items.sort((p, q) => q.dz - p.dz || p.target.scale - q.target.scale || p.i - q.i);

  const snapAll = drag && drag.started && (drag.snapSpace === spaceId || drag.kind === "resize" && isAncestor(spaceId, drag.id));
  for (const it of items) {
    const b = it.b;
    const grabbed = drag && drag.started && drag.id === b.id;
    const a = ease(b.id, it.target, snapAll || grabbed ? "snap" : mode);
    let place = compose(host, a);
    if (grabbed && drag.lift) {
      const scale = drag.scale0, w = a.w * scale, h = a.h * scale;
      const cx = place.x + place.w / 2, cy = place.y + place.h / 2;
      const follow = ax => drag.verbs[ax] === "reorder" || drag.verbs[ax] === "cell";
      place = { x: follow("x") ? drag.mx - drag.fx * w : cx - w / 2, y: follow("y") ? drag.my - drag.fy * h : cy - h / 2,
                w, h, scale, alpha: 1 };
    }
    place.vis = host.vis * it.target.alpha;
    Object.assign(place, { id: b.id, b, space: spaceId, depth: host.depth + 1, local: a.scale, m: it.m,
                           pos: it.pos, box: { w: a.w, h: a.h } });
    const out = grabbed ? lifted : sink;
    out.push(place);
    if (isHost(b)) resolveSpace(b.id, contentOf(place), memo, out, lifted, mode);
  }
}

export function resolveAll(mode) {
  reindex();
  LAYOUT = new Map();
  const sink = [], lifted = [];
  resolveSpace("root", { cx: VW / 2, cy: VH / 2, w: VW, h: VH, scale: 1, alpha: 1, vis: 1, depth: 0 },
               new Map(), sink, lifted, mode);
  frameItems = sink.concat(lifted);
  PLACE = new Map(frameItems.map(p => [p.id, p]));
  for (let i = frameItems.length - 1; i >= 0; i--) {
    const p = frameItems[i];
    if (p.b.implicit) p.vis = kidsOf(p.id).some(k => PLACE.get(k.id)?.vis > 0) ? p.vis : 0;
  }
  return frameItems;
}

/* ── 1軸の写しと逆写し ── */
function unprojectLocal(L, axis, screen, m = 1) {
  const local = (screen - (axis === "x" ? L.host.cx : L.host.cy)) / L.host.scale;
  const s = L.ctx.vp[axis] + (local - L.ctx.vp[axis]) / m;
  return LENS_XY[L.V[axis].lens].unproject(s, L.ctx.H[axis]);
}
const screenToAxis = (L, axis, screen, m = 1) => unprojectLocal(L, axis, screen, m) + L.ctx.focus[axis];
function focusFits(L, axis, f) {
  const lens = LENS_XY[L.V[axis].lens], H = L.H[axis];
  for (const k of L.kids) {
    const sz = L.sizeOf(k), half = (axis === "x" ? sz.w : sz.h) / 2;
    const p = projectIn(L.arr[axis], k, lens, H, f, half * 2);
    if (Math.abs(p.s) + half * p.k > H + 1e-6) return false;
  }
  return true;
}
function fitFocus(L, axis, v, cur = L.focus[axis]) {
  const ps = [...L.arr[axis].pos.values()];
  if (L.V[axis].dim === "none") return 0;
  if (axis === "z") return clamp(v, Math.min(0, ...ps) - 1, Math.max(0, ...ps));
  if (L.V[axis].arrange === "as-is" || !ps.length) return v;
  v = clamp(v, Math.min(...ps), Math.max(...ps));
  if (!focusFits(L, axis, v)) {
    const from = focusFits(L, axis, cur) ? cur : 0;
    let lo = 0, hi = 1;
    for (let n = 0; n < 40; n++) { const t = (lo + hi) / 2; if (focusFits(L, axis, from + (v - from) * t)) lo = t; else hi = t; }
    v = from + (v - from) * lo;
  }
  return v;
}
function setFocusAxis(L, axis, v) { const f = spaceObj(L.id).focus; f[axis] = fitFocus(L, axis, v, f[axis]); }
function valueFromPos(L, axis, pos) {
  const A = L.V[axis];
  return A.arrange === "equal" ? (pos + L.arr[axis].mid) / A.step : pos;
}

/* ============================================================
   §3 操作
   ============================================================ */
const onRing = (p, mx, my) => mx >= p.x - RING && mx <= p.x + p.w + RING && my >= p.y - RING && my <= p.y + p.h + RING
  && !(mx >= p.x && mx <= p.x + p.w && my >= p.y && my <= p.y + p.h);
export function hitTest(mx, my, skip) {
  for (let i = frameItems.length - 1; i >= 0; i--) {
    const p = frameItems[i];
    if (!(p.vis > 0) || (skip && skip.has(p.id))) continue;
    if (p.b.implicit) { if (onRing(p, mx, my)) return p; continue; }
    if (mx >= p.x && mx <= p.x + p.w && my >= p.y && my <= p.y + p.h) return p;
  }
  return null;
}
const inContent = (p, my) => !p.b.implicit && isHost(p.b) && my >= p.y + headOf(p.b) * p.scale;
function spaceAt(mx, my, skip) {
  const p = hitTest(mx, my, skip);
  return !p ? "root" : inContent(p, my) ? p.id : p.space;
}
const onHandle = (p, mx, my) => p && mx >= p.x + p.w - 12 && mx <= p.x + p.w + 3 && my >= p.y + p.h - 12 && my <= p.y + p.h + 3;
function handleAt(mx, my) {
  for (let i = frameItems.length - 1; i >= 0; i--) {
    const p = frameItems[i];
    if (!(p.vis > 0) || p.b.implicit) continue;
    if (p.id === selectedId && onHandle(p, mx, my)) return p;
    if (mx >= p.x && mx <= p.x + p.w && my >= p.y && my <= p.y + p.h) return null;
  }
  return null;
}
const center = (p, axis) => axis === "x" ? p.x + p.w / 2 : p.y + p.h / 2;

/** ★ 触った泡は最前面へ（Z 軸が書けるなら） */
function raise(b) {
  const space = b.parent ?? "root";
  const A = viewOf(space).z, verb = verbOf(A.dim);
  const sibs = kidsOf(space).filter(k => k !== b);
  if (verb === "reorder") {
    [b, ...sibs.sort((q, r) => q.order - r.order)].forEach((k, i) => { k.order = i; });
  } else if (verb === "coord") {
    const key = DIMS[A.dim].key, f = focusZ(space);
    const front = Math.min(b.free[key], ...sibs.map(k => k.free[key]));
    const to = Math.max(f, front - (A.step ?? 1) * 0.15);
    if (b.free[key] > to) b.free[key] = to;
  }
}

function moveBubble(mx, my) {
  drag.mx = mx; drag.my = my;
  const p = PLACE.get(drag.id), b = p.b, L = LAYOUT.get(drag.space);
  for (const axis of ["x", "y"]) {
    const verb = drag.verbs[axis];
    const want = axis === "x" ? mx - (drag.fx - 0.5) * p.w : my - (drag.fy - 0.5) * p.h;
    if (verb === "coord") {
      b.free[DIMS[L.V[axis].dim].key] = valueFromPos(L, axis, screenToAxis(L, axis, want, p.m));
    } else if (verb === "focus") {
      setFocusAxis(L, axis, L.focus[axis] + (p.pos[axis] - L.ctx.focus[axis]) - unprojectLocal(L, axis, want, p.m));
    }
  }
  // v4 と同じ：泡が動くドラッグでは、書いたばかりの座標で配置を解き直す（v4 はこのあと slotAt で印を見る）
  if (drag.moves) resolveAll("keep");
}

/** 状態から配置を解き直す（補間は進めない） */
function probe() {
  const saved = new Map([...anim].map(([k, v]) => [k, { ...v }]));
  resolveAll("snap");
  anim.clear();
  for (const [k, v] of saved) anim.set(k, v);
}

/** ⑤ pin：id の泡の左上を、画面上の bf の所へ書き戻す */
let PIN_ON = true;
export const setPin = on => { PIN_ON = !!on; };
function pin(id, bf) {
  if (!PIN_ON || !bf || !byId(id)) return;
  for (let n = 0; n < 6; n++) {
    probe();
    const q = PLACE.get(id);
    if (!q) return;
    let wrote = false;
    for (const axis of ["x", "y"]) {
      const d = (axis === "x" ? bf.x - q.x : bf.y - q.y);
      if (Math.abs(d) < 0.01) continue;
      let A = null;
      for (let cur = id; cur !== "root"; cur = parentOf(cur))
        if (verbOf(viewOf(parentOf(cur))[axis].dim) === "coord") { A = byId(cur); break; }
      if (!A) continue;
      const pa = PLACE.get(A.id), L = LAYOUT.get(parentOf(A.id)), key = DIMS[L.V[axis].dim].key, c = center(pa, axis);
      A.free[key] += valueFromPos(L, axis, screenToAxis(L, axis, c + d, pa.m)) - valueFromPos(L, axis, screenToAxis(L, axis, c, pa.m));
      wrote = true;
    }
    if (!wrote) return;
  }
  probe();
}

/* ── 入力（全案で共有。泡そのものには当てない。当たり判定は placements から） ── */
export function installInput(el) {
  const pt = e => { const r = el.getBoundingClientRect(); return { mx: e.clientX - r.left, my: e.clientY - r.top }; };

  el.addEventListener("pointerdown", e => {
    const { mx, my } = pt(e);
    const sel = handleAt(mx, my);
    if (sel) {
      drag = { kind: "resize", id: sel.id, space: sel.space, started: true, mx0: mx, my0: my,
               size0: { ...measure(sel.b, new Map()) }, scale: sel.scale, x0: sel.x, y0: sel.y };
      return;
    }
    const p = hitTest(mx, my);
    if (p && !inContent(p, my)) {
      selectedId = p.id;
      raise(p.b);
      const V = viewOf(p.space), verbs = { x: verbOf(V.x.dim), y: verbOf(V.y.dim) };
      const vs = [verbs.x, verbs.y];
      drag = { kind: "bubble", id: p.id, space: p.space, verbs,
               moves: vs.some(v => v === "coord" || v === "reorder" || v === "cell"),
               lift: vs.some(v => v === "reorder" || v === "cell"),
               snapSpace: vs.includes("focus") ? p.space : null,
               started: false, mx0: mx, my0: my, mx, my,
               fx: (mx - p.x) / p.w, fy: (my - p.y) / p.h, scale0: p.scale, skip: subtreeOf(p.id) };
    } else {
      const space = p ? p.id : "root", L = LAYOUT.get(space);
      drag = { kind: "focus", space, snapSpace: space, started: false, mx0: mx, my0: my,
               f0: { ...L.focus }, u0: { x: unprojectLocal(L, "x", mx), y: unprojectLocal(L, "y", my) } };
    }
  });

  const onMove = e => {
    if (!drag) return;
    const { mx, my } = pt(e);
    if (!drag.started && Math.hypot(mx - drag.mx0, my - drag.my0) < 3) return;
    drag.started = true;
    if (drag.kind === "resize") {
      const b = byId(drag.id);
      b.size.w = Math.max(40, drag.size0.w + (mx - drag.mx0) / drag.scale);
      b.size.h = Math.max(HEADER + 10, drag.size0.h + (my - drag.my0) / drag.scale);
      pin(b.id, { x: drag.x0, y: drag.y0 });          // ⑤
      drag.snapSpace = drag.space;
    } else if (drag.kind === "focus") {
      const L = LAYOUT.get(drag.space);
      for (const axis of ["x", "y"]) {
        if (L.V[axis].dim === "none") continue;
        setFocusAxis(L, axis, drag.f0[axis] + drag.u0[axis] - unprojectLocal(L, axis, axis === "x" ? mx : my));
      }
    } else {
      moveBubble(mx, my);
    }
  };
  const onUp = () => { drag = null; };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);

  el.addEventListener("wheel", e => {
    e.preventDefault();
    const { mx, my } = pt(e), space = windowOf(spaceAt(mx, my)), L = LAYOUT.get(space);
    if (!L || L.V.z.dim === "none") return;
    setFocusAxis(L, "z", spaceObj(space).focus.z + e.deltaY * 0.004);
  }, { passive: false });
}

/* ── 検証の口（v4 の window.__lab と同じ形。ベンチはこれだけを見る） ── */
export function labApi(el) {
  const offset = () => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top }; };
  const outPlace = p => { const o = offset();
    return { id: p.id, x: p.x + o.x, y: p.y + o.y, w: p.w, h: p.h, scale: p.scale, local: p.local,
             depth: p.depth, space: p.space, alpha: p.alpha, implicit: p.b.implicit }; };
  return {
    select(id) { selectedId = id; },
    selectedId: () => selectedId,
    bubbles: () => JSON.parse(JSON.stringify(bubbles)),
    placements: () => frameItems.map(outPlace),
    rectOf(id) { const p = PLACE.get(id); if (!p) return null; const o = outPlace(p); return { x: o.x, y: o.y, w: o.w, h: o.h }; },
    headerPointOf(id) {
      const p = PLACE.get(id); if (!p) return null;
      const o = offset(), y = p.box.h <= 34 ? p.y + p.h / 2 : p.y + Math.min(12 * p.scale, p.h / 2);
      for (const t of [0.35, 0.5, 0.2, 0.65, 0.8, 0.1, 0.9]) {
        const x = p.x + p.w * t, hit = hitTest(x, y);
        if (hit && hit.id === id && !inContent(hit, y)) return { x: x + o.x, y: y + o.y };
      }
      return { x: p.x + p.w * 0.35 + o.x, y: y + o.y };
    },
    focusOf: id => ({ ...spaceObj(id).focus }),
    viewOf: id => { const v = viewOf(id); return JSON.parse(JSON.stringify({ x: v.x, y: v.y, z: v.z, focus: v.focus, own: v.own })); },
    hitAt(x, y) { const o = offset(); const p = hitTest(x - o.x, y - o.y); return p ? p.id : null; },
    setPin,
  };
}
