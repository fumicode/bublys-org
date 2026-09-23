/**
 * 岸（Showre = shore + show）。
 *
 * ルール:
 *   1. バブルを掴んで画面の縁に寄せて離すと、その辺に貼り付く。
 *      **大きさはそのまま、辺と直交する向きの位置は落とした場所のまま**
 *   2. 角の近くなら 2 辺に貼る
 *   3. 海をスクロールしても、貼り付いたバブルは画面から動かない（位置は画面の座標）
 *   4. **貼り付いたバブルどうしは重ならない。後から来た方が、落とした点の入る
 *      空き区間に収まるまで縮む**
 *   5. 並びも順序も無い。辺のどこに貼るかはユーザーが決める
 *   6. **大きさはバブル自身が持つ**。岸は「どの辺に、どこで留まっているか」だけを覚える。
 *      だからリサイズすれば貼った辺は動かず、掴んだ側だけが動く
 */

import type { Point2, Size2 } from "@bublys-org/bubbles-ui-util";
import { TUBE_THICKNESS } from "./tube.js";

export type ShowreSide = "top" | "bottom" | "left" | "right";

export const SHOWRE_SIDES: readonly ShowreSide[] = ["top", "bottom", "left", "right"];

export const isShowreSide = (v: unknown): v is ShowreSide =>
  typeof v === "string" && (SHOWRE_SIDES as readonly string[]).includes(v);

/** 画面の矩形（左上と大きさ） */
export type ScreenRect = { x: number; y: number; width: number; height: number };

/**
 * 1 つのバブルの留め方。
 * `at` は画面（ビューポート）の左上からの位置。貼った辺の成分は辺に合わせて上書きされるので、
 * 覚えているのは「辺と直交する向きの位置」だけ、と思ってよい。
 *
 * ★ 大きさは持たない。岸に貼っても**バブルの大きさはバブル自身のもの**（ルール 6）。
 *   ここにも持つと、リサイズしたときに二重管理がずれる（貼った辺が動く・反対側が縮む）。
 */
export type DockState = {
  readonly edges: readonly ShowreSide[];
  readonly at: Point2;
};

/** 岸に貼り付いているバブル（id → 留め方）。辺ごとの並びではない */
export type DocksState = Record<string, DockState>;

export const emptyDocksState = (): DocksState => ({});

/** 貼り付けるか判定する、辺からの距離（px） */
export const SHOWRE_DOCK_THRESHOLD = 24;

/**
 * 貼り付いたバブルどうしの隙間（px）。**負 ＝ そのぶん重ねてよい。**
 *
 * 管は縁から**半分だけ内側**を走るので、縁どうしをただ接させると管が 2 本並んでしまう。
 * **管の太さぶん重ねる**と 2 本の中心線がちょうど重なり、1 本の線に見える。
 * 止まるのはそこ ── それ以上は食い込ませない。
 */
export const SHOWRE_DOCK_GAP = -TUBE_THICKNESS;

/**
 * 中身がひとかけら残る大きさ（px）＝ アイコン 1 つ。
 * 「どこまで小さくしてよいか」は中身が決めることなので、岸はこの 1 かけらしか見ない
 */
const SHOWRE_MIN_CONTENT = 24;

/**
 * 縮められる下限（px）。これより狭い空きには貼れない。
 *
 * 岸が守るのは「**取っ手が残るか**」だけ ── 向かい合う辺（＝取っ手。管と同じ太さ）2 本と、
 * 中身がひとかけら。中身が入らなければ中身の側で切れるので、岸が止める理由はない。
 */
export const SHOWRE_MIN_SIZE: Size2 = {
  width: TUBE_THICKNESS * 2 + SHOWRE_MIN_CONTENT,
  height: TUBE_THICKNESS * 2 + SHOWRE_MIN_CONTENT,
};

const overlaps1 = (aLo: number, aHi: number, bLo: number, bHi: number): boolean =>
  aLo < bHi && bLo < aHi;

