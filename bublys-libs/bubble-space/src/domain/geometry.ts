/** 2D/3D の値オブジェクト。純粋な TypeScript（React も Redux も知らない）。 */
export type Point2 = { x: number; y: number };
export type Size2 = { w: number; h: number };
export type Rect = { x: number; y: number; w: number; h: number };
export type Vec3 = { x: number; y: number; z: number };

export const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
export const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
export const centerOf = (r: Rect): Point2 => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
