/**
 * 離したらどこへ入るか ── 落とし込み先（slot）と、③ くっつける・並びに加わる。
 *
 * 元：lab.html 1208-1219 行（slotAt）、1225-1246 行（snapAt）、1255-1301 行（spaceSlotAt）、
 *     896-905 行（spaceSummary）、1115 行（center）
 *
 * 先に土台の決まりで離す先の空間を決め、その窓の中でだけ縁（くっつける）を見る。
 * ③ くっつけるは空間への落とし込みの1つ ── 相手の窓が離す先の窓と同じときだけ効く。
 *
 * ★ 当たり判定（カーソルの下に何があるか）は ui の仕事。ここへは答え（hitSpace）を渡す。
 *   v5-dom は DOM の elementsFromPoint で拾っている（lab.html 1063-1083 行）。
 *
 * ★ 縁も印も「いま画面に見えている矩形」で測る ── ラボの frameItems は補間を通した矩形なので、
 *   ここでは q.screen（ui が見せている矩形）を使う。resolveWorld の Placement は補間前の目標なので、
 *   見えるか（vis）・どの空間か（space）・箱の素の大きさ（box）だけをそちらから読む。
 */
import type { BubbleId, Cell, Point, Rect, SpaceId, PlaneAxis } from './types.js';
import { METRICS, ROOT_SPACE } from './types.js';
import type { Bubble } from './bubble.js';
import type { BubbleWorld } from './world.js';
import type { Layout } from './resolve.js';
import { contentRect } from './resolve.js';
import type { ScreenRects } from './act.js';
import type { LayoutRules } from './rules.js';
import { readDimension, verbOf, writeKeyOf } from './dimension.js';
import { viewOfSpace } from './view.js';
import { cellFromBands } from './arrange.js';
import { axisToScreen, screenToAxis } from './project.js';

/** 掴んでいる泡についての、ui からの申し送り */
export interface Grabbed {
  readonly id: BubbleId;
  /** 掴んだときにいた空間 */
  readonly space: SpaceId;
  /** いま画面で見えている矩形（持ち上げ込み） */
  readonly rect: Rect;
  /** この泡とその中身（落とし先の候補から外す）。world.subtreeOf(id) */
  readonly skip: ReadonlySet<BubbleId>;
}

export interface DropQuery {
  readonly layout: Layout;
  /** ui がいま見せている矩形。縁（くっつける）はこれで測る */
  readonly screen: ScreenRects;
  readonly pointer: Point;
  /** カーソルの下の空間（当たり判定の答え）。lab.html 1105-1108 行 spaceAt に当たる */
  readonly hitSpace: SpaceId;
  readonly grabbed: Grabbed;
}

/** ③ くっつける／並びに加わる の相手。lab.html 1225-1246 行 snapAt の答え */
export interface SnapTarget {
  /** 'born' ＝ 相手の席に見えない親が生まれる、'join' ＝ すでにある並びに加わる */
  readonly kind: 'born' | 'join';
  readonly target: BubbleId;
  readonly axis: PlaneAxis;
  /** 相手の後ろ側の縁か */
  readonly after: boolean;
  /** 縁どうしの距離（画面 px） */
  readonly dist: number;
}

/** 順序の差し込み位置。lab.html 1285 行 */
export interface OrderSlot {
  readonly idx: number;
  /** 差し込む前の、画面の並び順（掴んだ泡は入っていない） */
  readonly list: readonly BubbleId[];
}

/** 離したら書く値。位置（自由座標）は書かない ── ⑤ pin が「離した所に見えていた場所」へ書き戻す */
export interface DropSlot {
  readonly space: SpaceId;
  /** 今いる空間の外へ引き出したか */
  readonly out: boolean;
  readonly order: OrderSlot | null;
  readonly cell: Partial<Cell>;
  readonly snap: SnapTarget | null;
  /** マス移動の先客（同じマスに2つ入れないため）。lab.html 1299 行 */
  readonly occupants: readonly BubbleId[];
}

/** 「いま離したらどうなるか」の印。画面座標。描くのは ui（lab.html 1286-1293 行） */
export interface DropMarks {
  readonly line: { readonly axis: PlaneAxis; readonly at: number; readonly from: number; readonly to: number } | null;
  readonly rect: Rect | null;
}

export interface DropTarget {
  readonly slot: DropSlot;
  readonly marks: DropMarks;
}

/** 組み立て中のマス（Partial<Cell> は読み取り専用なので、書ける形を1つ用意する） */
type CellDraft = { -readonly [K in keyof Cell]?: Cell[K] };

/** lab.html 1115 行 center。画面の矩形の中点 */
const center = (r: Rect, axis: PlaneAxis): number => (axis === 'x' ? r.x + r.w / 2 : r.y + r.h / 2);
const lo = (r: Rect, a: PlaneAxis): number => (a === 'x' ? r.x : r.y);
const len = (r: Rect, a: PlaneAxis): number => (a === 'x' ? r.w : r.h);
const hi = (r: Rect, a: PlaneAxis): number => lo(r, a) + len(r, a);