/**
 * もう一方の向きで「本当に」重なっているか。
 * **管が 1 本になるぶんの重なり（-gap）は重なりと見ない** ── そこは隣と縁を共有している所で、
 * その向きで邪魔をしているわけではない。
 */
const crossOverlaps = (lo: number, len: number, oLo: number, oLen: number, gap: number): boolean =>
  overlaps1(lo - gap, lo + len + gap, oLo, oLo + oLen);

/** 2 つの矩形が重なるか（辺で接するだけは重なりではない） */
export const rectsOverlap = (a: ScreenRect, b: ScreenRect): boolean =>
  overlaps1(a.x, a.x + a.width, b.x, b.x + b.width) &&
  overlaps1(a.y, a.y + a.height, b.y, b.y + b.height);

/**
 * 点が画面のどの辺に近いか。近い辺をすべて返す（角なら 2 つ）。
 * 遠ければ空（＝貼らない、海に浮く）。
 */
export const edgesNear = (
  point: Point2,
  viewport: Size2,
  threshold: number = SHOWRE_DOCK_THRESHOLD,
): ShowreSide[] => {
  const edges: ShowreSide[] = [];
  if (point.y <= threshold) edges.push("top");
  else if (viewport.height - point.y <= threshold) edges.push("bottom");
  if (point.x <= threshold) edges.push("left");
  else if (viewport.width - point.x <= threshold) edges.push("right");
  return edges;
};

/**
 * 貼り付いたあとの矩形（重なりを見る前）。
 * 貼った辺の成分は辺に合わせ、もう一方は `at` のまま（落とした場所）。
 * 画面からははみ出させない。
 */
export const anchoredRect = (dock: DockState, size: Size2, viewport: Size2): ScreenRect => {
  const { edges, at } = dock;
  const width = Math.min(size.width, viewport.width);
  const height = Math.min(size.height, viewport.height);
  const x = edges.includes("left")
    ? 0
    : edges.includes("right")
      ? viewport.width - width
      : clamp(at.x, 0, Math.max(0, viewport.width - width));
  const y = edges.includes("top")
    ? 0
    : edges.includes("bottom")
      ? viewport.height - height
      : clamp(at.y, 0, Math.max(0, viewport.height - height));
  return { x, y, width, height };
};

const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);

/** 置き場所の留め方（CSS の left/right/top/bottom にそのまま渡せる形） */
export type SlotStyle = {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
};

/**
 * 貼り付いたバブルの置き場所を、**辺で**留める形にする。
 *
 * 大きさを書かないのが肝。貼った辺は `0` で留め（左なら `left: 0`、下なら `bottom: 0`）、
 * 箱の大きさはバブル自身が決めるので、貼ったままリサイズしても貼った辺は動かない。
 * 貼っていない向きだけ、落とした場所（`at`）に置く。
 */
export const slotStyle = (dock: DockState, viewport: Size2, size?: Size2): SlotStyle => {
  const rect = size ? anchoredRect(dock, size, viewport) : null;
  const horizontal: SlotStyle = dock.edges.includes("left")
    ? { left: 0 }
    : dock.edges.includes("right")
      ? { right: 0 }
      : { left: rect ? rect.x : clamp(dock.at.x, 0, viewport.width) };
  const vertical: SlotStyle = dock.edges.includes("top")
    ? { top: 0 }
    : dock.edges.includes("bottom")
      ? { bottom: 0 }
      : { top: rect ? rect.y : clamp(dock.at.y, 0, viewport.height) };
  return { ...horizontal, ...vertical };
};

/**
 * ルール 4。**後から来た方が縮む。**
 *
 * - **貼っていない向き**（左右の辺に貼ったときの縦）は、落とした場所をなるべく保ち、
 *   先客に挟まれた空き区間に収まるまで縮む
 * - **貼った向き**は辺に付いたまま、辺から先客までの空きに収まるまで縮む
 * - 先客の上に落とそうとしたときと、空きが下限より狭いときは `null`（そこには貼れない）
 *
 * @param others 先に貼り付いているバブルの矩形（画面座標）
 */
