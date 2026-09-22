/**
 * ② 操作は、軸と、何を掴んだかで決まる ── ドラッグしているあいだ、値を書く所だけ。
 *
 * 元：lab.html 1182-1200 行（moveBubble）、1163-1168 行（resize）、1171-1176 行（背景をドラッグする）、
 *     1536-1541 行（ホイール）、1137-1141 行（moves・lift）
 *
 * | 掴んだもの | 軸 | 起きること |
 * | 泡を横・縦にドラッグする | X / Y | 書けるなら書く／書けないなら視点が動く／なしなら何も起きない |
 * | 背景をドラッグする       | X / Y | 掴んでいないので、いつも視点（なし のときを除く） |
 * | ホイール         | Z     | 同上 |
 * | 泡を触る         | —     | 値は書かない。その泡が焦点になる（focus.ts の focusOn） |
 * | 右下の角をドラッグする   | —     | 大きさを変える |
 *
 * ★ 入力（pointerdown/move/up・当たり判定・掴んだ点との相対）は ui の仕事。
 *   ここへは「泡の中心を画面のどこへ持っていきたいか」まで噛み砕いて渡す
 *   （ラボは 1188 行で mx − (fx − 0.5)·w を自分で作っていた。fx は掴んだ点の割合＝入力）。
 *
 * ★ 焦点はどれも SpaceLayout.focus から読む（resolve.ts の断り）。
 *   ラボは毎フレーム状態へ書き戻していた（lab 727 行）ので、状態の焦点と同じ値になる。
 */
import type { BubbleId, Point, SpaceId, Size } from './types.js';
import { METRICS } from './types.js';
import type { BubbleWorld } from './world.js';
import type { Layout } from './resolve.js';
import type { ActContext } from './act.js';
import type { LayoutRules } from './rules.js';
import type { Verb } from './dimension.js';
import { verbOf, writeKeyOf } from './dimension.js';
import { viewOfSpace } from './view.js';
import { valueFromPos } from './arrange.js';
import { screenToAxis, unprojectLocal, withFocusAxis } from './project.js';
import { pin } from './pin.js';

/** その空間で、X・Y をドラッグしたら何が起きるか。lab.html 1135 行 verbs */
export interface DragVerbs {
  readonly x: Verb;
  readonly y: Verb;
}
export function dragVerbsOf(world: BubbleWorld, spaceId: SpaceId): DragVerbs {
  const V = viewOfSpace(world, spaceId);
  return { x: verbOf(V.x.dim), y: verbOf(V.y.dim) };
}

export interface DragBubbleQuery {
  readonly layout: Layout;
  readonly id: BubbleId;
  /** 掴んだときにいた空間（その View に従う） */
  readonly space: SpaceId;
  /** 泡の**中心**を画面のどこへ持っていきたいか（掴んだ点と泡の相対位置は ui がドラッグする） */
  readonly want: Point;
  /** その泡の Z の倍率（Placement.m）。逆写しに要る */
  readonly m: number;
}

/**
 * 泡をドラッグする。lab.html 1182-1200 行 moveBubble の、値を書く所だけ。
 * 軸ごとに：'coord' なら次元の key へ書く（free.x 決め打ちにしない）／'focus' なら焦点を動かす／
 * 'reorder'・'cell' はここでは書かない（離したときに確定する ＝ drop → reshape）。
 *
 * ★ 2つの軸は同じ配置（掴む前に解いたもの）から測る。ラボも L を1つしか持たない。
 */
export function dragBubble(world: BubbleWorld, q: DragBubbleQuery, rules: LayoutRules): BubbleWorld {
  const L = q.layout.spaces.get(q.space);
  const p = q.layout.byId.get(q.id);
  if (!L || !p) return world;
  const verbs = dragVerbsOf(world, q.space);
  let w = world;
  for (const axis of ['x', 'y'] as const) {
    const verb = verbs[axis];
    const want = axis === 'x' ? q.want.x : q.want.y;
    if (verb === 'coord') {
      // ★ 書き込む先はその軸に刺さっている次元（lab 1191 行）
      const key = writeKeyOf(L.view[axis].dim);
      if (key !== 'x' && key !== 'y' && key !== 'z') continue;
      const b = w.bubble(q.id);
      if (!b) continue;
      w = w.withBubble(
        b.withFree(key, valueFromPos(L.view[axis], L.arr[axis], screenToAxis(L, axis, want, p.m))),
      );
    } else if (verb === 'focus') {
      // 泡のいまの u（位置 − ctx の焦点）が、行きたい u になるまで焦点を動かす（lab 1194 行）
      const v = L.focus[axis] + (p.pos[axis] - L.ctx.focus[axis]) - unprojectLocal(L, axis, want, p.m);
      w = withFocusAxis(w, L, axis, v, rules);
    }
  }
  return w;
}

