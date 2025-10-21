import { createListenerMiddleware } from '@reduxjs/toolkit';
import {
  joinSiblingInProcess,
  renderBubble,
  updateBubble,
} from './bubbles-slice.js';
import { Bubble } from '@bublys-org/bubbles-ui';

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
    const bubbleJson = state.bubbleState.bubbles[id];
    const bubble = Bubble.fromJSON(bubbleJson);

    // TODO: 目標座標を指定してください
    const moved = bubble.moveTo({ x: 0, y: 0 });

    // バブルを更新
    listenerApi.dispatch(updateBubble(moved.toJSON()));
  },
});
