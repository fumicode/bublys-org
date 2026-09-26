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
import type { SizeCombine } from './rules.js';

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
  /**
   * 透視は焦点より手前を消す。薄れて見えるのは補間だけ（lab.html 387 行）。
   * @param step その軸の刻み。消し始めるのは焦点の面より `step × METRICS.Z_FRONT_KEEP` 手前から
   */
  alpha(dz: number, step?: number): number;
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
    /**
     * 焦点より手前は消す（第1版 制約02）。薄れて見えるのは補間だけ。
     * ただし**刻みの 0.35 ぶんは同じ面のうち**として置いておく（METRICS.Z_FRONT_KEEP）
     * ── 面をかすめた途端に原寸で消えると「まだ普通の大きさなのに消えた」と映る。
     */
    alpha: (dz, step = 1) => (dz < -Math.abs(step) * METRICS.Z_FRONT_KEEP - 1e-9 ? 0 : 1),
  },
  flat: { id: 'flat', label: '平行', mag: () => 1, alpha: () => 1 },
};

/*
 * ★ 2026-09-19：ここにあった `sizeXY` / `sizeBound`（端での下限 0.32）は取り消した。
 *   「奥に行った泡は読めなくてよい。雰囲気だけでも残っていることに意味がある」（DECISIONS.md）。
 *   小さくなりすぎた泡を**描かない**のは ui の仕事で、domain には入らない。
 */

/**
 * ① **像に泡を収める** ── 両軸の像から「大きさの倍率ひとつ」と「位置の曲がり」を出す。
 *
 * > **大きさは斜辺で決める。曲がりはその大きさに従う ── 泡はいつも自分の像を埋める。**
 *
 * 泡は矩形のまま拡大縮小するので、合わせられる軸は1つだけ（RULES.md「大きさの倍率」）。
 * X の像と Y の像から**1つの数**を作る、その作り方がここ。
 *
 * ★ **大きさ（k）** ── 軸の遠さを `a = −ln k`（k ＝ その軸の像の倍率。遠いほど a が大きい）と
 *   置くと、3 つのまとめ方は同じ式のものさし（p ノルム）違いになる:
 *
 * | | 式 | u ＝ H の隅 | 何が言えるか |
 * |---|---|---|---|
 * | `min` | `exp(−max(ax, ay))` | 0.4200 | ラボと RULES.md の元の答え。**隅と上下左右が同じ大きさ**になる |
 * | `hypot` | `exp(−√(ax² + ay²))` | 0.2932 | **既定。** 隅はいちばん小さく、減衰は斜辺 1 本ぶん |
 * | `product` | `exp(−(ax + ay))` ＝ `kx·ky` | 0.1764 | 遠さが 2 回掛かる（`1/cosh⁴t`）── 隅が早く消える |
 *
 * ★ **曲がり（bx・by）** ── 位置は「その軸の像」を `b` 倍した所に置く。
 *   `b = k ÷ その軸の像の倍率` と決める ＝ **泡は自分の像をちょうど埋める**。
 *   どのまとめ方でも `k ≤ min(kx, ky)` なので `b ≤ 1`、つまり位置は必ず像の内側 ＝ 箱の中。
 *
 *   `product` ではこれが `bx = ky`・`by = kx` そのもの（`kx·ky ÷ kx`）── **前からの式は、
 *   この一般形の特別な場合だった**。「上の行は縦に遠いので横にも縮む」も同じまま。
 *
 *   ★ **なぜ曲がりを大きさに合わせるのか**（数で踏んだ）── 刻みが箱と同じ格子（`coverflowGrid`）で
 *     隣どうしがぴたり接するのは「泡の幅 ＝ 像の幅 × 曲がり」のときだけ。`bx` を `ky` に
 *     固定したまま大きさだけ斜辺にすると、泡が自分の像より広くなって**隣と重なる**
 *     （実測：200×100 の格子・隙間 14 で横 −16.1px・縦 −8.1px）。合わせておけば、
 *     ずれは必ず**隙間**の側に出る（重なりは構造的に出ない）。
 *
 * @param kx X の像の倍率（`imageOf().k`）。レンズの像は必ず 1 以下
 * @param ky Y の像の倍率
 */
export interface SizeFit {
  /** 大きさの倍率（Z の m を掛ける前） */
  readonly k: number;
  /** X の位置に掛ける曲がり */
  readonly bx: number;
  /** Y の位置に掛ける曲がり */
  readonly by: number;
}

/**
 * 遠さの上限。**潰れきった像（k ＝ 0）で `−ln 0` が ∞ になるのを、ここで止める。**
 *
 * ★ 止めないと、隅の斜辺が `exp(∞ − ∞)` になって**曲がりが NaN** になり、
 *   泡の置き場所と薄さが NaN のまま画面へ出る（実測：両軸魚眼の海で一覧を開いた瞬間に
 *   「`NaN` is an invalid value for the `opacity` css style property」）。
 * ★ `exp(−700)` ≒ 1e-304 なので、大きさとしては 0 と同じ。止めても絵は変わらない。
 *   止めた側の曲がりは、極限どおり 1 に寄る（片方が潰れきっても、もう片方の位置は曲がらない）。
 */
const A_MAX = 700;

export function sizeFit(kx: number, ky: number, how: SizeCombine = 'hypot'): SizeFit {
  // 遠さ（0 以上）。像が原寸（平行のレンズ）なら 0、潰れきっていたら A_MAX で止める
  const ax = kx >= 1 ? 0 : Math.min(A_MAX, -Math.log(kx));
  const ay = ky >= 1 ? 0 : Math.min(A_MAX, -Math.log(ky));
  /**
   * ★ **片方の軸が曲がっていないときは、そこで丸めない。**
   *   `exp(−(−ln k))` は k にビット単位で戻る保証が無いので、像をそのまま返す
   *   ── 縦・横の coverflow もラボの X魚眼ビューも、3 つのまとめ方すべてで 1px も変わらない。
   */
  if (ay === 0) return { k: kx, bx: 1, by: kx };
  if (ax === 0) return { k: ky, bx: ky, by: 1 };
  if (how === 'product') return { k: kx * ky, bx: ky, by: kx };
  if (how === 'min') {
    const k = Math.min(kx, ky);
    // 潰れきった軸（k ＝ 0）で 0 ÷ 0 にしない ── 曲がりの極限は 1（斜辺と同じ）
    return { k, bx: kx > 0 ? k / kx : 1, by: ky > 0 ? k / ky : 1 };
  }
  const d = Math.hypot(ax, ay);
  return { k: Math.exp(-d), bx: Math.exp(ax - d), by: Math.exp(ay - d) };
}

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