export const fitAmongDocked = (
  dock: DockState,
  /** 貼ろうとしているバブルの大きさ（これが空きに入らなければ縮む） */
  size: Size2,
  viewport: Size2,
  others: readonly ScreenRect[],
  /** 落とした点（ビューポート座標）。空き区間はこの点が入っている所を探す */
  pointer: Point2,
  min: Size2 = SHOWRE_MIN_SIZE,
  gap: number = SHOWRE_DOCK_GAP,
): ScreenRect | null => {
  const rect = anchoredRect(dock, size, viewport);
  const anchorOf = (lo: ShowreSide, hi: ShowreSide): Anchor =>
    dock.edges.includes(lo) ? "start" : dock.edges.includes(hi) ? "end" : null;
  const anchorY = anchorOf("top", "bottom");
  const anchorX = anchorOf("left", "right");

  // 貼っていない向きから先に収める（貼った向きの空きは、その結果で変わるので）
  const first: "x" | "y" = anchorY === null ? "y" : "x";
  const second = first === "y" ? "x" : "y";
  const anchors = { x: anchorX, y: anchorY } as const;
  const limits = { x: viewport.width, y: viewport.height } as const;
  const mins = { x: min.width, y: min.height } as const;
  const pointers = { x: pointer.x, y: pointer.y } as const;

  let out = rect;
  for (const axis of [first, second] as const) {
    const lo = axis === "x" ? out.x : out.y;
    const len = axis === "x" ? out.width : out.height;
    // その向きで重なりうるのは、もう一方の向きで重なっている先客だけ
    const cross = axis === "x" ? "y" : "x";
    const crossLo = cross === "x" ? out.x : out.y;
    const crossLen = cross === "x" ? out.width : out.height;
    const blockers = others
      .filter((o) => {
        const oLo = cross === "x" ? o.x : o.y;
        const oLen = cross === "x" ? o.width : o.height;
        return crossOverlaps(crossLo, crossLen, oLo, oLen, gap);
      })
      .map((o) => (axis === "x" ? ([o.x, o.x + o.width] as const) : ([o.y, o.y + o.height] as const)));
    const fitted = fitAxis(lo, len, anchors[axis], pointers[axis], limits[axis], blockers, mins[axis], gap);
    if (!fitted) return null;
    out = axis === "x"
      ? { ...out, x: fitted.lo, width: fitted.len }
      : { ...out, y: fitted.lo, height: fitted.len };
  }
  return out;
};

/**
 * 岸の上で**辺を掴んで伸ばした**ときの止まり所 ── 先客の縁で止める（接する所まで）。
 *
 * 規則4「貼り付いたバブルどうしは重ならない」は、貼るとき（{@link fitAmongDocked}）だけの
 * 話ではない。**貼ったあと伸ばすとき**も同じ。ただしここは縮めない ──
 * 掴んだ辺が先客にぶつかって止まるだけ。
 *
 * @param side 掴んだ辺。その辺だけが動き、向かいの辺は動かない
 */