export interface DragFocusQuery {
  readonly layout: Layout;
  readonly space: SpaceId;
  /** 掴んだときの焦点 */
  readonly from: { readonly x: number; readonly y: number };
  /** 掴んだ点の u（位置 − 焦点）。掴んだときに unprojectLocal で測っておく */
  readonly u0: { readonly x: number; readonly y: number };
  readonly pointer: Point;
}

/**
 * 背景をドラッグする（視点）。lab.html 1171-1176 行。
 * 掴んだ点の u が u0 → いま に変わった分だけ焦点を戻す（掴んだ点がカーソルについてくる）。
 * 次元が なし の軸は何も起きない。
 */
export function dragFocus(world: BubbleWorld, q: DragFocusQuery, rules: LayoutRules): BubbleWorld {
  const L = q.layout.spaces.get(q.space);
  if (!L) return world;
  let w = world;
  for (const axis of ['x', 'y'] as const) {
    if (L.view[axis].dim === 'none') continue;               // なしの軸は何も起きない
    const screen = axis === 'x' ? q.pointer.x : q.pointer.y;
    w = withFocusAxis(w, L, axis, q.from[axis] + q.u0[axis] - unprojectLocal(L, axis, screen), rules);
  }
  return w;
}

/**
 * ホイール ＝ Z の焦点。lab.html 1536-1541 行。
 * ③ 見えない親はホイールを外へ通す（windowOf）。Z が なし なら何もしない。
 * 手前へどこまで退けるかは rules.zFocusStop（RULES.md まだ決めていない 1）。
 *
 * @param delta 焦点 Z に足す量。ラボは生の deltaY に 0.004 を掛けている（lab 1540 行）。
 *              その 0.004 は「ホイールの効き」＝入力の側の数なので ui に置いたまま、ここへは掛けた後を渡す。
 */
export function wheelZ(
  world: BubbleWorld,
  layout: Layout,
  spaceId: SpaceId,
  delta: number,
  rules: LayoutRules,
): BubbleWorld {
  const space = world.windowOf(spaceId);
  const L = layout.spaces.get(space);
  if (!L || L.view.z.dim === 'none') return world;
  return withFocusAxis(world, L, 'z', L.focus.z + delta, rules);
}

export interface ResizeQuery {
  readonly id: BubbleId;
  /** 掴んだときの箱の大きさ（measure の答え。自前の大きさではなく、伸びた大きさから始める） */
  readonly size0: Size;
  /** 画面でドラッグした量 */
  readonly by: Point;
  /** 掴んだときの合成倍率 */
  readonly scale: number;
  /** 掴んだときの左上（⑤ pin の行き先。ここを動かさない） */
  readonly at: { readonly x: number; readonly y: number };
}

/**
 * 右下の角をドラッグする。lab.html 1163-1168 行。
 * 大きさを書いてから ⑤ pin で左上を留める（どの空間にいても同じ1つの決まり）。
 * 付け替えは起きないので ReshapeResult ではなく世界だけを返す。
 */
export function resizeBubble(world: BubbleWorld, ctx: ActContext, q: ResizeQuery): BubbleWorld {
  const b = world.bubble(q.id);
  if (!b) return world;
  const size = {
    w: Math.max(40, q.size0.w + q.by.x / q.scale),
    h: Math.max(METRICS.HEADER + 10, q.size0.h + q.by.y / q.scale),
  };
  const next = world.withBubble(b.withSize(size));
  // pin が見るのは左上（x・y）だけ。w/h/scale は掴んだときのものをそのまま渡す
  return pin(next, ctx, q.id, { x: q.at.x, y: q.at.y, w: q.size0.w, h: q.size0.h, scale: q.scale });
}

/** ドラッグし始めに「この軸はついてくるか」（並べ替え・マス移動）。lab.html 1141 行 */
export function liftsOf(verbs: DragVerbs): boolean {
  return [verbs.x, verbs.y].some((v) => v === 'reorder' || v === 'cell');
}
/** ドラッグし始めに「この泡は空間を移れるか」（泡が動くときだけ）。lab.html 1140 行 moves */
export function movesOf(verbs: DragVerbs): boolean {
  return [verbs.x, verbs.y].some((v) => v === 'coord' || v === 'reorder' || v === 'cell');
}