/** 画面に見えている矩形。無ければ配置（補間前の目標）で代える */
const rectOf = (q: DropQuery, id: BubbleId): Rect | undefined => q.screen.get(id) ?? q.layout.byId.get(id);

/** lab.html 1208-1219 行 slotAt。土台の落とし先を決めてから、その窓の中で縁を見る */
export function dropTargetAt(world: BubbleWorld, q: DropQuery, rules: LayoutRules): DropTarget | null {
  const base = spaceSlotAt(world, q, rules);
  if (!base) return null;
  const sn = snapCandidateAt(world, q, base.slot);
  if (!sn) return base;
  const T = rectOf(q, sn.target);
  const tb = world.bubble(sn.target);
  if (!T || !tb) return base;
  const axis = sn.axis;
  const at = sn.after ? hi(T, axis) : lo(T, axis);
  const from = axis === 'x' ? T.y : T.x;
  const to = axis === 'x' ? T.y + T.h : T.x + T.w;
  return {
    // out は土台の答えのまま（lab 1211 行で一度だけ決める）
    slot: { space: tb.space, out: base.slot.out, snap: sn, order: null, cell: {}, occupants: [] },
    marks: { line: { axis, at, from, to }, rect: null },
  };
}

/**
 * lab.html 1225-1246 行 snapAt。掴んだ泡の縁が、ほかの泡の縁に寄っているか（画面で測る）。
 * 相手は「自由に置く空間の泡」か「見えない親の中の泡」で、窓が離す先と同じもの。いちばん近い縁を返す。
 * 並びの中で並びの軸に沿って引いているあいだは、土台の並べ替え（順序の書き込み）に任せる。
 */
export function snapCandidateAt(world: BubbleWorld, q: DropQuery, slot: DropSlot): SnapTarget | null {
  const D = q.grabbed.rect;
  const win = world.windowOf(slot.space);
  if (!D) return null;
  // 距離が同じなら先に見たほうが勝つ（dist < best.dist）。ラボは frameItems（描いた順）をそのまま回す
  let best: SnapTarget | null = null;
  for (const P of q.layout.order) {
    if (!(P.vis > 0) || P.b.state.implicit || q.grabbed.skip.has(P.id) || world.windowOf(P.space) !== win) continue;
    const V = viewOfSpace(world, P.space);
    const row = world.rowOf(P.id);
    if (!row && !(verbOf(V.x.dim) === 'coord' && verbOf(V.y.dim) === 'coord')) continue;
    const T = q.screen.get(P.id) ?? P;
    for (const axis of ['x', 'y'] as const) {
      const o: PlaneAxis = axis === 'x' ? 'y' : 'x';
      const overlap = Math.min(hi(D, o), hi(T, o)) - Math.max(lo(D, o), lo(T, o));
      if (overlap < METRICS.SNAP_OVERLAP * Math.min(len(D, o), len(T, o))) continue;
      // 並びに加わる（並びは2つ以上なので、親は増やさない）
      const join = !!row && verbOf(V[axis].dim) === 'reorder';
      if (join && P.space === q.grabbed.space && !slot.out) continue;
      for (const after of [false, true]) {
        const dist = Math.abs(after ? lo(D, axis) - hi(T, axis) : hi(D, axis) - lo(T, axis));
        if (dist <= METRICS.SNAP_EDGE && (!best || dist < best.dist)) {
          best = { kind: join ? 'join' : 'born', target: P.id, axis, after, dist };
        }
      }
    }
  }
  return best;
}

/** spaceSlotAt が見る兄弟：泡と、画面に見えている矩形 */
interface Sib {
  readonly id: BubbleId;
  readonly b: Bubble;
  readonly r: Rect;
}

/**
 * lab.html 1255-1301 行 spaceSlotAt（縁を見ない土台の落とし先）。
 *  - カーソルの下の空間（掴んだ泡とその中身は除く）
 *  - ただし今いる空間の外へ出るのは、中身の箱から PULL 以上離れたときだけ
 *  - その空間の View に従って、書く値（順序の差し込み位置・マス・自由座標）を決める
 */