export const clampResizeAmongDocked = (
  rect: ScreenRect,
  side: ShowreSide,
  others: readonly ScreenRect[],
  min: Size2 = SHOWRE_MIN_SIZE,
  gap: number = SHOWRE_DOCK_GAP,
): ScreenRect => {
  const horizontal = side === "left" || side === "right";
  // その向きでぶつかりうるのは、もう一方の向きで重なっている先客だけ
  const blockers = others.filter((o) =>
    horizontal
      ? crossOverlaps(rect.y, rect.height, o.y, o.height, gap)
      : crossOverlaps(rect.x, rect.width, o.x, o.width, gap),
  );
  const edges = (pick: (o: ScreenRect) => number, keep: (v: number) => boolean) =>
    blockers.map(pick).filter(keep);

  switch (side) {
    case "right": {
      const limit = Math.min(...edges((o) => o.x, (v) => v >= rect.x), Infinity) - gap;
      return { ...rect, width: Math.max(min.width, Math.min(rect.width, limit - rect.x)) };
    }
    case "left": {
      const right = rect.x + rect.width;
      const limit = Math.max(...edges((o) => o.x + o.width, (v) => v <= right), -Infinity) + gap;
      const x = Math.max(rect.x, limit);
      return { ...rect, x, width: Math.max(min.width, right - x) };
    }
    case "bottom": {
      const limit = Math.min(...edges((o) => o.y, (v) => v >= rect.y), Infinity) - gap;
      return { ...rect, height: Math.max(min.height, Math.min(rect.height, limit - rect.y)) };
    }
    case "top": {
      const bottom = rect.y + rect.height;
      const limit = Math.max(...edges((o) => o.y + o.height, (v) => v <= bottom), -Infinity) + gap;
      const y = Math.max(rect.y, limit);
      return { ...rect, y, height: Math.max(min.height, bottom - y) };
    }
  }
};

/**
 * 岸の上で**滑らせた**ときの止まり所 ── 先客にぶつかる所で止める（接する所まで）。
 *
 * @param axis 滑る向き（貼った辺と直交する向き）
 * @param from 掴んだときの位置。ここから**どちらへ動いたか**で、どちらの縁で止めるかが決まる
 */
export const clampMoveAmongDocked = (
  rect: ScreenRect,
  axis: "x" | "y",
  others: readonly ScreenRect[],
  viewport: Size2,
  from: number,
  gap: number = SHOWRE_DOCK_GAP,
): ScreenRect => {
  const horizontal = axis === "x";
  const lo = horizontal ? rect.x : rect.y;
  const len = horizontal ? rect.width : rect.height;
  const limit = horizontal ? viewport.width : viewport.height;
  const blockers = others.filter((o) =>
    horizontal
      ? crossOverlaps(rect.y, rect.height, o.y, o.height, gap)
      : crossOverlaps(rect.x, rect.width, o.x, o.width, gap),
  );
  const loOf = (o: ScreenRect) => (horizontal ? o.x : o.y);
  const hiOf = (o: ScreenRect) => (horizontal ? o.x + o.width : o.y + o.height);

  let next = lo;
  if (lo > from) {
    // 増える向きへ動いた ── 先手にいる先客の**手前**（管が 1 本になる所）で止まる
    const stop = Math.min(...blockers.map(loOf).filter((v) => v >= from + len + gap), Infinity) - gap;
    next = Math.min(lo, stop - len);
  } else if (lo < from) {
    const stop = Math.max(...blockers.map(hiOf).filter((v) => v <= from - gap), -Infinity) + gap;
    next = Math.max(lo, stop);
  }
  next = Math.min(Math.max(next, 0), Math.max(0, limit - len));
  return horizontal ? { ...rect, x: next } : { ...rect, y: next };
};

/** 貼った向き（辺に付いている側）。null は貼っていない向き */
type Anchor = "start" | "end" | null;

/**
 * 1 つの向きを空き区間に収める。
 * 貼った向きは辺に付いたまま縮み、貼っていない向きは落とした場所をなるべく保って縮む。
 */
const fitAxis = (
  lo: number,
  len: number,
  anchor: Anchor,
  pointer: number,
  limit: number,
  blocked: readonly (readonly [number, number])[],
  min: number,
  gap: number,
): { lo: number; len: number } | null => {
  // 「ここに居たい」点。貼った向きは辺、貼っていない向きは**落とした点**
  const probe = anchor === "start" ? 0 : anchor === "end" ? limit : pointer;
  const span = freeSpan(probe, limit, blocked, gap);
  if (!span) return null;
  const room = span.hi - span.lo;
  if (room < min) return null;
  const next = Math.min(len, room);
  const at =
    anchor === "start" ? span.lo
    : anchor === "end" ? span.hi - next
    : clamp(lo, span.lo, span.hi - next);
  return { lo: at, len: next };
};

