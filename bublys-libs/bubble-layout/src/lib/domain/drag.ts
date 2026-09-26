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
import type { BubbleId, PlaneAxis, Point, SpaceId, Size } from './types.js';
import { METRICS, ROOT_SPACE } from './types.js';
import type { BubbleWorld } from './world.js';
import type { Layout } from './resolve.js';
import type { ActContext } from './act.js';
import type { LayoutRules } from './rules.js';
import type { Verb } from './dimension.js';
import { verbOf, writeKeyOf } from './dimension.js';
import { viewOfSpace } from './view.js';
import { chromeOf } from './measure.js';
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
 * ホイール ＝ **海の奥行き**（Z の焦点）。lab.html 1638-1646 行。
 *
 * ③ 見えない親はホイールを外へ通す（windowOf）。**Z が なし なら何も起きない。**
 * 手前へどこまで退けるかは rules.zFocusStop（RULES.md まだ決めていない 1）。
 *
 * ★ **ここは画面1の中だけ。** 泡のいる範囲で止まるのが正しい（約束(1)「見ている所には泡がある」）
 *   ── 泡のいない面を見ても仕方がない。
 *   「もっと大きく／小さく見たい」は面を進む話ではないので、**画面2の寄り**（{@link zoomedBy}）が受け持つ。
 *   一度ここに2段目（動けなかったぶんを寄りへ）を足したが、**スクロールとズームが混ざって**
 *   奥行きを繰ろうとしただけで画面ごと寄ってしまった。操作は分ける。
 *
 * @param delta ホイールの生の量（deltaY）。**1 刻み ≒ 100** として、軸の刻みに直してから足す。
 *              ラボは 0.004 を掛けていた（lab 1644 行）が、それだと刻みの細かい View で
 *              1 回転が何百段にもなる。「**1 刻み ＝ 1 段**」のほうが、並びを 1 枚ずつ繰れる。
 */
/**
 * ホイールを受ける**空間**。泡の上で回したときは、その泡がいる空間へ**外へ通す**
 * ── ③ 見えない親を通すのと同じで、受け手が見つかるまで外へ。
 *
 * ★ ラボはここで止まっていた（`LAYOUT.get(space)` が無ければ何もしない）。
 *   ラボの泡は中身を持たないので当たらなかったが、こちらは札が箱をほぼ埋めるので、
 *   **札の上で回すと何も起きない**。「重なりを1枚ずつ繰る」が札の上でできないのは、
 *   見る側の言葉と合わない。
 *
 * ★ **外に出してある**のは、回したあとに「端だったか」を見る側（ui）が、
 *   `wheelZ` と**同じ空間**を指せるようにするため。別々に出すと、札の id のまま
 *   見てしまって話が噛み合わない（実測で踏んだ）。
 */
export function wheelSpace(world: BubbleWorld, layout: Layout, spaceId: SpaceId): SpaceId {
  let space: SpaceId = world.windowOf(spaceId);
  while (space !== ROOT_SPACE && !layout.spaces.has(space)) {
    space = world.windowOf(world.bubble(space)?.space ?? ROOT_SPACE);
  }
  return space;
}

/**
 * **並びを、ホイール（＝トラックパッドの二本指）で送る。**
 *
 * > 送れる軸は 2 つだけ ──
 * >   ① **詰める並びで、中身が箱に収まっていない軸**（ふつうのスクロール。px そのまま）
 * >   ② **魚眼の軸**（繰る。1 刻み ＝ 札 1 枚）
 *
 * ★ ① 収まっているなら何も起きない ── 見えているものを動かす理由が無い
 *   （②「平行の軸では寄らない。触れたということは、もう見えている」と同じ考え）。
 *   その前提が崩れるのは**入りきらないとき**だけなので、そこにだけ道を開ける。
 * ★ ② 魚眼は「収まっているか」を訊かない ── レンズが tanh でぜんぶ箱に収めてしまうので、
 *   「収まらない」がそもそも起きない。魚眼で二本指が動かすのは**どの札が真ん中に来るか**であって、
 *   はみ出したぶんを見に行くことではない。だから**いつでも繰れる**。
 *   （前はここに「魚眼には要らない」と書いてあった。はみ出しの話としては正しかったが、
 *   繰る手だてがドラッグしか無く、二本指が死んでいた。）
 * ★ 透視（奥行きに重ねる）はここではない ── そちらのホイールは奥行きを繰る（`wheelZ`）。
 *
 * @param delta ホイールの生の量。詰める並びは**画面の px そのまま**（平行な軸なので値と px は 1:1）、
 *              魚眼は**1 回転 ≒ 100 ＝ 1 枚**に噛み砕いてから足す
 * @returns 送れないときは `null`（呼ぶ側が次の受け手へ渡す）
 */
