import { injectSlice, injectMiddleware } from '@bublys-org/state-management';
import { worldLineGraphSlice } from './worldLineGraphSlice';
import { worldLineGraphListenerMiddleware } from './worldLineGraphListener';
import { startCrossTabReceiver } from './crossTabSync';

let initialized = false;

export function initWorldLineGraph(): void {
  if (initialized) return;
  initialized = true;

  injectSlice(worldLineGraphSlice);
  // IDB永続化 + クロスタブ同期通知を統合したリスナー
  injectMiddleware(worldLineGraphListenerMiddleware.middleware);
  startCrossTabReceiver();
}
