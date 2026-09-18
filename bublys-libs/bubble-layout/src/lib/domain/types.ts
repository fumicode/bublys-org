/**
 * 語彙の型と、寸法の数。ここは何にも依存しない。
 *
 * 元：docs/bubble-space-prototype/v5-dom/lab.html 305-341 行（§1 語彙のうち、定数の所）
 * 正：docs/bubble-space-prototype/v4/RULES.md
 */

/** 軸。View は軸ごとに「次元・並べ方・レンズ」を持つ（規則①） */
export type Axis = 'x' | 'y' | 'z';
/** X と Y。レンズの逆関数があるのはこの2つだけ（Z のレンズには unproject が無い） */
export type PlaneAxis = 'x' | 'y';

export type BubbleId = string;
/** 空間の id。泡の id か、いちばん外の空間を指す 'root' */
export type SpaceId = BubbleId | 'root';
/** いちばん外の空間。lab.html 419 行の ROOT */
export const ROOT_SPACE = 'root';

export interface Size {
  readonly w: number;
  readonly h: number;
}
export interface Point {
  readonly x: number;
  readonly y: number;
}
/** 画面の矩形（左上と大きさ）。scale は掛けたあとの見えている大きさ */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}
/** 「自由」次元が読む座標 */
export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}
/** 「列」「行」次元が読む値 */
export interface Cell {
  readonly col: number;
  readonly row: number;
}
/** 空間が「いまどこを見ているか」。View の型には入れない（継がないので。RULES.md 継承） */
export type Focus = Vec3;

/**
 * 寸法の数。lab.html 306-321 行の定数をそのまま持ってきたもの。
 * HEADER・PAD は見た目の数に見えるが、箱の大きさ（measure）と中身の原点に効くので模型の側にある。
 */
export const METRICS = {
  /** 泡のヘッダの高さ（中身の箱はこの下） */
  HEADER: 24,
  /** 空間を持つ泡の箱の余白 */
  PAD: 14,
  /** 「詰める」の帯と帯の隙間の既定（View の軸が gap を持てば、そちら） */
  GAP: 14,
  /** 透視：奥行き1あたりの縮み */
  K_PERSP: 0.26,
  /** root の消失点（画面中心から） */
  ROOT_VP: { x: -130, y: -165 },
  /** 子の空間の消失点（余白の内側の半幅・半高に対する割合、左上へ）。1 以下＝箱の中 */
  VP_CHILD: { fx: 1, fy: 1 },
  /** 空間の外へ「大きく」引き出したとみなす距離（画面 px） */
  PULL: 48,
  /** ③ 縁どうしがこの距離（画面 px）以内なら「くっつける」 */
  SNAP_EDGE: 24,
  /** ③ 直交方向に、小さい方の長さのこの割合以上重なっていること */
  SNAP_OVERLAP: 0.4,
  /** ③ 見えない親の「詰める」の隙間（縁が接する） */
  SNAP_GAP: 0,
} as const;

/** 数を範囲に収める。lab.html 313 行 */
export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}