export function spaceSlotAt(world: BubbleWorld, q: DropQuery, rules: LayoutRules): DropTarget | null {
  void rules;                                   // 土台の落とし先は規則の未決の所を使わない（口だけ合わせてある）
  const home = q.grabbed.space;
  const { x: mx, y: my } = q.pointer;
  let space = q.hitSpace;
  if (space !== home && home !== ROOT_SPACE && !world.isAncestor(home, space)) {
    const hl = q.layout.spaces.get(home);
    if (hl) {
      const c = contentRect(hl.host);
      if (mx > c.x - METRICS.PULL && mx < c.x + c.w + METRICS.PULL &&
          my > c.y - METRICS.PULL && my < c.y + c.h + METRICS.PULL) space = home;
    }
  }
  const L = q.layout.spaces.get(space);
  if (!L) return null;
  const p = q.layout.byId.get(q.grabbed.id);
  const gb = world.bubble(q.grabbed.id);

  const sibs: Sib[] = [];
  for (const k of world.kidsOf(space)) {
    if (q.grabbed.skip.has(k.id)) continue;
    const pl = q.layout.byId.get(k.id);
    if (!pl) continue;                          // lab 1270 行の .filter(Boolean)
    sibs.push({ id: k.id, b: k, r: q.screen.get(k.id) ?? pl });
  }
  const box = contentRect(L.host);

  let order: OrderSlot | null = null;
  let line: DropMarks['line'] = null;
  const cell: CellDraft = {};                   // キーの並び順は軸の順（freeCellNear の探し順に効く）
  const cellRange: { x?: readonly [number, number]; y?: readonly [number, number] } = {};

  for (const axis of ['x', 'y'] as const) {
    const A = L.view[axis];
    const verb = verbOf(A.dim);
    const cur = axis === 'x' ? mx : my;
    if (verb === 'reorder') {
      const sorted = sibs.slice().sort((a, c) => center(a.r, axis) - center(c.r, axis));
      const idx = sorted.filter((s) => center(s.r, axis) < cur).length;
      const near = (s: Sib) => lo(s.r, axis);
      const far = (s: Sib) => hi(s.r, axis);
      const half = ((A.gap ?? METRICS.GAP) / 2) * L.host.scale;
      const at = !sorted.length ? (axis === 'x' ? L.host.cx : L.host.cy)
        : idx === 0 ? near(sorted[0]) - half
        : idx === sorted.length ? far(sorted[idx - 1]) + half
        : (far(sorted[idx - 1]) + near(sorted[idx])) / 2;
      order = { idx, list: sorted.map((s) => s.id) };
      line = {
        axis, at,
        from: axis === 'x' ? box.y + 4 : box.x + 4,
        to: axis === 'x' ? box.y + box.h - 4 : box.x + box.w - 4,
      };
    } else if (verb === 'cell') {
      if (!p) continue;
      const pos = screenToAxis(L, axis, cur);
      const bd = cellFromBands(L.arr[axis].bands, pos, axis === 'x' ? p.box.w : p.box.h, A.gap ?? METRICS.GAP);
      const key = writeKeyOf(A.dim);
      if (key === 'col' || key === 'row') cell[key] = bd.value;
      cellRange[axis] = [axisToScreen(L, axis, bd.start), axisToScreen(L, axis, bd.end)];
    }
    // 自由の軸は書かない：⑤ pin が「離した所に見えていた場所」へ書き戻す（位置を書く所を増やさない）
  }

  let rect: Rect | null = null;
  let occupants: readonly BubbleId[] = [];
  if (gb && (cellRange.x || cellRange.y)) {
    const [x0, x1] = cellRange.x ?? [box.x, box.x + box.w];
    const [y0, y1] = cellRange.y ?? [box.y, box.y + box.h];
    rect = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    // 先客：移った先で、X・Y どちらの次元で読んでも同じ値になる兄弟（＝同じ位置に置かれて重なる泡）
    const probe = gb.withCell(cell);
    const same = (k: Bubble) =>
      (['x', 'y'] as const).every(
        (ax) => readDimension(L.view[ax].dim, k, space, world) === readDimension(L.view[ax].dim, probe, space, world),
      );
    const keys = Object.keys(cell) as (keyof Cell)[];
    const stay = space === home && keys.every((key) => cell[key] === gb.state.cell[key]);
    occupants = stay ? [] : sibs.filter((s) => same(s.b)).map((s) => s.id);   // 元のマスのままなら誰も動かない
  }

  return {
    slot: { space, out: space !== home, order, cell, snap: null, occupants },
    marks: { line, rect },
  };
}

/**
 * その空間の泡を掴んだら何が起きるかの要約（一覧・印・ヒントに使う）。lab.html 896-905 行 spaceSummary。
 * ★ 設計の置いた形（x/y/z の3つ）ではなくラボの答えの形に戻した：ラボは軸ごとではなく
 *   「X・Y の動詞のうち強いもの1つ」を返す（動かせる ＞ 並べ替えられる ＞ マスを移れる ＞ 視点 ＞ 動かせない）。
 */
export function spaceSummary(world: BubbleWorld, spaceId: SpaceId): {
  readonly text: string;
  readonly short: string;
  readonly cls: 'move' | 'fix';
} {
  const V = viewOfSpace(world, spaceId);
  const vs = [verbOf(V.x.dim), verbOf(V.y.dim)];
  if (vs.includes('coord')) return { text: '動かせる', short: '動く', cls: 'move' };
  if (vs.includes('reorder')) return { text: '並べ替えられる', short: '並べ替え', cls: 'move' };
  if (vs.includes('cell')) return { text: 'マスを移れる', short: 'マス移動', cls: 'move' };
  if (vs.includes('focus')) return { text: '動かせない（視点が動く）', short: '視点が動く', cls: 'fix' };
  return { text: '動かせない', short: '動かない', cls: 'fix' };
}
