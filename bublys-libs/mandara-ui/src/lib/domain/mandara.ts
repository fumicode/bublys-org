/**
 * **曼荼羅** ── 画面を中央と 8 つの向きに分ける。
 *
 * > **中央にいるのが、いま見ている泡。まわりの 8 つは、そこから行ける先。**
 * > **線は、その向きに泡がいるときだけ出る。居ない向きの帯は、中央が吸収する。**
 *
 * ここは純粋な計算だけ。React も世界（`BubbleWorld`）も知らない。
 * 「どの泡がどの向きか」を決めるのは呼ぶ側で、ここは**向きの集合 → 区画**だけを返す。
 */

/** 8 つの向き。四正（上下左右）と四隅 */
export type Dir = 'NW' | 'N' | 'NE' | 'W' | 'E' | 'SW' | 'S' | 'SE';

export const DIRS: readonly Dir[] = ['NW', 'N', 'NE', 'W', 'E', 'SW', 'S', 'SE'];

/**
 * **テンキーの並びが、そのまま 8 つの向き。**
 *
 * ```
 *   7 8 9        NW N NE
 *   4 5 6   ＝    W  ・ E     5 は「中へ」、0 は「来た所へ戻る」
 *   1 2 3        SW S SE
 * ```
 */
export const PAD: Readonly<Record<string, Dir>> = {
  '7': 'NW', '8': 'N', '9': 'NE',
  '4': 'W', '6': 'E',
  '1': 'SW', '2': 'S', '3': 'SE',
};

/** 向き → テンキーの数字（道案内を描くのに使う） */
export const KEY: Readonly<Record<Dir, string>> = {
  NW: '7', N: '8', NE: '9',
  W: '4', E: '6',
  SW: '1', S: '2', SE: '3',
};

/** その向きが、どの辺の成分を持つか */
export interface Side {
  readonly w: boolean;
  readonly e: boolean;
  readonly n: boolean;
  readonly s: boolean;
}

export function sideOf(dir: Dir): Side {
  return {
    w: dir === 'NW' || dir === 'W' || dir === 'SW',
    e: dir === 'NE' || dir === 'E' || dir === 'SE',
    n: dir === 'NW' || dir === 'N' || dir === 'NE',
    s: dir === 'SW' || dir === 'S' || dir === 'SE',
  };
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** 区画の境目。`at` は画面の座標 */
export interface Line {
  readonly axis: 'v' | 'h';
  readonly at: number;
}

export interface Mandara {
  /** いま見ている泡が座る所 */
  readonly center: Rect;
  /** その向きの区画。**誰も居ない向きは null**（区画そのものが無い） */
  readonly region: (dir: Dir) => Rect | null;
  /** 引くべき線。居ない向きの境目は引かない */
  readonly lines: readonly Line[];
}

/**
 * 端から線までの帯の幅（画面の短いほうに対する割合ではなく、各辺それぞれに対する割合）。
 * 中央はその残りなので、四方が埋まっていれば 1 − 2×(1/6) ＝ 2/3 になる。
 */
export const EDGE = 1 / 6;

/**
 * 向きの集合から、区画と線を出す。
 *
 * ★ **居ない向きの帯は、中央が吸収する。** 東にしか泡が居なければ縦線は 1 本だけで、
 *   中央は左端から線までを丸ごと使う（泡が 1 つなら線は 0 本＝画面ぜんぶが中央）。
 * ★ 同じ向きに泡が 2 つ以上いても、区画は 1 つ。**2 つとも同じ区画に入る。**
 *
 * @param viewport 画面の大きさ
 * @param occupied いま泡が居る向き
 * @param edge     端の帯の割合（既定 1/6）
 */
export function mandaraOf(
  viewport: { readonly w: number; readonly h: number },
  occupied: Iterable<Dir>,
  edge: number = EDGE,
): Mandara {
  const side: Side = { w: false, e: false, n: false, s: false };
  const live = new Set<Dir>();
  for (const d of occupied) {
    live.add(d);
    const s = sideOf(d);
    if (s.w) (side as { w: boolean }).w = true;
    if (s.e) (side as { e: boolean }).e = true;
    if (s.n) (side as { n: boolean }).n = true;
    if (s.s) (side as { s: boolean }).s = true;
  }

  const bw = viewport.w * edge;
  const bh = viewport.h * edge;
  /** 中央の領域の縁 */
  const L = side.w ? bw : 0;
  const R = side.e ? viewport.w - bw : viewport.w;
  const T = side.n ? bh : 0;
  const B = side.s ? viewport.h - bh : viewport.h;

  const lines: Line[] = [];
  if (side.w) lines.push({ axis: 'v', at: L });
  if (side.e) lines.push({ axis: 'v', at: R });
  if (side.n) lines.push({ axis: 'h', at: T });
  if (side.s) lines.push({ axis: 'h', at: B });

  const rect = (x0: number, x1: number, y0: number, y1: number): Rect => ({
    x: x0, y: y0, w: x1 - x0, h: y1 - y0,
  });

  return {
    center: rect(L, R, T, B),
    lines,
    region: (dir) => {
      if (!live.has(dir)) return null;
      const s = sideOf(dir);
      const x0 = s.w ? 0 : s.e ? R : L;
      const x1 = s.w ? L : s.e ? viewport.w : R;
      const y0 = s.n ? 0 : s.s ? B : T;
      const y1 = s.n ? T : s.s ? viewport.h : B;
      return rect(x0, x1, y0, y1);
    },
  };
}
