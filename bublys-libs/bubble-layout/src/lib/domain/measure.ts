/**
 * 箱の大きさと、レンズの ctx（空間の半幅 H と消失点 vp）。
 *
 * 元：lab.html 629-685 行（measure）、686-690 行（halfOf）、691-707 行（lensCtx）
 *
 * ④ 'equal'・'pack' の軸では、空間を持つ泡の箱は中身が収まるまで伸びる。'as-is' の軸では自前の大きさ。
 * ③ 見えない親は自前の大きさを持たないので、どの並べ方でも箱は中身ぴったり（ヘッダ 0・余白 0）。
 */
import { METRICS, ROOT_SPACE } from './types.js';
import type { BubbleId, Focus, Size, SpaceId } from './types.js';
import { CHROME, chromeH, chromeW } from './chrome.js';
import type { Chrome, ChromeId } from './chrome.js';
import type { Bubble } from './bubble.js';
import type { BubbleWorld } from './world.js';
import { viewOfSpace } from './view.js';
import { arrangeAxis } from './arrange.js';
import { imageOf, LENS_XY } from './lens.js';
import type { LensXyId } from './lens.js';
import type { LayoutRules } from './rules.js';
import type { Host } from './resolve.js';

/** 泡 id → 箱の大きさ。measure の答えを1フレーム分ためる入れ物（lab.html の memo） */
export type BoxSizes = Map<BubbleId, Size>;

/**
 * **このフレームだけ、その泡がどの装いを着ているか**。
 *
 * ★ 模型の値ではない ── 世界には書かない。1 フレームの measure にだけ効く。
 *   どの装いを着るか（窓か・一覧の札か・普通の泡か）は**描く側の都合**なので、
 *   泡は持たない。値を書かないので ②「触っても値は1つも書かない」を守れる。
 * ★ 前は「このフレームだけ背を伸ばす px」（`GrownHeights`）だった。
 *   伸ばす量は装いの差そのものだったので、装いを渡せば差は**ひとりでに出る**。
 */
export type ChromeMap = ReadonlyMap<BubbleId, ChromeId>;

/**
 * その泡が着ている装い。
 *
 * - 器そのもの（root）… 装いは無い
 * - ③ 見えない親 … **体を持たない**ので装いも無い
 * - それ以外 … このフレームで渡された装い（既定は**帯だけ** ＝ ラボと同じ）
 */
export function chromeOf(world: BubbleWorld, id: SpaceId, chrome?: ChromeMap): Chrome {
  const b = id === ROOT_SPACE ? null : world.bubble(id);
  if (!b || b.state.implicit) return CHROME.bare;
  return CHROME[chrome?.get(id) ?? 'bar'];
}

/** その空間の装いが、上に取るぶん（題名の帯）。lab.html 326 行 headOf */
export function headOf(world: BubbleWorld, id: SpaceId, chrome?: ChromeMap): number {
  return chromeOf(world, id, chrome).top;
}
export function padOf(world: BubbleWorld, id: SpaceId): number {
  const b = id === ROOT_SPACE ? null : world.bubble(id);
  return b && b.state.implicit ? 0 : METRICS.PAD;
}

/**
 * 箱の大きさ。lab.html 634-662 行 measure。
 * 魚眼は箱の半幅で曲がる（H と中身が互いに決まる）ので、落ち着くまで何度か当てる。
 * memo は同じフレームの中で使い回す（中身 → 親 の順に何度も引かれる）。
 */