export function wheelScroll(
  world: BubbleWorld,
  layout: Layout,
  spaceId: SpaceId,
  delta: { readonly x: number; readonly y: number },
  rules: LayoutRules,
): BubbleWorld | null {
  const space = wheelSpace(world, layout, spaceId);
  const L = layout.spaces.get(space);
  if (!L) return null;
  const pad = METRICS.PAD;
  /**
   * その軸が「**魚眼で繰れる**」か ── レンズが魚眼で、次元が刺さっていて、泡がいること。
   * 箱に収まっているかは見ない（上の註 ②）。
   */
  const turnable = (axis: PlaneAxis): boolean =>
    L.view[axis].lens === 'fisheye' && L.view[axis].dim !== 'none' && L.arr[axis].pos.size > 0;
  /**
   * 魚眼を繰る量 ── **1 刻み ＝ 札 1 枚**（`wheelZ` と同じ換算。ホイール 1 回転 ≒ 100）。
   * 刻みは View が持っている（coverflow なら札の幅の 0.756 倍）。px をそのまま足すと、
   * トラックパッドの一撫でで何十枚も飛ぶ。
   */
  const turnBy = (axis: PlaneAxis, by: number): number => (by / 100) * (L.view[axis].step || 1);
  /**
   * その軸が「詰める並びで、収まっていない」か ── **次元が刺さっているかは訊かない。**
   *
   * ★ 縦に並べた一覧で札が横にはみ出しているなら、横にも送れないと見に行けない。
   *   その向きには並びの操作がもともと無いので、送りと喧嘩しない
   *   （魚眼も同じ ── 縦の魚眼の横、横の魚眼の縦）。焦点の側の約束は `fitFocus` の (0)。
   * ★ 「そのまま置く」（透視の X・Y）は入らない ── 置き所が無い軸は動かさない。
   */
  const scrollable = (axis: PlaneAxis): boolean => {
    const A = L.view[axis];
    if (A.arrange !== 'pack' || A.lens !== 'parallel') return false;
    const bands = L.arr[axis].bands;
    if (!bands.length) return false;
    const need = Math.max(...bands.map((b) => b.end)) - Math.min(...bands.map((b) => b.start));
    // ★ 口のために空けてある所は、入る量から引く（`fitFocus` の `room2` と同じ数え方）
    return need > L.H[axis] * 2 - pad * 2 - (A.reserve ?? 0);
  };
  if (turnable('x') || turnable('y')) {
    let next = world;
    let moved = false;
    if (turnable('y') && delta.y !== 0) {
      next = withFocusAxis(next, L, 'y', L.focus.y + turnBy('y', delta.y), rules);
      moved = true;
    }
    if (turnable('x')) {
      /**
       * 横の魚眼は**横の量**で繰る。ただし横だけが魚眼なら（＝縦は繰らない）、
       * 縦の量でも繰れるようにする ── ふつうのマウスのホイールには縦の量しか無い。
       * 折り返す魚眼（縦も横も魚眼）では代用しない。縦は縦で繰るので、混ぜると二重に動く。
       *
       * ★ **縦に見切れているときも代用しない。** そのときの縦の量は「下を見に行く」
       *   （`scrollable('y')`）ためのもので、そちらに譲る ── 見切れている向きの送りが先。
       */
      const by = delta.x !== 0 ? delta.x : turnable('y') || scrollable('y') ? 0 : delta.y;
      if (by !== 0) {
        next = withFocusAxis(next, L, 'x', L.focus.x + turnBy('x', by), rules);
        moved = true;
      }
    }
    if (moved) return next;
  }
  /**
   * ★ **縦と横は別々に送る。** 二本指は斜めにも動くので、片方で打ち切らない
   *   （縦に長くて横にも見切れている一覧では、両方が同時に要る）。
   */
  let next = world;
  let moved = false;
  if (scrollable('y') && delta.y !== 0) {
    next = withFocusAxis(next, L, 'y', L.focus.y + delta.y, rules);
    moved = true;
  }
  if (scrollable('x')) {
    /**
     * 横に並べた一覧は、横の量が無ければ縦の量で送る（ふつうのマウスでも送れるように）。
     * ★ ただし**その向きに並べていない**（ただ見切れているだけの）ときは代用しない ──
     *   縦の量は縦のためのもので、横がかすめ取ると縦へ動けなくなる。
     */
    const sub = L.view.x.dim !== 'none' && !turnable('y') && !scrollable('y');
    const by = delta.x !== 0 ? delta.x : sub ? delta.y : 0;
    if (by !== 0) {
      next = withFocusAxis(next, L, 'x', L.focus.x + by, rules);
      moved = true;
    }
  }
  return moved ? next : null;
}

