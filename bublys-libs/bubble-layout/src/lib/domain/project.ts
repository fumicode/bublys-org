/**
 * 1軸の写しと逆写し、そして焦点の約束。
 *
 * 元：lab.html 802-854 行（unprojectLocal・screenToAxis・axisToScreen・focusFits・fitFocus・setFocusAxis）
 *
 * ② 逆変換は軸ごと（画面の移動量 → そのレンズの unproject → 空間の中の移動量）。
 * 書き込む先は、その軸に刺さっている次元。
 */
import { clamp } from './types.js';
import type { PlaneAxis, Axis, SpaceId, Focus } from './types.js';
import type { BubbleWorld } from './world.js';
import { imageOf, LENS_XY } from './lens.js';
import type { LensXyId } from './lens.js';
import type { SpaceLayout } from './resolve.js';
import type { LayoutRules } from './rules.js';

/**
 * 画面 → レンズを通す前の u（位置 − 焦点）。lab.html 804-808 行。
 * @param m その泡の Z の倍率（Placement.m）。背景を掴んだときは 1
 */
export function unprojectLocal(L: SpaceLayout, axis: PlaneAxis, screen: number, m = 1): number {
  const local = (screen - (axis === 'x' ? L.host.cx : L.host.cy)) / L.host.scale;
  const s = L.ctx.vp[axis] + (local - L.ctx.vp[axis]) / m;
  return LENS_XY[L.view[axis].lens as LensXyId].unproject(s, L.ctx.H[axis]);
}

/** 画面 → 空間の中での位置。lab.html 809 行 screenToAxis（＝ unprojectLocal ＋ 焦点） */
export function screenToAxis(L: SpaceLayout, axis: PlaneAxis, screen: number, m = 1): number {
  return unprojectLocal(L, axis, screen, m) + L.ctx.focus[axis];
}

/** 空間の中での位置 → 画面。lab.html 810-813 行 axisToScreen */
export function axisToScreen(L: SpaceLayout, axis: PlaneAxis, pos: number, m = 1): number {
  const s = LENS_XY[L.view[axis].lens as LensXyId].project(pos - L.ctx.focus[axis], L.ctx.H[axis]).s;
  return (axis === 'x' ? L.host.cx : L.host.cy) + (L.ctx.vp[axis] + (s - L.ctx.vp[axis]) * m) * L.host.scale;
}

/**
 * 焦点の約束(2)：その焦点で写したら、中身が箱に収まるか。lab.html 826-834 行 focusFits。
 * 泡の像（lens.imageOf）で測る。Z の寄せは見なくてよい（measure.lensContext の注）。
 */
export function focusFits(L: SpaceLayout, axis: PlaneAxis, f: number): boolean {
  const lens = LENS_XY[L.view[axis].lens as LensXyId];
  const H = L.H[axis];
  for (const k of L.kids) {
    const sz = L.sizeOf(k);
    const half = (axis === 'x' ? sz.w : sz.h) / 2;
    const p = imageOf(L.arr[axis].pos.get(k.id) ?? 0, half * 2, lens, H, f);   // ① 泡の像
    // 大きさは measure と同じ（その軸の像の倍率）
    if (Math.abs(p.s) + half * p.k > H + 1e-6) return false;
  }
  return true;
}

/**
 * 焦点を v へ動かしたら、約束の中のどこに留まるか（書かない）。lab.html 836-846 行 fitFocus。
 *   (0) 次元が なし の軸は 0
 *   (1) 見ている所には泡がある（並んだ泡の範囲の外へは出ない）
 *   (2) 中身は箱に収まる
 *   Z は「空にしない」：手前へは 1 退いて全体を見られる。奥へは一番奥の泡まで
 *       ★ この手前の 1 が RULES.md「まだ決めていない 1」。rules.zFocusStop で差せる
 * @param cur いまの焦点（(2) で戻る起点）。省いたら L.focus[axis]
 */
export function fitFocus(
  L: SpaceLayout,
  axis: Axis,
  v: number,
  cur: number | undefined,
  rules: LayoutRules,
): number {
  const ps = [...L.arr[axis].pos.values()];
  if (L.view[axis].dim === 'none') return 0;                                        // (0)
  if (axis === 'z') {
    // Z は「空にしない」：奥へは一番奥の泡まで。手前へどこまで退けるかが rules.zFocusStop
    const front = Math.min(0, ...ps) - (rules.zFocusStop === 'behind' ? 1 : 0);
    return clamp(v, front, Math.max(0, ...ps));
  }
  if (L.view[axis].arrange === 'as-is' || !ps.length) return v;
  const from0 = cur ?? L.focus[axis];
  v = clamp(v, Math.min(...ps), Math.max(...ps));                                   // (1)
  if (!focusFits(L, axis, v)) {                                                     // (2) 収まる所まで戻す
    const from = focusFits(L, axis, from0) ? from0 : 0;
    let lo = 0;
    let hi = 1;
    for (let n = 0; n < 40; n++) {
      const t = (lo + hi) / 2;
      if (focusFits(L, axis, from + (v - from) * t)) lo = t;
      else hi = t;
    }
    v = from + (v - from) * lo;
  }
  return v;
}

/**
 * 焦点を書く。lab.html 850 行 setFocusAxis。
 * 書く先は状態（ctx の焦点は写し）。操作は「掴んだ点の u が画面でどれだけ変わったか」で焦点を動かすので、
 * ctx の焦点が目でずれていても差し引きで消え、状態に目のずれは入らない。
 */
export function withFocusAxis(
  world: BubbleWorld,
  L: SpaceLayout,
  axis: Axis,
  v: number,
  rules: LayoutRules,
): BubbleWorld {
  const f = fitFocus(L, axis, v, L.focus[axis], rules);
  const patch: Partial<Focus> = axis === 'x' ? { x: f } : axis === 'y' ? { y: f } : { z: f };
  return world.withFocus(L.id, patch);
}

/** その空間の、いまの焦点（SpaceLayout があればそれ、無ければ状態から）。読む側の入口を1つにするため */
export function focusOf(
  world: BubbleWorld,
  layout: ReadonlyMap<SpaceId, SpaceLayout>,
  spaceId: SpaceId,
): Focus {
  return layout.get(spaceId)?.focus ?? world.focusOf(spaceId);
}
