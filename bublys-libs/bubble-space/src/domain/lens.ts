import { clamp } from "./geometry.js";
import type { Point2, Vec3 } from "./geometry.js";

export type LensContext = {
  focus: Vec3;
  /** 画面中心 */
  cx: number;
  cy: number;
  /** Z を整数の面にスナップするか */
  quantize: boolean;
};
export type Projection = { x: number; y: number; scale: number; alpha: number };

/**
 * レンズに課す2つの制約
 *   A. 矩形を矩形に写す（位置と一様スケールだけを曲げる）。だから Canvas でも DOM でも動く。
 *   B. scale はその点の局所倍率（ヤコビアン）。逆変換 unproject を必ず持つ。
 *      これが無いレンズは「見るだけ」になり、掴めない。
 */
export interface Lens {
  id: string;
  label: string;
  project(p: Vec3, ctx: LensContext): Projection;
  unproject(sx: number, sy: number, z: number, ctx: LensContext): Point2;
}

export const K_PERSP = 0.26;
export const MAG_MIN = 0.04;
export const MAG_MAX = 1.9;
/** ★ 消失点は焦点と別物。一致させると奥の泡が手前に完全に隠れる。 */
export const VANISHING = { dx: -130, dy: -165 };
export const STEP_PX = 300;

/** 奥行き差 → 倍率。1 - 0.1*i と違い負にならず、遠方で 0 に漸近する。 */
export const depthMag = (dz: number) => clamp(1 / (1 + K_PERSP * dz), MAG_MIN, MAG_MAX);
/** ★ 焦点より手前は倍率が発散する。大きくし続けず、透明にして消す。 */
export const frontAlpha = (dz: number) => (dz < 0 ? clamp(1 + dz * 0.55, 0, 1) : 1);
const sech2 = (u: number) => { const c = Math.cosh(u); return 1 / (c * c); };
const dzOf = (z: number, ctx: LensContext) => {
  const d = z - ctx.focus.z;
  return ctx.quantize ? Math.round(d) : d;
};

export const perspectiveLens: Lens = {
  id: "perspective",
  label: "透視（消失点）",
  project(p, ctx) {
    const dz = dzOf(p.z, ctx);
    const m = depthMag(dz);
    const p0x = ctx.cx + (p.x - ctx.focus.x);
    const p0y = ctx.cy + (p.y - ctx.focus.y);
    const vx = ctx.cx + VANISHING.dx;
    const vy = ctx.cy + VANISHING.dy;
    return { x: vx + (p0x - vx) * m, y: vy + (p0y - vy) * m, scale: m, alpha: frontAlpha(dz) };
  },
  unproject(sx, sy, z, ctx) {
    const m = depthMag(dzOf(z, ctx));
    const vx = ctx.cx + VANISHING.dx;
    const vy = ctx.cy + VANISHING.dy;
    return {
      x: ctx.focus.x + (vx + (sx - vx) / m) - ctx.cx,
      y: ctx.focus.y + (vy + (sy - vy) / m) - ctx.cy,
    };
  },
};

/** 世界線ビュー相当。tanh の微分がそのまま局所倍率になる。 */
export const fisheyeXLens: Lens = {
  id: "fisheyeX",
  label: "魚眼（X軸）",
  project(p, ctx) {
    const halfW = Math.max(1, ctx.cx - 70);
    const mag0 = 132 / STEP_PX;
    const K = halfW / mag0;
    const u = p.x - ctx.focus.x;
    const m = mag0 * sech2(u / K) * depthMag(dzOf(p.z, ctx));
    return {
      x: ctx.cx + halfW * Math.tanh(u / K),
      y: ctx.cy + (p.y - ctx.focus.y) * Math.max(m, 0.12),
      scale: Math.max(m / mag0, 0.16),
      alpha: frontAlpha(dzOf(p.z, ctx)),
    };
  },
  unproject(sx, sy, z, ctx) {
    const halfW = Math.max(1, ctx.cx - 70);
    const mag0 = 132 / STEP_PX;
    const K = halfW / mag0;
    const u = K * Math.atanh(clamp((sx - ctx.cx) / halfW, -0.999, 0.999));
    const m = Math.max(mag0 * sech2(u / K) * depthMag(z - ctx.focus.z), 0.12);
    return { x: ctx.focus.x + u, y: ctx.focus.y + (sy - ctx.cy) / m };
  },
};

export const flatLens: Lens = {
  id: "flat",
  label: "平行（Z無視）",
  project(p, ctx) {
    return { x: ctx.cx + (p.x - ctx.focus.x), y: ctx.cy + (p.y - ctx.focus.y), scale: 1, alpha: 1 };
  },
  unproject(sx, sy, _z, ctx) {
    return { x: ctx.focus.x + sx - ctx.cx, y: ctx.focus.y + sy - ctx.cy };
  },
};

export const LENSES: Record<string, Lens> = {
  perspective: perspectiveLens,
  fisheyeX: fisheyeXLens,
  flat: flatLens,
};
export const lensById = (id: string): Lens => LENSES[id] ?? perspectiveLens;
