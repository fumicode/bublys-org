/**
 * 1軸の写しと逆写し、そして焦点の約束。
 *
 * 元：lab.html 802-854 行（unprojectLocal・screenToAxis・axisToScreen・focusFits・fitFocus・setFocusAxis）
 *
 * ② 逆変換は軸ごと（画面の移動量 → そのレンズの unproject → 空間の中の移動量）。
 * 書き込む先は、その軸に刺さっている次元。
 */
import { METRICS, clamp } from './types.js';
import type { PlaneAxis, Axis, SpaceId, Focus } from './types.js';
import type { BubbleWorld } from './world.js';
import { imageOf, LENS_XY } from './lens.js';
import type { LensXyId } from './lens.js';
import type { SpaceLayout } from './resolve.js';
import { hostScale } from './resolve.js';
import type { LayoutRules } from './rules.js';

/**
 * 画面 → レンズを通す前の u（位置 − 焦点）。lab.html 804-808 行。
 * @param m その泡の Z の倍率（Placement.m）。背景を掴んだときは 1
 */
export function unprojectLocal(L: SpaceLayout, axis: PlaneAxis, screen: number, m = 1): number {
  // ★ 寄り（zoom）はレンズの外側で掛かっているので、逆写しでも外側で外す（hostScale）
  const local = (screen - (axis === 'x' ? L.host.cx : L.host.cy)) / hostScale(L.host);
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
  return (axis === 'x' ? L.host.cx : L.host.cy) + (L.ctx.vp[axis] + (s - L.ctx.vp[axis]) * m) * hostScale(L.host);
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
 * **平行に写したら、中身は箱に収まるか。**
 *
 * `focusFits` と違って**レンズを見ない**。魚眼は tanh で必ず箱に収めてしまうので、
 * 「魚眼が要るか」を決めるのにそれを使うと、点けた途端に「収まった」ことになって
 * すぐ消す ── 点けたり消したりが止まらない。
 * 要るかどうかは**平行に置いたときの広がり**で決まる。これはレンズを変えても動かない。
 */
export function fitsParallel(L: SpaceLayout, axis: PlaneAxis): boolean {
  let lo = Infinity;
  let hi = -Infinity;
  for (const k of L.kids) {
    const at = L.arr[axis].pos.get(k.id) ?? 0;
    const sz = L.sizeOf(k);
    const half = (axis === 'x' ? sz.w : sz.h) / 2;
    lo = Math.min(lo, at - half);
    hi = Math.max(hi, at + half);
  }
  if (!(hi > lo)) return true;                       // 泡がいない／1 点なら収まっている
  return hi - lo <= L.H[axis] * 2 + 1e-6;
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
  /**
   * (0) 次元が なし の軸は 0 ── **ただし「中身が入っているなら」**。
   *
   * ★ 次元が無いのは「並べる値が無い」という意味であって、「見えなくていい」ではない。
   *   縦に並べた一覧で札のほうが箱より**横に**大きければ、横には並べていなくても
   *   はみ出したぶんは見に行けないと困る（実測：札が右で切れたまま、横へ動かす道が無かった）。
   *   その向きには並びの操作がもともと無いので、送りと喧嘩もしない。
   * ★ 動けるのは**はみ出したぶんだけ**。入っているなら 0 のまま ＝ もとの約束どおり
   *   （下の「収まらない並び」と同じ止まり方を、そのまま使う）。
   * ★ 「そのまま置く」（自由・透視の X・Y）は別 ── 置き所が無いのだから動かない。
   *   魚眼も別 ── レンズが箱に収めてしまうので、はみ出しという事が起きない。
   */
  const noDim = L.view[axis].dim === 'none';
  if (noDim && (axis === 'z' || L.view[axis].arrange === 'as-is' || L.view[axis].lens !== 'parallel')) {
    return 0;
  }
  if (axis === 'z') {
    /**
     * Z は「空にしない」：**奥へは一番奥の泡まで／手前へは一番手前の泡より 1 だけ**
     * （どこまで退けるかが rules.zFocusStop）。
     *
     * ★ 端は**泡そのもの**から測る。ラボはここに 0 を混ぜていた（lab.html 900 行
     *   `clamp(v, Math.min(0, ...ps) - 1, Math.max(0, ...ps))`）。ラボの Z の値は
     *   いつも 0 から始まる（履歴の古さはいちばん新しいものが 0、順序も 0 から）ので
     *   0 を混ぜても答えは同じだったが、こちらは一覧の札を消したり足したりするうちに
     *   順序が 2,3,4… と 0 から離れる。0 を混ぜたままだと、いちばん手前まで繰っても
     *   **札がその枚数ぶん奥に残る**（実測：先頭の札が 3 枚ぶん奥のまま前へ出てこない）。
     *   決まりの言葉どおりに測れば、いちばん手前まで繰ったとき先頭の札は
     *   「先頭が真ん中に来たときの 2 番目の位置」に立つ。
     */
    if (!ps.length) return clamp(v, -1, 0);
    /**
     * ★ **手前の端は「先頭の泡の面」**（`min(ps)`）。先頭を見たいなら、そこが行き先。
     *
     *   ラボは 1 段向こう（`min(ps) − 1`）まで退いていたが、それだと先頭を出そうとすると
     *   **先頭が 2 番目の位置に来て**しまう（奥のぜんぶが見えるかわりに、見たいものが退く）。
     *   「もう一度やったら向こうへ」も試したが、ホイールは一続きで何十回も来るので
     *   素通りしてしまい、手の続き具合を見るしかなくなって具合が悪かった。
     *   **端は 1 つにして、越えようとしたことは跳ね返り（bounce）で知らせる**（ui の仕事）。
     *   どこまで退けるかは rules.zFocusStop（RULES.md まだ決めていない 1）。
     */
    const front = Math.min(...ps) - (rules.zFocusStop === 'behind' ? 0 : 1);
    return clamp(v, front, Math.max(...ps));
  }
  if (!ps.length) return noDim ? 0 : v;
  if (L.view[axis].arrange === 'as-is') return v;
  const from0 = cur ?? L.focus[axis];
  /**
   * ★ **収まらない並びは、「全部が入る」では止められない。**
   *
   *   `focusFits`（(2)）は「どの泡も箱の中にある」なので、中身が入りきらない並びでは
   *   **どの焦点でも偽**になる。そのまま通すと焦点が凍りつき、はみ出したぶんを
   *   見に行く道が無くなる（実測：縦に並べた一覧でホイールが 1px も効かない）。
   *
   *   収まらないときは**端より外へは行かない**で止める ── ふつうのスクロールと同じ止まり方。
   *   見るのは平行な軸だけ：魚眼は tanh で必ず箱に収めてしまうので、
   *   「収まらない」はそもそも起きない（並びの広がりは箱と比べられない）。
   */
  if (L.view[axis].lens === 'parallel') {
    const bands = L.arr[axis].bands;
    if (bands.length) {
      const lo = Math.min(...bands.map((b) => b.start));
      const hi = Math.max(...bands.map((b) => b.end));
      const room = Math.max(0, L.H[axis] - METRICS.PAD);
      /**
       * ★ **空けてある所（`reserve`）は、部屋の広さから引く。**
       *   口のぶんを空けた並びは、箱に入る量がその 52px ぶん少ない。引かないと
       *   「ぎりぎり収まっている」と数えてしまい、**はみ出した最後のひと切れに行けない**
       *   （実測：札 6 枚の縦の一覧で、最後の 26px が切れたままホイールが効かなかった）。
       */
      const room2 = room * 2 - (L.view[axis].reserve ?? 0);
      /**
       * ★ 止まり所は**0 を含む**。0 は並びが置かれたそのままの所（口のぶんを空けた
       *   「いちばん上」）なので、そこを端に含めないと、空けたはずの所まで送られてしまう
       *   ── 実測：スクロールできるようにした途端、＋新規の口に札が戻ってきた。
       */
      if (hi - lo > room2) return clamp(v, Math.min(0, lo + room), Math.max(0, hi - room));
    }
  }
  if (noDim) return 0;                        // (0) 入っているなら 0（はみ出していれば上で返った）
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
