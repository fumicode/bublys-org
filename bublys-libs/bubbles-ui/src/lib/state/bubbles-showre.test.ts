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
  makeSelectShowreBubbles,
  makeSelectShowreSideOf,
  ROOT_UNIVERSE_ID,
} from './bubbles-slice.js';
import { bubblesListener } from './bubbles-listener.js';
import { createBubble } from '../Bubble.domain.js';

/**
 * 岸（Showre）のルール「バブルは浮いているか、岸に着いているかのどちらか」を
 * slice の上で確かめる。着岸したら layers から消え、引き剥がしたら layers に戻る。
 */
const makeStore = () =>
  configureStore({
    reducer: { bubbleState: bubblesReducer },
    middleware: (getDefault) => getDefault().prepend(bubblesListener.middleware),
  });

/** listener の effect が走り切るのを待つ */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const selectShowreBubbles = makeSelectShowreBubbles(ROOT_UNIVERSE_ID);
const selectShowreSideOf = makeSelectShowreSideOf(ROOT_UNIVERSE_ID);

const openFloating = (store: ReturnType<typeof makeStore>, url: string) => {
  const b = createBubble(url, { x: 10, y: 20 });
  store.dispatch(addBubble(b.toJSON()));
  store.dispatch(popChildInProcess({ bubbleId: b.id }));
  return b;
};

describe('岸（Showre）', () => {
  it('着岸すると layers から抜け、岸の並びに入る', () => {
    const store = makeStore();
    const a = openFloating(store, 'launchers/a');
    expect(selectSurfaceBubbleIds(store.getState())).toContain(a.id);

    store.dispatch(dockToShowre({ bubbleId: a.id, side: 'left' }));

    const state = store.getState();
    expect(selectSurfaceBubbleIds(state)).not.toContain(a.id);
    expect(selectShowreBubbles(state).left.map((b) => b.id)).toEqual([a.id]);
    expect(selectShowreSideOf(state)(a.id)).toBe('left');
  });

  it('着岸中も bubbles には残り、配置（世界線に乗る形）にも含まれる', () => {
    const store = makeStore();
    const a = openFloating(store, 'launchers/a');
    store.dispatch(dockToShowre({ bubbleId: a.id, side: 'bottom' }));

    const arrangement = selectBubbleArrangement(store.getState());
    expect(arrangement.bubbles[a.id]).toBeDefined();
    expect(arrangement.showres?.bottom).toEqual([a.id]);
    // layers には居ない
    expect(arrangement.process.layers.flat()).not.toContain(a.id);
  });

  it('引き剥がすと岸から消え、海の一番手前に戻る。落とした点（universe 座標）があればそこに置く', async () => {
    const store = makeStore();
    const a = openFloating(store, 'launchers/a');
    store.dispatch(dockToShowre({ bubbleId: a.id, side: 'right' }));
    store.dispatch(undockFromShowre({ bubbleId: a.id, droppedAt: { x: 300, y: 200 } }));
    await settle();

    const state = store.getState();
    expect(selectShowreSideOf(state)(a.id)).toBeUndefined();
    expect(selectSurfaceBubbleIds(state)).toContain(a.id);
    // surface レイヤー(index=0)の layer-local 座標 = universe 座標 - surfaceLeftTop（既定 100,100）
    expect(selectBubbleArrangement(state).bubbles[a.id].position).toEqual({ x: 200, y: 100 });
  });

  it('落とした点が無ければ位置は動かさない', async () => {
    const store = makeStore();
    const a = openFloating(store, 'launchers/a');
    store.dispatch(dockToShowre({ bubbleId: a.id, side: 'right' }));
    store.dispatch(undockFromShowre({ bubbleId: a.id }));
    await settle();
    expect(selectBubbleArrangement(store.getState()).bubbles[a.id].position).toEqual({ x: 10, y: 20 });
  });

  it('岸に居ないバブルを引き剥がしても何も起きない', () => {
    const store = makeStore();
    const a = openFloating(store, 'launchers/a');
    const before = store.getState().bubbleState.universes[ROOT_UNIVERSE_ID];
    store.dispatch(undockFromShowre({ bubbleId: a.id }));
    expect(store.getState().bubbleState.universes[ROOT_UNIVERSE_ID]).toBe(before);
  });

  it('別の辺に着け直すと元の辺からは外れる', () => {
    const store = makeStore();
    const a = openFloating(store, 'launchers/a');
    store.dispatch(dockToShowre({ bubbleId: a.id, side: 'left' }));
    store.dispatch(dockToShowre({ bubbleId: a.id, side: 'top', index: 0 }));

    const showres = selectShowreBubbles(store.getState());
    expect(showres.left).toEqual([]);
    expect(showres.top.map((b) => b.id)).toEqual([a.id]);
  });

  it('removeBubble は岸からも外す', () => {
    const store = makeStore();
    const a = openFloating(store, 'launchers/a');
    store.dispatch(dockToShowre({ bubbleId: a.id, side: 'left' }));
    store.dispatch(removeBubble(a.id));

    expect(selectShowreBubbles(store.getState()).left).toEqual([]);
  });

  it('showres を持たない古い配置を差し戻しても壊れない（空の岸として扱う）', () => {
    const store = makeStore();
    const a = createBubble('users');
    store.dispatch(
      replaceBubbleArrangement({
        bubbles: { [a.id]: a.toJSON() },
        bubbleRelations: [],
        process: { layers: [[a.id]] },
        // showres 無し
      }),
    );

    const state = store.getState();
    expect(selectSurfaceBubbleIds(state)).toEqual([a.id]);
    expect(selectShowreBubbles(state)).toEqual({ top: [], bottom: [], left: [], right: [] });
  });
});
