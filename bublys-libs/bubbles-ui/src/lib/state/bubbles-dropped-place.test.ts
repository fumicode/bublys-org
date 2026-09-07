import { configureStore } from '@reduxjs/toolkit';
import bubblesReducer, {
  addBubble,
  popChildInProcess,
  selectBubble,
  ROOT_UNIVERSE_ID,
  type BubbleStateSlice,
} from './bubbles-slice.js';
import { bubblesListener } from './bubbles-listener.js';
import { createBubble } from '../Bubble.domain.js';
import { CoordinateSystem } from '@bublys-org/bubbles-ui-util';

/**
 * dropped-place の位置決めを、実際の listener を動かして確かめる。
 *
 * 見たいのは「落とした点（universe 座標）が、バブルの position（surface レイヤーの
 * layer-local 座標）に正しく直っているか」。この2つの座標系の取り違えは画面を見るまで
 * 気づけず、しかも surfaceLeftTop が 0 のときだけ偶然一致してしまうので、
 * 0 でない surfaceLeftTop で試す。
 */
const SURFACE_LEFT_TOP = { x: 100, y: 60 };

const makeState = (): BubbleStateSlice => ({
  universes: {
    [ROOT_UNIVERSE_ID]: {
      bubbles: {},
      process: { layers: [] },
      bubbleRelations: [],
      globalCoordinateSystem: CoordinateSystem.GLOBAL.toData(),
      surfaceLeftTop: SURFACE_LEFT_TOP,
    },
  },
  renderCount: 0,
  animatingBubbleIds: [],
});

const makeStore = () =>
  configureStore({
    reducer: { bubbleState: bubblesReducer },
    preloadedState: { bubbleState: makeState() },
    middleware: (getDefault) => getDefault().prepend(bubblesListener.middleware),
  });

/** listener の effect が走り切るのを待つ */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('dropped-place（落とされた場所に開く）', () => {
  it('落とした点が、そのままバブルの位置になる', async () => {
    const store = makeStore();
    const bubble = createBubble('users/1');
    store.dispatch(addBubble(bubble.toJSON()));

    const droppedAt = { x: 640, y: 480 }; // universe 座標
    store.dispatch(
      popChildInProcess({ bubbleId: bubble.id, openingPosition: 'dropped-place', droppedAt })
    );
    await settle();

    const placed = selectBubble(store.getState(), { id: bubble.id });
    // surface レイヤー(index=0)の layer-local 座標 = universe 座標 - surfaceLeftTop
    expect(placed.position).toEqual({
      x: droppedAt.x - SURFACE_LEFT_TOP.x,
      y: droppedAt.y - SURFACE_LEFT_TOP.y,
    });
  });

  it('opener（relation）が無くても位置が決まる — 自分で置いたバブルには opener が居ない', async () => {
    const store = makeStore();
    const bubble = createBubble('users/2');
    store.dispatch(addBubble(bubble.toJSON()));
    // relateBubbles を一切呼ばない = relation なし

    store.dispatch(
      popChildInProcess({
        bubbleId: bubble.id,
        openingPosition: 'dropped-place',
        droppedAt: { x: 300, y: 200 },
      })
    );
    await settle();

    expect(selectBubble(store.getState(), { id: bubble.id }).position).toEqual({
      x: 200,
      y: 140,
    });
  });

  it('droppedAt が無ければ動かさない（黙って原点へ飛ばさない）', async () => {
    const store = makeStore();
    const bubble = createBubble('users/3');
    store.dispatch(addBubble(bubble.toJSON()));
    const before = selectBubble(store.getState(), { id: bubble.id }).position;

    store.dispatch(popChildInProcess({ bubbleId: bubble.id, openingPosition: 'dropped-place' }));
    await settle();

    expect(selectBubble(store.getState(), { id: bubble.id }).position).toEqual(before);
  });

  it('他の位置指定は dropped-place の分岐に入らない（relation 無しでは何も起きない）', async () => {
    const store = makeStore();
    const bubble = createBubble('users/4');
    store.dispatch(addBubble(bubble.toJSON()));
    const before = selectBubble(store.getState(), { id: bubble.id }).position;

    store.dispatch(
      popChildInProcess({
        bubbleId: bubble.id,
        openingPosition: 'bubble-side-right',
        // droppedAt を渡しても、dropped-place でなければ無視される
        droppedAt: { x: 999, y: 999 },
      })
    );
    await settle();

    expect(selectBubble(store.getState(), { id: bubble.id }).position).toEqual(before);
  });
});
