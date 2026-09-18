/**
 * ① レンズ ── 位置 → 画面。軸ごとに1つ。
 *
 * 元：lab.html 366-390 行（LENS_XY・LENS_Z）と 616-628 行（projectIn ＝ 泡の像）
 *
 * X/Y のレンズは1次元の単調な関数なので、逆関数が必ず書ける（unproject）。
 * Z のレンズには逆が無い（倍率と透明度だけ）。
 */
import { METRICS, clamp } from './types.js';
import type { Axis } from './types.js';

export type LensXyId = 'parallel' | 'fisheye';
export type LensZId = 'perspective' | 'flat';
export type LensId = LensXyId | LensZId;

/** レンズを通した1点：画面の位置 s と、そこでの局所倍率 k */
export interface Projected {
  readonly s: number;
  readonly k: number;
}

export interface LensXy {
  readonly id: LensXyId;
  readonly label: string;
  /** u ＝ 位置 − 焦点、H ＝ 空間の半幅 */
  project(u: number, H: number): Projected;
  /** 画面 s → u。魚眼は tanh が 1 に張り付く手前で止める（lab.html 379 行 TANH_EDGE） */
  unproject(s: number, H: number): number;
}

export interface LensZ {
  readonly id: LensZId;
  readonly label: string;
  /** dz ＝ 位置 − 焦点 → 倍率 m。透視は 1/(1 + 0.26·dz) */
  mag(dz: number): number;
  /** 透視は焦点より手前（dz<0）を消す。薄れて見えるのは補間だけ（lab.html 387 行） */
  alpha(dz: number): number;
}

/** 魚眼の tanh が浮動小数で 1 に張り付く手前（|u| ≲ 14H まで往復が合う）。lab.html 379 行 */
const TANH_EDGE = 1 - 1e-12;

/** X/Y のレンズ。lab.html 380-385 行 LENS_XY */
export const LENS_XY: Readonly<Record<LensXyId, LensXy>> = {
  parallel: {
    id: 'parallel',
    label: '平行',
    project: (u) => ({ s: u, k: 1 }),
    unproject: (s) => s,
  },
  fisheye: {
    id: 'fisheye',
    label: '魚眼',
    project: (u, H) => {
      const t = u / H;
      const c = Math.cosh(t);
      return { s: H * Math.tanh(t), k: 1 / (c * c) };
    },
    unproject: (s, H) => H * Math.atanh(clamp(s / H, -TANH_EDGE, TANH_EDGE)),
  },
};

/** Z のレンズ。lab.html 386-390 行 LENS_Z */
export const LENS_Z: Readonly<Record<LensZId, LensZ>> = {
  perspective: {
    id: 'perspective',
    label: '透視',
    // d → 0 は目の位置（dz = −1/0.26）。そこより手前は写らないので、式が発散しないように止めるだけ
    mag: (dz) => 1 / Math.max(0.05, 1 + METRICS.K_PERSP * dz),
    // 焦点より手前（dz<0）は消す（第1版 制約02）。薄れて見えるのは補間だけ
    alpha: (dz) => (dz < -1e-9 ? 0 : 1),
  },
  flat: { id: 'flat', label: '平行', mag: () => 1, alpha: () => 1 },
};

/*
 * ★ 2026-09-19：ここにあった `sizeXY` / `sizeBound`（端での下限 0.32）は取り消した。
 *   倍率は `min(X の像の倍率, Y の像の倍率)` そのもの ── `resolve.ts` が直接 Math.min で出す。
 *   「奥に行った泡は読めなくてよい。雰囲気だけでも残っていることに意味がある」（DECISIONS.md）。
 *   小さくなりすぎた泡を**描かない**のは ui の仕事で、domain には入らない。
 */

/** 軸とレンズ id から見出し（lab.html 390 行 lensLabel） */
export function lensLabel(axis: Axis, id: LensId): string {
  return axis === 'z'
    ? LENS_Z[id as LensZId].label
    : LENS_XY[id as LensXyId].label;
}

/**
 * ① 泡の像 ── 1つの泡を、その軸のレンズで写す。
 *
 * lab.html 616-628 行 projectIn。
 * 泡の左端と右端をレンズに通し、その間に泡を描く：k ＝ 像の幅 ÷ 自前の幅、s ＝ 像の中点。
 * 中心1点の局所倍率で一様に縮めると、帯の像と泡の像が別の式で縮んで噛み合わない
 * （v3/03 の実測：詰める×魚眼 の隙間 14 で端の隣と −1.7px 食い込む。泡の端を通すと 0）。
 *
 * @param pos   その泡の、空間の中での位置（帯の式の答え＝ Arranged.pos）
 * @param len   その軸の、泡の自前の長さ（箱の w か h）。0 以下なら中心1点で写す
 * @param focus その空間の、その軸の焦点
 */
export function imageOf(
  pos: number,
  len: number,
  lens: LensXy,
  H: number,
  focus: number,
): Projected {
  if (!(len > 1e-9)) return lens.project(pos - focus, H);
  const s0 = lens.project(pos - len / 2 - focus, H).s;
  const s1 = lens.project(pos + len / 2 - focus, H).s;
  return { s: (s0 + s1) / 2, k: (s1 - s0) / len };
}
