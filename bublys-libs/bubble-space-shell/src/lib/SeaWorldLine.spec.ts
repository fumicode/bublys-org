/**
 * **世界線を映すものは、世界線に入らない。**（`WorldLineOutside` の註）
 *
 * ここで押さえるのは 3 つ:
 *   1. 記録する姿から外のものが抜けていること（海からも岸からも）
 *   2. 外のものだけが動いた姿は、**抜いたあと見分けがつかない** ＝ 節にならない
 *   3. 節へ移っても、外のものは**いまのまま**残ること（消えない）
 */
import { Bubble, BubbleWorld, emptyWorld, presetView } from '@bublys-org/bubble-layout';
import type { SeaSnapshot, OpenedPlain } from '@bublys-org/bubble-layout-feature';
import type { Docked } from './ShowreLayer.js';
import { withoutOutside, withOutside, shoreWithout } from './SeaWorldLine.js';

const OUTSIDE = ['world-lines'] as const;

const opened = (url: string): OpenedPlain => ({
  url, type: 'bubble', openerId: null, originId: null, originSpot: null, at: 0,
});

/** 泡を並べた海の姿を1つ作る（`at` はその泡の置き場所） */
const snapshotOf = (
  bubbles: readonly { id: string; url: string; at?: { x: number; y: number } }[],
  seq = 10,
  /** その姿のときの、海の焦点 */
  focus?: { x: number; y: number },
): SeaSnapshot => {
  let world = emptyWorld(presetView('free'));
  for (const b of bubbles)
    world = world.add(Bubble.create({ id: b.id, title: b.id, w: 200, h: 100, free: b.at ?? { x: 0, y: 0 } }));
  if (focus) world = world.withFocus('root', focus);
  return {
    world: world.toPlain(),
    urls: bubbles.map((b) => [b.id, opened(b.url)] as const),
    seq,
  };
};

const ids = (snap: SeaSnapshot) => snap.world.bubbles.map((b) => b.id).sort();