/**
 * `probe` を含む、先客に塞がれていない区間。probe が先客の上（隙間の中も含む）なら null。
 */
const freeSpan = (
  probe: number,
  limit: number,
  blocked: readonly (readonly [number, number])[],
  gap: number,
): { lo: number; hi: number } | null => {
  let lo = 0;
  let hi = limit;
  for (const [bLo, bHi] of blocked) {
    if (probe > bLo - gap && probe < bHi + gap) return null;
    if (bHi + gap <= probe) lo = Math.max(lo, bHi + gap);
    else hi = Math.min(hi, bLo - gap);
  }
  return hi > lo ? { lo, hi } : null;
};

/**
 * 岸に貼り付いているバブルたちの、画面上の矩形。
 * 重なりの解決（ルール 4）は貼るときに済ませてあるので、ここは貼った値をそのまま写すだけ。
 */
export const dockedRects = (
  docks: DocksState,
  sizes: Record<string, Size2>,
  viewport: Size2,
): Record<string, ScreenRect> => {
  const out: Record<string, ScreenRect> = {};
  for (const [id, dock] of Object.entries(docks)) {
    const size = sizes[id];
    if (size) out[id] = anchoredRect(dock, size, viewport);
  }
  return out;
};

/** 縁に「着いている」とみなす許容（px）。これ以内なら接している */
export const SHOWRE_TOUCH_TOLERANCE = 2;

/** 縁に吸い寄せる距離（px）。これ以内なら、ぴたりと縁に合わせる */
export const SHOWRE_SNAP = 6;

/**
 * その矩形が**いま**海の縁に接している辺。
 *
 * ★ 留め方（{@link DockState.edges}）とは別物。留め方は「落としたときにどの辺へ
 *   寄せたか」＝位置の決まり方で、こちらは「いまどの辺に着いているか」＝見た目。
 *   下辺に留めたバブルを左端まで伸ばせば、左辺にも**着く**。
 *   管を引くかどうか（接ぎ目）は、こちらで決める。
 */
export const touchingEdges = (
  rect: ScreenRect,
  viewport: Size2,
  tolerance: number = SHOWRE_TOUCH_TOLERANCE,
): ShowreSide[] => {
  const edges: ShowreSide[] = [];
  if (rect.y <= tolerance) edges.push("top");
  if (rect.x + rect.width >= viewport.width - tolerance) edges.push("right");
  if (rect.y + rect.height >= viewport.height - tolerance) edges.push("bottom");
  if (rect.x <= tolerance) edges.push("left");
  return edges;
};

/**
 * 縁の近くまで来た辺を、縁にぴたりと合わせる。
 *
 * 数 px だけ空いた状態は「着いていないが、着いているように見える」いちばん悪い形
 * （管が 2 本並んで隙間が出る）。着くなら着く、離れるなら離れる、のどちらかにする。
 */
export const snapToViewport = (
  rect: ScreenRect,
  viewport: Size2,
  snap: number = SHOWRE_SNAP,
): ScreenRect => {
  let { x, y, width, height } = rect;
  if (x <= snap && x !== 0) {
    width += x;
    x = 0;
  }
  if (y <= snap && y !== 0) {
    height += y;
    y = 0;
  }
  const right = viewport.width - (x + width);
  if (right <= snap && right !== 0) width += right;
  const bottom = viewport.height - (y + height);
  if (bottom <= snap && bottom !== 0) height += bottom;
  return { x, y, width, height };
};

/** そのバブルが貼り付いている辺。貼っていなければ空 */
export const edgesOf = (docks: DocksState, bubbleId: string): readonly ShowreSide[] =>
  docks[bubbleId]?.edges ?? [];
