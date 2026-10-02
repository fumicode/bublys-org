/**
 * ③ くっつける ── **掴んでいる指**が相手の縁に寄っているか。
 *
 * > 見るのは、触っている所。**泡の縁どうしの近さではない。**
 *
 * 前は縁どうしで測っていたので、**泡が大きいほど遠くまで吸い付いた**
 * ── 大きい泡を動かすと、通り道の泡に次々くっついてしまう。
 * ここで見張るのは、そうならないことと、指で狙った所にはちゃんとくっつくこと。
 */
import { snapCandidateAt, type DropQuery, type DropSlot } from './drop.js';
import { resolveWorld } from './resolve.js';
import { Bubble } from './bubble.js';
import { BubbleWorld } from './world.js';
import { emptyWorld } from './world.js';
import { presetView } from './view.js';
import { METRICS, type Rect } from './types.js';

const VIEWPORT = { w: 1200, h: 800 };

/** 自由に置く空間に、四角を 2 つ置いた世界 */
const scene = (): BubbleWorld =>
  emptyWorld(presetView('free'))
    .add(Bubble.create({ id: 'target', title: '相手', w: 200, h: 120, free: { x: 0, y: 0 } }))
    .add(Bubble.create({ id: 'grabbed', title: '掴んだの', w: 600, h: 400, free: { x: 500, y: 0 } }));

/** 画面で見えている矩形を、こちらで決め打って渡す（ui の答えの代わり） */
const query = (
  world: BubbleWorld,
  pointer: { x: number; y: number },
  rects: Record<string, Rect>,
): DropQuery => ({
  layout: resolveWorld(world, VIEWPORT),
  screen: new Map(Object.entries(rects)),
  pointer,
  hitSpace: 'root',
  grabbed: { id: 'grabbed', space: 'root', rect: rects.grabbed, skip: new Set(['grabbed']) },
});

const SLOT: DropSlot = { space: 'root', out: false, snap: null, order: null, cell: {}, occupants: [] };

/** 相手は (100,100)-(300,220) に居るとする */
const TARGET: Rect = { x: 100, y: 100, w: 200, h: 120 };

describe('③ くっつく相手は、指で決まる', () => {
  it('指が相手の左の縁に寄れば、くっつく', () => {
    const w = scene();
    // 掴んだ泡は右のほうに居る。指だけが相手の左の縁のそばにある
    const q = query(w, { x: 100 - 10, y: 160 }, { grabbed: { x: 600, y: 100, w: 600, h: 400 }, target: TARGET });
    const snap = snapCandidateAt(w, q, SLOT);
    expect(snap?.target).toBe('target');
    expect(snap?.axis).toBe('x');
    expect(snap?.after).toBe(false);
  });

  it('指が相手の下の縁に寄れば、その縁でくっつく', () => {
    const w = scene();
    const q = query(w, { x: 200, y: 220 + 10 }, { grabbed: { x: 600, y: 600, w: 600, h: 400 }, target: TARGET });
    const snap = snapCandidateAt(w, q, SLOT);
    expect(snap?.axis).toBe('y');
    expect(snap?.after).toBe(true);
  });

  it('**掴んだ泡の縁が相手に触れていても、指が遠ければくっつかない**', () => {
    const w = scene();
    // 大きい泡の左の縁が相手の右の縁にぴったり付いている。でも指は泡の反対の端
    const q = query(
      w,
      { x: 800, y: 160 },
      { grabbed: { x: 300, y: 100, w: 600, h: 400 }, target: TARGET },
    );
    expect(snapCandidateAt(w, q, SLOT)).toBeNull();
  });

  it('指が近くても、相手の幅から外れていればくっつかない（斜め上を通っただけ）', () => {
    const w = scene();
    // x は相手の左の縁のそばだが、y が相手よりずっと上
    const q = query(w, { x: 95, y: 0 }, { grabbed: { x: 0, y: -400, w: 600, h: 400 }, target: TARGET });
    expect(snapCandidateAt(w, q, SLOT)).toBeNull();
  });

  it('近さは指から縁までで測る（泡の大きさは関わらない）', () => {
    const w = scene();
    const near = query(w, { x: 100 - 5, y: 160 }, { grabbed: { x: 600, y: 100, w: 600, h: 400 }, target: TARGET });
    expect(snapCandidateAt(w, near, SLOT)?.dist).toBe(5);
  });

  it('決めた距離より遠ければ、くっつかない', () => {
    const w = scene();
    const far = query(
      w,
      { x: 100 - (METRICS.SNAP_EDGE + 1), y: 160 },
      { grabbed: { x: 600, y: 100, w: 600, h: 400 }, target: TARGET },
    );
    expect(snapCandidateAt(w, far, SLOT)).toBeNull();
  });
});