describe('世界線に入らないもの', () => {
  it('記録する姿から、外のものが抜ける（泡も、その url の覚えも）', () => {
    const now = snapshotOf([
      { id: 'b1', url: 'memos' },
      { id: 'b2', url: 'world-lines' },
    ]);
    const kept = withoutOutside(now, OUTSIDE);
    expect(ids(kept)).toEqual(['b1']);
    expect(kept.urls.map(([id]) => id)).toEqual(['b1']);
    // 残るものは 1px も変えない（同じ姿がそのまま入っている）
    expect(kept.world.bubbles.find((b) => b.id === 'b1')).toEqual(
      now.world.bubbles.find((b) => b.id === 'b1'),
    );
    expect(kept.seq).toBe(now.seq);
    // 外すものが居なければ、姿はそのもの（作り直さない）
    expect(withoutOutside(kept, OUTSIDE)).toBe(kept);
    expect(withoutOutside(now, [])).toBe(now);
  });

  it('岸からも抜ける（貼った・剥がしたも姿の一部なので）', () => {
    const dock = (url: string): Docked => ({
      key: `${url}#dock`, url, dock: { edges: ['top'], at: { x: 0, y: 0 } },
      size: { width: 48, height: 48 },
    });
    const shore = [dock('launchers/main'), dock('world-lines')];
    expect(shoreWithout(shore, OUTSIDE).map((d) => d.url)).toEqual(['launchers/main']);
    expect(shoreWithout(shore, [])).toBe(shore);
  });

  /**
   * ★ ここが肝 ── **姿に入らないのだから、動かしても姿は変わらない。**
   *   「これは節にしない」という分岐を書かなくても、印（`sealOf`）が同じになるので
   *   記録の側が黙る（`useSeaWorldLine` の註）。
   */
  it('外のものだけが動いた姿は、抜いたあと見分けがつかない ＝ 節にならない', () => {
    const before = snapshotOf([
      { id: 'b1', url: 'memos', at: { x: 10, y: 20 } },
      { id: 'b2', url: 'world-lines', at: { x: 0, y: 0 } },
    ]);
    // 世界線の泡だけを動かし、あとから開いた泡の番号も進んだ
    const after = snapshotOf([
      { id: 'b1', url: 'memos', at: { x: 10, y: 20 } },
      { id: 'b2', url: 'world-lines', at: { x: 400, y: 300 } },
    ], 11);
    expect(withoutOutside(after, OUTSIDE).world).toEqual(withoutOutside(before, OUTSIDE).world);
    expect(withoutOutside(after, OUTSIDE).urls).toEqual(withoutOutside(before, OUTSIDE).urls);
    // ただし、海の泡が動けばちゃんと変わる（黙るのは外のものだけ）
    const moved = snapshotOf([
      { id: 'b1', url: 'memos', at: { x: 11, y: 20 } },
      { id: 'b2', url: 'world-lines', at: { x: 0, y: 0 } },
    ]);
    expect(withoutOutside(moved, OUTSIDE).world).not.toEqual(withoutOutside(before, OUTSIDE).world);
  });

  it('節へ移っても、外のものはいまのまま残る（消えない）', () => {
    // 古い節の姿（世界線の泡を開く前なので、そもそも入っていない）
    const there = snapshotOf([{ id: 'b1', url: 'memos', at: { x: 10, y: 20 } }], 5);
    // いまの海（世界線の泡を開いて、右下へ動かしてある）
    const now = snapshotOf([
      { id: 'b1', url: 'memos', at: { x: 99, y: 99 } },
      { id: 'b9', url: 'world-lines', at: { x: 400, y: 300 } },
    ], 12);
    const next = withOutside(there, now, OUTSIDE);
    // 海の泡は節の姿どおりに戻り、世界線の泡はいまのまま居る
    expect(ids(next)).toEqual(['b1', 'b9']);
    expect(next.world.bubbles.find((b) => b.id === 'b1')?.free).toEqual({ x: 10, y: 20, z: 0 });
    expect(next.world.bubbles.find((b) => b.id === 'b9')?.free).toEqual({ x: 400, y: 300, z: 0 });
    expect(next.urls.map(([id]) => id).sort()).toEqual(['b1', 'b9']);
    // ★ 番号は進めたまま ── 戻した先で開く泡が、いま居る泡と id をぶつけないように
    expect(next.seq).toBe(12);
    // 中身ごと持ち越す
    const withKid = BubbleWorld.fromPlain(now.world).add(
      Bubble.create({ id: 'b9-kid', title: 'kid', w: 10, h: 10, parent: 'b9' }),
    );
    const nested = withOutside(there, { ...now, world: withKid.toPlain() }, OUTSIDE);
    expect(ids(nested)).toEqual(['b1', 'b9', 'b9-kid']);
    // 外すものが居なければ、節の姿そのもの
    expect(withOutside(there, now, [])).toBe(there);
    expect(withOutside(there, there, OUTSIDE)).toBe(there);
  });

  /**
   * ★ 泡が写る所は「置き場所 − 焦点」で決まる。焦点が動いたぶんだけ置き場所も動かせば、
   *   差が変わらない ＝ **レンズを通しても画面の同じ点**に残る。
   *   持ち越さないと、移った先で遠くへ飛んで潰れ、「小さすぎる泡は描かない」で消えていた。
   */
  it('移っても、外のものは画面の同じ所に残る（焦点が動いたぶん一緒に動く）', () => {
    const there = snapshotOf([{ id: 'b1', url: 'memos' }], 5, { x: -200, y: 60 });
    const now = snapshotOf(
      [{ id: 'b1', url: 'memos' }, { id: 'b9', url: 'world-lines', at: { x: 400, y: 300 } }],
      12,
      { x: 100, y: -40 },
    );
    const next = withOutside(there, now, OUTSIDE);
    const free = next.world.bubbles.find((b) => b.id === 'b9')?.free;
    // 焦点は 300 左・100 下へ動いたので、置き場所も同じだけ動く
    expect(free).toEqual({ x: 400 - 300, y: 300 + 100, z: 0 });
    // ★ 肝：焦点との差は 1px も変わらない（＝ 写る所が変わらない）
    expect(free!.x - there.world.root.focus.x).toBe(400 - now.world.root.focus.x);
    expect(free!.y - there.world.root.focus.y).toBe(300 - now.world.root.focus.y);
    // 中身（親を持つ泡）は親の中の席なので触らない
    const withKid = BubbleWorld.fromPlain(now.world).add(
      Bubble.create({ id: 'b9-kid', title: 'kid', w: 10, h: 10, parent: 'b9', free: { x: 7, y: 8 } }),
    );
    const nested = withOutside(there, { ...now, world: withKid.toPlain() }, OUTSIDE);
    expect(nested.world.bubbles.find((b) => b.id === 'b9-kid')?.free).toEqual({ x: 7, y: 8, z: 0 });
  });
});