export function measureBox(
  world: BubbleWorld,
  id: BubbleId,
  memo: BoxSizes,
  rules: LayoutRules,
  chrome?: ChromeMap,
): Size {
  const done = memo.get(id);
  if (done) return done;
  const self = world.bubble(id);
  if (!self) return { w: 0, h: 0 };
  /**
   * ★ **箱 ＝ 中身 ＋ 装い。**
   *   泡が持っている `size` は**中身の大きさ**で、枠が取るぶんはここで外へ足す。
   *   前は `size` が装い込みの箱だったので、同じ泡が置かれた場所（海・一覧）で
   *   **中身の大きさまで変わって**いた（`chrome.ts` の註）。
   */
  const c = chromeOf(world, id, chrome);
  const box = { w: self.state.size.w + chromeW(c), h: self.state.size.h + chromeH(c) };
  const kids = world.kidsOf(id);
  const pad = padOf(world, id);
  if (kids.length) {
    const V = viewOfSpace(world, id);
    const sizeOf = (k: Bubble) => measureBox(world, k.id, memo, rules, chrome);
    for (const axis of ['x', 'y'] as const) {
      const A = V[axis];
      // ③ 見えない親は自前の大きさを持たないので、どの並べ方でも箱は中身ぴったり
      //   （「そのままの軸は自前」は体のある泡の話）
      if (A.arrange === 'as-is' && !self.state.implicit) continue;
      const ar = arrangeAxis({ axisView: A, axis, spaceId: id, kids, sizeOf, world, rules });
      const lens = LENS_XY[A.lens as LensXyId];
      // 自前の下限は**中身**の半分（装いはこのあと外へ足す）
      const ownHalf = Math.max(0, axis === 'x' ? self.state.size.w : self.state.size.h) / 2;
      const halfLen = (k: Bubble) => (axis === 'x' ? sizeOf(k).w : sizeOf(k).h) / 2;
      let half = ownHalf;
      for (let n = 0; n < 60; n++) {
        // H＝箱の半幅。魚眼では H と中身が互いに決まるので落ち着くまで
        const H = Math.max(1, half);
        let need = 0;
        for (const k of kids) {
          const at = ar.pos.get(k.id) ?? 0;
          const p = imageOf(at, halfLen(k) * 2, lens, H, 0);
          // 大きさは①の答え。この軸の像の倍率で測る（もう一方の軸は min から落ちるので見なくてよい）
          need = Math.max(need, Math.abs(p.s) + halfLen(k) * p.k);
        }
        const next = Math.max(ownHalf, need + pad);
        if (Math.abs(next - half) < 1e-6) {
          half = next;
          break;
        }
        half = next;
      }
      if (axis === 'x') box.w = half * 2 + chromeW(c);
      else box.h = half * 2 + chromeH(c);
    }
  }
  memo.set(id, box);
  return box;
}

/** 泡ぜんぶを1回で measure する（1フレームの入口）。resolveWorld が最初に呼ぶ */
export function measureAll(world: BubbleWorld, rules: LayoutRules, chrome?: ChromeMap): BoxSizes {
  const memo: BoxSizes = new Map();
  for (const b of world.bubbles) measureBox(world, b.id, memo, rules, chrome);
  return memo;
}

/** 空間（中身の箱）の半幅。魚眼の像は箱いっぱい。lab.html 665 行 halfOf */
export function halfOf(host: Pick<Host, 'w' | 'h'>): { readonly x: number; readonly y: number } {
  return { x: Math.max(1, host.w / 2), y: Math.max(1, host.h / 2) };
}

/**
 * レンズの ctx。★ 目の位置を足すならここ1か所（焦点や消失点をずらした写しを返す。状態には書き込まない）。
 * lab.html 667-682 行 lensCtx。
 * 子の空間の消失点は箱の中（余白の内側の左上の角）に置く ── 透視は見える泡を m ≤ 1 で消失点へ寄せるだけなので、
 * X/Y で箱に収まった中身は Z をかけても箱に収まる（measure・focusFits は Z を見なくてよい）。
 */
export interface LensContext {
  /** このフレームの焦点（目を足したあとの写し。状態の焦点とは別物） */
  readonly focus: Focus;
  /** 空間の半幅・半高 */
  readonly H: { readonly x: number; readonly y: number };
  /** 消失点（空間の中心から） */
  readonly vp: { readonly x: number; readonly y: number };
}

export function lensContext(
  world: BubbleWorld,
  spaceId: SpaceId,
  host: Host,
  focus: Focus,
): LensContext {
  const H = halfOf(host);
  return {
    focus: { ...focus },
    H,
    vp:
      spaceId === ROOT_SPACE
        ? { ...METRICS.ROOT_VP }
        : {
            x: -Math.max(0, H.x - padOf(world, spaceId)) * METRICS.VP_CHILD.fx,
            y: -Math.max(0, H.y - padOf(world, spaceId)) * METRICS.VP_CHILD.fy,
          },
  };
}
