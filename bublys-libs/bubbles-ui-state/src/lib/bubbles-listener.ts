import { createListenerMiddleware } from '@reduxjs/toolkit';
import {
  joinSiblingInProcess,
  renderBubble,
  selectBubble,
  selectSurfaceBubbles,
  updateBubble,
} from './bubbles-slice.js';

// Listener ミドルウェアを定義
export const bubblesListener = createListenerMiddleware();

// joinSiblingInProcess 発火後、renderBubble の完了を待ち moveTo → updateBubble を順次実行
bubblesListener.startListening({
  type: joinSiblingInProcess.type,
  effect: async (action, listenerApi) => {
    const id = (action as ReturnType<typeof joinSiblingInProcess>).payload;

    // renderBubble が dispatch され、かつ payload.id が id と一致するのを待つ
    await listenerApi.take(
      (otherAction): otherAction is ReturnType<typeof renderBubble> => {
        const oa = otherAction as ReturnType<typeof renderBubble>;
        return oa.type === renderBubble.type && oa.payload.id === id;
      }
    );

    // 現在の state から対象バブルを取得
    const state = listenerApi.getState() as any;
    const surfaceBubbles = selectSurfaceBubbles(state);
    const otherSiblingBubbles = surfaceBubbles.filter(b => b.id !== id);

    if (!otherSiblingBubbles.length) {
      return;
    }
    //全ての幅を足す
    // const totalWidth = otherSiblingBubbles.reduce((sum, b) => sum + (b.renderedRect?.width || 0), 0);
    // const thisBubble = selectBubble(state, { id });
    // const moved = thisBubble.moveTo({ x: totalWidth, y: 0 });



    const thisBubble = selectBubble(state, { id });

    //他のバブルの領域を合体mergeする
    //const merged = otherSiblingBubbles.map(b => b.renderedRect).filter((b): b is SmartRect=> !!b).reduce((acc, b) => acc.merge(b));

    const brotherBubble = otherSiblingBubbles[otherSiblingBubbles.length -1];

    const brotherRect = brotherBubble.renderedRect;

    if(!brotherRect) {
      return;
    }

    const point = brotherRect.calcPositionToOpen(thisBubble.renderedRect?.size || { width: 0, height: 0 });

    //listenerApi.dispatch(addPoint(point));

    if(!point) {
      return;
    }

    const moved = thisBubble.moveTo(point);

    // バブルを更新
    listenerApi.dispatch(updateBubble(moved.toJSON()));
  },
});