export function wheelZ(
  world: BubbleWorld,
  layout: Layout,
  spaceId: SpaceId,
  delta: number,
  rules: LayoutRules,
): BubbleWorld {
  const space = wheelSpace(world, layout, spaceId);
  const L = layout.spaces.get(space);
  if (!L || L.view.z.dim === 'none') return world;
  /**
   * ★ 動かすのは **軸の 1 刻みぶん**。ホイールの生の量（1 刻み ≒ 100px）を
   *   そのまま奥行きに足すと、1 回転で何百段も飛んで**一瞬でいちばん奥**へ行く。
   *   刻みは View が持っている（例: 奥行きに重ねる ＝ 0.15 ＝ 札 1 枚ぶん）。
   */
  const step = L.view.z.step || 1;
  return withFocusAxis(world, L, 'z', L.focus.z + (delta / 100) * step, rules);
}

/**
 * ズーム ＝ **画面2の寄り**。海の像を1枚の平面として見ているところを、そのまま大きく／小さくする。
 *
 * ★ **上限も下限も持たない。** 焦点（どこを見ているか）は「見ている所には泡がある」で泡の範囲に
 *   閉じるが、寄りは「どれだけ大きく見たいか」でしかないので、閉じる理由が無い。
 *   ── 画面の縁が何かの面に当たる、というのは模型の都合であって、見る側の話ではない。
 *
 * ★ **レンズ（画面1）には触らない。** 箱の半幅 `H` は動かないので、魚眼の効き方は寄っても同じ。
 *   像ごと大きくなるだけで、はみ出したぶんは画面の外へ出る。
 *
 * ★ 1 刻みの比は透視の 1 刻みと同じ（1 + K_PERSP ＝ 1.26）。奥行きを 1 段繰るのと
 *   寄りを 1 段動かすのとが同じ効き方になるので、手の感じがそろう。
 *
 * @param delta ホイールの生の量（deltaY）。**1 刻み ≒ 100**。
 *              **開く動作が拡大**（ピンチを開く・ホイールを上へ ＝ `deltaY` が負 → 大きくなる）
 *              ── どこでもそうなっているので、ここだけ逆にしない。
 */
export function zoomedBy(zoom: number, delta: number): number {
  const z = (zoom > 0 ? zoom : 1) * Math.pow(1 + METRICS.K_PERSP, -delta / 100);
  return z > 0 && Number.isFinite(z) ? z : 1;
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

/** 中身がこれより小さくはならない（px）。掴んだ角で潰しきらないための下限 */
const MIN_CONTENT = 24;

/**
 * 右下の角をドラッグする。lab.html 1163-1168 行。
 * 大きさを書いてから ⑤ pin で左上を留める（どの空間にいても同じ1つの決まり）。
 * 付け替えは起きないので ReshapeResult ではなく世界だけを返す。
 */
export function resizeBubble(world: BubbleWorld, ctx: ActContext, q: ResizeQuery): BubbleWorld {
  const b = world.bubble(q.id);
  if (!b) return world;
  /**
   * ★ 掴んでいるのは**箱の角**だが、泡が持つのは**中身の大きさ**なので、
   *   書くときに装いのぶんを引く（`chrome.ts`）。下限も中身で見る
   *   ── 装いの厚みは泡ごとに違うので、箱で下限を決めると泡によって中身が消える。
   */
  const c = chromeOf(world, q.id, ctx.chrome);
  const box = {
    w: Math.max(MIN_CONTENT + c.left + c.right, q.size0.w + q.by.x / q.scale),
    h: Math.max(MIN_CONTENT + c.top + c.bottom, q.size0.h + q.by.y / q.scale),
  };
  const size = { w: box.w - (c.left + c.right), h: box.h - (c.top + c.bottom) };
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
