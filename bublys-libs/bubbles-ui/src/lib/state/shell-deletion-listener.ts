/**
 * shell-deletion-listener
 * Shell削除イベントを監視し、対応するBubbleを削除するRedux Listener Middleware
 */

import { createListenerMiddleware } from '@reduxjs/toolkit';
import { removeBubble } from './bubbles-slice.js';

export const shellDeletionListener = createListenerMiddleware();

/**
 * Shell削除 → Bubble削除
 * ShellManagerから 'shells/deleted' アクションがディスパッチされたら、
 * URLが一致するBubbleを削除する
 */
shellDeletionListener.startListening({
  predicate: (action) => action.type === 'shells/deleted',
  effect: async (action: any, listenerApi) => {
    const { shellId, shellType } = action.payload;

    console.log('[ShellDeletion Listener] Shell deleted:', { shellId, shellType });

    // URLを構築
    const url = `object-shells/${shellType}/${shellId}`;

    // 現在の状態から該当するBubbleを検索
    const state = listenerApi.getState() as any;
    const bubbles = state.bubbleState.bubbles;

    // URLが一致するBubbleを見つける
    const matchingBubble = Object.values(bubbles).find(
      (bubble: any) => bubble.url === url
    );

    if (matchingBubble) {
      console.log('[ShellDeletion Listener] Deleting matching bubble:', (matchingBubble as any).id);

      // Bubbleを削除
      listenerApi.dispatch(removeBubble((matchingBubble as any).id));
    } else {
      console.log('[ShellDeletion Listener] No matching bubble found for URL:', url);
    }
  }
});
