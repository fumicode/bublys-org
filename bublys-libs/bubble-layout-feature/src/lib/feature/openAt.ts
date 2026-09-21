/**
 * 開く ── 「この空間に、この泡の隣に、新しい泡を置く」。
 *
 * ★ domain に入るのは**この動詞だけ**。`ObjectView` も url もここから先へは行かない（DECISIONS.md）。
 *
 * ★ `openingPosition` は無い。**どこに置くかは親の View が決める**（規則①④）。
 *   旧 `bubbles-ui` の `openingPosition` は3役を兼ねていた ── どこに置くか／開いてよいか／膜を出すか。
 *   ここが持つのは1つめだけで、しかも「隣に置く」しか言わない。
 *
 * ★ 横に開くときは **X の魚眼も一緒に点ける**：
 *   > 「ただ兄弟にすると、同じ大きさで表示されてしまうので、もとの bubble-ui の良さが損なわれてしまう。
 *   >  よって、横に開く場合には X 方向の魚眼レンズも同時にオンにすべきだね」
 *   次元は変えない（自由X のまま）。**レンズだけ**を魚眼にする ── これだけで
 *   「開いたほうが大きく、元のリストは小さく」が出る。
 */
import {
  Bubble, METRICS, actContext, applySnap, focusOn, renumber, resolveWorld, withAxis,
} from '@bublys-org/bubble-layout';
import type { BubbleId, BubbleWorld, LayoutRules, Viewport } from '@bublys-org/bubble-layout';

/** 開き方。いまは「隣に開く」だけ。ポップアップは未実装（DECISIONS.md の世界線スナップで戻る枝） */
export type OpenAs = 'beside';

export interface OpenAtInput {
  readonly world: BubbleWorld;
  readonly viewport: Viewport;
  /** 開く元の泡。null なら外の空間に置く */
  readonly openerId: BubbleId | null;
  readonly newId: BubbleId;
  readonly title: string;
  readonly size?: { readonly w: number; readonly h: number };
  readonly hue?: number;
  readonly as?: OpenAs;
  readonly rules?: Partial<LayoutRules>;
  /**
   * ★ **同じ種類の泡（兄弟）を続けて開いたとき、その隣に並べる相手。**
   *
   * これが無いと、一覧の項目を2つダブルクリックしたとき、どちらも
   * 「一覧の右隣」という**同じ場所に重なって**開く（元の泡が同じなので当たり前）。
   * 旧 `bubbles-ui` は `join-sibling` でこれを避けていた。
   *
   * 渡すと、**共通の見えない親（並び）を作って、その中に並べる**（規則③ の「くっつける」そのもの）。
   * 1枚目は見えない親が生まれ（`born`）、2枚目からはその並びに加わる（`join`）。
   */
  readonly joinWith?: BubbleId | null;
}

export interface OpenAtResult {
  readonly world: BubbleWorld;
  readonly id: BubbleId;
}

const DEFAULT_SIZE = { w: 320, h: 240 };
/**
 * 隣に開くときの、元の泡との隙間。
 *
 * ★ **くっつく距離（METRICS.SNAP_EDGE ＝ 24px）より広くないといけない。**
 *   同じ 24 にしていたら、開いた直後の一覧と詳細が「いきなりくっつく距離」にいて、
 *   詳細をちょっと動かしただけで**見えない親が生まれて並びになり**、
 *   せっかくの「詳細が手前・一覧は小さく」が消えた（v6 の検証で踏んだ）。
 *   画面での隙間は倍率でさらに縮むので、2倍とっておく。
 */
const BESIDE_GAP = METRICS.SNAP_EDGE * 2;

export function openAt(input: OpenAtInput): OpenAtResult {
  const { world, viewport, openerId, newId, title } = input;
  const size = input.size ?? DEFAULT_SIZE;
  const opener = openerId === null ? null : world.bubble(openerId);
  const space = opener ? opener.space : 'root';

  // 兄弟として、元の泡の右隣に
  const siblings = world.kidsOf(space);
  const at = opener ? siblings.findIndex((b) => b.id === opener.id) : siblings.length - 1;
  const free = opener
    ? {
        x: opener.state.free.x + opener.state.size.w / 2 + BESIDE_GAP + size.w / 2,
        y: opener.state.free.y,
        z: opener.state.free.z,
      }
    : { x: 0, y: 0, z: 0 };

  let w = world.add(
    Bubble.create({
      id: newId,
      title,
      hue: input.hue ?? hueOf(newId),
      w: Math.max(80, size.w),
      h: Math.max(METRICS.HEADER + 10, size.h),
      parent: space === 'root' ? null : space,
      order: at + 1,
      free,
    }),
  );
  // 順序を 0.. に振り直す（間に挟んだので、後ろが1つずつ下がる）
  const after = w
    .kidsOf(space)
    .slice()
    .sort((p, q) => (p.id === newId ? at + 0.5 : p.state.order) - (q.id === newId ? at + 0.5 : q.state.order))
    .map((b) => b.id);
  w = renumber(w, after);

  /**
   * ★ 同じ種類の兄弟が既にいるなら、**共通の見えない親（並び）を作って、その中に並べる**。
   *
   * これが無いと、一覧の項目を2つ開いたとき、どちらも「一覧の右隣」という
   * 同じ場所に重なる（元の泡が同じなので、行き先も同じになる）。
   * 使うのは規則③ の「くっつける」そのもの ── 新しい仕組みは要らない。
   *   1枚目の相手には見えない親が生まれ（born）、2枚目からはその並びに加わる（join）。
   */
  const mate = input.joinWith ? w.bubble(input.joinWith) : null;
  if (mate && mate.id !== newId) {
    const row = w.rowOf(mate.id);
    const ctx = actContext(
      viewport,
      new Map(
        resolveWorld(world, viewport, input.rules).order.map((p) => [
          p.id,
          { x: p.x, y: p.y, w: p.box.w, h: p.box.h, scale: p.scale },
        ]),
      ),
      input.rules,
    );
    w = applySnap(w, ctx, newId, {
      kind: row ? 'join' : 'born',
      target: mate.id,
      axis: 'x',
      after: true,   // 続けて開いたものは、前に開いたものの右に
      dist: 0,
    }).world;
  }

  // ★ 横に開いたら X の魚眼を点ける。次元は変えない（自由X のまま）
  //   ただし **元の泡があるときだけ** ── 最初の1つを置くのに、小さくする相手はいない
  if (opener && (input.as ?? 'beside') === 'beside') {
    const view = w.ownViewOf(space);
    if (!view || view.x.lens !== 'fisheye') w = withAxis(w, space, 'x', { lens: 'fisheye' });
  }

  // ② 開いたら、そこへ視点が寄る（泡の値は1つも書かない）
  w = focusOn(w, resolveWorld(w, viewport, input.rules), newId, input.rules);
  return { world: w, id: newId };
}

/** 色は id から作る（同じ url なら同じ色になるので、開き直しても色が変わらない） */
export function hueOf(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}
