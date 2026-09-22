import { configureStore } from '@reduxjs/toolkit';
import bubblesReducer, {
  addBubble,
  popChildInProcess,
  removeBubble,
  dockToShowre,
  undockFromShowre,
  replaceBubbleArrangement,
  selectBubbleArrangement,
  selectSurfaceBubbleIds,
  makeSelectDockedBubbles,
  makeSelectDockEdgesOf,
  ROOT_UNIVERSE_ID,
} from './bubbles-slice.js';
import { bubblesListener } from './bubbles-listener.js';
import { createBubble } from '../Bubble.domain.js';
import type { DockState } from '../showre/Showre.domain.js';

/**
 * 岸（Showre）のルールを slice の上で確かめる。
 * 貼り付いたら layers から消え、剥がしたら layers に戻る。大きさは貼ったときのもの。
 */
const makeStore = () =>
  configureStore({
    reducer: { bubbleState: bubblesReducer },
    middleware: (getDefault) => getDefault().prepend(bubblesListener.middleware),
  });

/** listener の effect が走り切るのを待つ */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const selectDocked = makeSelectDockedBubbles(ROOT_UNIVERSE_ID);
const selectEdgesOf = makeSelectDockEdgesOf(ROOT_UNIVERSE_ID);

const dock = (edges: DockState['edges'], at = { x: 0, y: 120 }): DockState => ({ edges, at });
const SIZE = { width: 200, height: 150 };

const openFloating = (store: ReturnType<typeof makeStore>, url: string) => {
  const b = createBubble(url, { x: 10, y: 20 });
  store.dispatch(addBubble(b.toJSON()));
  store.dispatch(popChildInProcess({ bubbleId: b.id }));
  return b;
};

describe('岸（Showre）', () => {
  it('貼り付けると layers から抜け、留め方が記録される', () => {
    const store = makeStore();
    const a = openFloating(store, 'launchers/a');
    expect(selectSurfaceBubbleIds(store.getState())).toContain(a.id);

    store.dispatch(dockToShowre({ bubbleId: a.id, dock: dock(['left']), size: SIZE }));

    const state = store.getState();
    expect(selectSurfaceBubbleIds(state)).not.toContain(a.id);
    expect(selectDocked(state).map((d) => d.bubble.id)).toEqual([a.id]);
    expect(selectEdgesOf(state)(a.id)).toEqual(['left']);
  });

  it('貼り付いたときの大きさが、そのバブルの大きさになる（縮んだらそのまま持つ）', () => {
    const store = makeStore();
    const a = openFloating(store, 'launchers/a');
    store.dispatch(dockToShowre({ bubbleId: a.id, dock: dock(['left'], { x: 0, y: 0 }), size: { width: 200, height: 90 } }));
    expect(selectBubbleArrangement(store.getState()).bubbles[a.id].size).toEqual({ width: 200, height: 90 });
  });

  it('貼り付いていても bubbles には残り、配置（世界線に乗る形）にも含まれる', () => {
    const store = makeStore();
    const a = openFloating(store, 'launchers/a');
    store.dispatch(dockToShowre({ bubbleId: a.id, dock: dock(['bottom']), size: SIZE }));

    const arrangement = selectBubbleArrangement(store.getState());
    expect(arrangement.bubbles[a.id]).toBeDefined();
    expect(arrangement.docks?.[a.id].edges).toEqual(['bottom']);
    // layers には居ない
    expect(arrangement.process.layers.flat()).not.toContain(a.id);
  });

  it('剥がすと岸から消え、海の一番手前に戻る。落とした点（universe 座標）があればそこに置く', async () => {
    const store = makeStore();
    const a = openFloating(store, 'launchers/a');
    store.dispatch(dockToShowre({ bubbleId: a.id, dock: dock(['right']), size: SIZE }));
    store.dispatch(undockFromShowre({ bubbleId: a.id, droppedAt: { x: 300, y: 200 } }));
    await settle();

    const state = store.getState();
    expect(selectEdgesOf(state)(a.id)).toEqual([]);
    expect(selectSurfaceBubbleIds(state)).toContain(a.id);
    // surface レイヤー(index=0)の layer-local 座標 = universe 座標 - surfaceLeftTop（既定 100,100）
    expect(selectBubbleArrangement(state).bubbles[a.id].position).toEqual({ x: 200, y: 100 });
  });

  it('貼り付いていないバブルを剥がしても何も起きない', () => {
    const store = makeStore();
    const a = openFloating(store, 'launchers/a');
    const before = store.getState().bubbleState.universes[ROOT_UNIVERSE_ID];
    store.dispatch(undockFromShowre({ bubbleId: a.id }));
    expect(store.getState().bubbleState.universes[ROOT_UNIVERSE_ID]).toBe(before);
  });

  it('別の辺に貼り直すと、留め方が置き換わる（並びも順序も無い）', () => {
    const store = makeStore();
    const a = openFloating(store, 'launchers/a');
    store.dispatch(dockToShowre({ bubbleId: a.id, dock: dock(['left']), size: SIZE }));
    store.dispatch(dockToShowre({ bubbleId: a.id, dock: dock(['top'], { x: 300, y: 0 }), size: SIZE }));

    expect(selectEdgesOf(store.getState())(a.id)).toEqual(['top']);
    expect(selectDocked(store.getState())).toHaveLength(1);
  });

  it('removeBubble は岸からも外す', () => {
    const store = makeStore();
    const a = openFloating(store, 'launchers/a');
    store.dispatch(dockToShowre({ bubbleId: a.id, dock: dock(['left']), size: SIZE }));
    store.dispatch(removeBubble(a.id));

    expect(selectDocked(store.getState())).toEqual([]);
  });

  it('docks を持たない古い配置を差し戻しても壊れない（誰も貼り付いていない扱い）', () => {
    const store = makeStore();
    const a = createBubble('users');
    store.dispatch(
      replaceBubbleArrangement({
        bubbles: { [a.id]: a.toJSON() },
        bubbleRelations: [],
        process: { layers: [[a.id]] },
        // docks 無し
      }),
    );

    const state = store.getState();
    expect(selectSurfaceBubbleIds(state)).toEqual([a.id]);
    expect(selectDocked(state)).toEqual([]);
  });
});
