/**
 * shell-bubble-listener
 * ShellManagerからのBubble作成リクエストを処理するRedux Listener Middleware
 */

import { createListenerMiddleware } from '@reduxjs/toolkit';
import { createBubble } from '../Bubble.domain.js';
import { addBubble, relateBubbles, joinSiblingInProcess } from './bubbles-slice.js';

export const shellBubbleListener = createListenerMiddleware();

/**
 * Bubble作成リクエストを処理
 * ShellManagerから 'bubbles/requestBubbleCreation' アクションがディスパッチされたら、
 * Bubbleを作成して適切な位置に配置する
 */
shellBubbleListener.startListening({
  predicate: (action) => action.type === 'bubbles/requestBubbleCreation',
  effect: async (action: any, listenerApi) => {
    const { url, openerBubbleId } = action.payload;

    console.log('[ShellBubble Listener] Creating bubble:', { url, openerBubbleId });

    // Bubbleを作成
    const newBubble = createBubble(url);

    // Bubble entitiesに追加
    listenerApi.dispatch(addBubble(newBubble.toJSON()));

    // 親子関係を記録
    listenerApi.dispatch(relateBubbles({
      openerId: openerBubbleId,
      openeeId: newBubble.id
    }));

    // プロセス層に追加（横並びとして）
    listenerApi.dispatch(joinSiblingInProcess(newBubble.id));

    console.log('[ShellBubble Listener] Bubble created:', newBubble.id);
  }
});
