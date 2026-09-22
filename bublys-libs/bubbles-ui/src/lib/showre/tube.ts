/**
 * 管（ネオン）の形。
 *
 * 岸の光は「海の縁の管」と「岸に着いたバブルの管」が**つながった 1 本の網**である。
 * 網だから、要素ごとにバラバラに描くと必ず接ぎ目が出る。ここでは形だけを求め、
 * 描くのは 1 枚のレイヤー（ShowreTubes）がまとめてやる。
 *
 * 規則:
 *   1. 管は**中心線**で表す。太さは描くときに与える（線を太らせれば帯になる）
 *   2. **接している辺には管を引かない。** そこは相手の管がそのまま続く
 *   3. 接している辺と直交する走りは、**相手の管まで伸ばす**。伸ばし方は 2 つ:
 *      - `"edge"`  … 矩形の縁まで（帯。相手の帯と隙間なく重なる）
 *      - `"center"`… 相手の中心線まで（芯。T 字で出会って 1 本に見える）
 */

import type { ShowreSide, ScreenRect } from "./Showre.domain.js";

/** 管の太さ（px） */
export const TUBE_THICKNESS = 12;

/** 角の丸み（px）。海を切り抜くフレームと必ず合わせる */
export const TUBE_RADIUS = 20;

/** 管の色。奥行き（手前か奥か）を表す光なので、色は一色で変えない */
export const TUBE_COLOR = "#1a5bff";

/** 芯（白い線）の太さ（px） */
export const TUBE_CORE_WIDTH = 3;

/** 近い滲みのぼかし半径（px） */
export const TUBE_GLOW_NEAR = 12;
/** 遠い滲みのぼかし半径（px） */
export const TUBE_GLOW_FAR = 34;

/** 管が囲む 1 つの矩形 */
export type TubeOutline = {
  readonly rect: ScreenRect;
  /** 他の管と接している辺。そこには引かない */
  readonly joined?: readonly ShowreSide[];
};

export type TubePathOptions = {
  thickness?: number;
  radius?: number;
  /** 接している辺で、直交する走りをどこまで伸ばすか */
  joinAt?: "edge" | "center";
};

const CLOCKWISE: readonly ShowreSide[] = ["top", "right", "bottom", "left"];

type Point = { x: number; y: number };

/**
 * 管の中心線をなぞる SVG path。接している辺は引かず、1 本につながるよう端を伸ばす。
 * 引く辺が途切れていれば、そのぶん subpath（`M`）が分かれる。
 */
export const tubePath = (outline: TubeOutline, options: TubePathOptions = {}): string => {
  const { thickness = TUBE_THICKNESS, radius = TUBE_RADIUS, joinAt = "edge" } = options;
  const { rect, joined = [] } = outline;
  const half = thickness / 2;
  /** 角の丸み（中心線の上での半径） */
  const corner = Math.max(0, radius - half);
  /** 接している辺での伸ばし量（縁からどれだけ内側で止めるか） */
  const stop = joinAt === "center" ? half : 0;

  const L = rect.x;
  const T = rect.y;
  const R = rect.x + rect.width;
  const B = rect.y + rect.height;
  const drawn = (side: ShowreSide) => !joined.includes(side);

  // 各辺の走り（時計回り）。隣の辺も引くなら角の丸みのぶん手前で止め、
  // 隣が接している辺なら相手の管まで伸ばす
  /** 走りの始点。隣も引くなら角の丸みのぶん手前、隣が接しているなら相手の管まで */
  const startOf = (before: ShowreSide, lo: number): number =>
    drawn(before) ? lo + corner : lo - half + stop;
  /** 走りの終点。同上 */
  const endOf = (after: ShowreSide, hi: number): number =>
    drawn(after) ? hi - corner : hi + half - stop;

  const run = (side: ShowreSide): { from: Point; to: Point } => {
    switch (side) {
      case "top":
        return {
          from: { x: startOf("left", L + half), y: T + half },
          to: { x: endOf("right", R - half), y: T + half },
        };
      case "right":
        return {
          from: { x: R - half, y: startOf("top", T + half) },
          to: { x: R - half, y: endOf("bottom", B - half) },
        };
      case "bottom":
        return {
          from: { x: endOf("right", R - half), y: B - half },
          to: { x: startOf("left", L + half), y: B - half },
        };
      case "left":
        return {
          from: { x: L + half, y: endOf("bottom", B - half) },
          to: { x: L + half, y: startOf("top", T + half) },
        };
    }
  };

  const sides = CLOCKWISE.filter(drawn);
  if (sides.length === 0) return "";

  // 引く辺が全部そろっていれば閉じた輪。そうでなければ、接している辺で切れた
  // ひと続きごとに subpath を作る
  const closed = sides.length === CLOCKWISE.length;
  const groups = closed ? [CLOCKWISE] : contiguousGroups(CLOCKWISE, drawn);

  const arc = (to: Point) => `A ${corner} ${corner} 0 0 1 ${round(to.x)} ${round(to.y)}`;
  const parts: string[] = [];
  for (const group of groups) {
    const first = run(group[0]);
    let d = `M ${round(first.from.x)} ${round(first.from.y)} L ${round(first.to.x)} ${round(first.to.y)}`;
    for (const side of group.slice(1)) {
      const seg = run(side);
      d += ` ${corner > 0 ? arc(seg.from) : `L ${round(seg.from.x)} ${round(seg.from.y)}`}`;
      d += ` L ${round(seg.to.x)} ${round(seg.to.y)}`;
    }
    if (closed) {
      // 最後の角を回って閉じる
      d += ` ${corner > 0 ? arc(first.from) : "L " + round(first.from.x) + " " + round(first.from.y)} Z`;
    }
    parts.push(d);
  }
  return parts.join(" ");
};

/** 円環の上で、続けて引く辺のかたまりに分ける */
const contiguousGroups = (
  order: readonly ShowreSide[],
  drawn: (side: ShowreSide) => boolean,
): ShowreSide[][] => {
  const n = order.length;
  const start = order.findIndex((side, i) => drawn(side) && !drawn(order[(i - 1 + n) % n]));
  if (start < 0) return [];
  const groups: ShowreSide[][] = [];
  let current: ShowreSide[] = [];
  for (let k = 0; k < n; k++) {
    const side = order[(start + k) % n];
    if (drawn(side)) current.push(side);
    else if (current.length > 0) {
      groups.push(current);
      current = [];
    }
  }
  if (current.length > 0) groups.push(current);
  return groups;
};

const round = (v: number): number => Math.round(v * 100) / 100;
