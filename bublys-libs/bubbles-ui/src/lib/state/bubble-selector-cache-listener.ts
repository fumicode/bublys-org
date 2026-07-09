/**
 * bubble-selector-cache-listener
 * バブル削除イベントを監視し、そのバブルのセレクタキャッシュ（Map）を解放する
 * Redux Listener Middleware
 */

import { createListenerMiddleware } from '@reduxjs/toolkit';
import { removeBubble, evictBubbleSelectorCache } from './bubbles-slice.js';

export const bubbleSelectorCacheListener = createListenerMiddleware();

bubbleSelectorCacheListener.startListening({
  actionCreator: removeBubble,
  effect: (action) => {
    const bubbleId = action.payload;
    const universeId = action.meta.universeId;
    evictBubbleSelectorCache(bubbleId, universeId);
  },
});
