import { createListenerMiddleware } from '@reduxjs/toolkit';
import { setGraph, setCasEntries } from './worldLineGraphSlice';
import { saveStatesToIDB, saveGraphToIDB } from './IndexedDBStore';
import { broadcastSyncNotification } from './crossTabSync';
import { notifySyncTargets } from './syncTarget';
import type { RootState } from '@bublys-org/state-management';
import type { WorldLineGraphJson } from '../domain/WorldLineGraph';

export const worldLineGraphListenerMiddleware = createListenerMiddleware();

// ============================================================================
// Batch sync — 同期的に発生するIDB書き込みをまとめて完了後に通知
//
// grow() は setGraph → setCasEntries を同期的にディスパッチする。
// queueMicrotask で1ティック待ち、全IDB書き込みの完了を待ってから
// graph変更だけを通知する。受信側はgraphからCASハッシュを導出できる。
// ============================================================================

let pendingWrites: Promise<void>[] = [];
let pendingGraphs: Array<{ scopeId: string; graph: WorldLineGraphJson }> = [];
let pendingCasEntries: Array<{ hash: string; data: unknown }> = [];
let flushScheduled = false;

function trackWrite(
  writePromise: Promise<void>,
  graphInfo?: { scopeId: string; graph: WorldLineGraphJson },
  casEntries?: Array<{ hash: string; data: unknown }>
) {
  pendingWrites.push(writePromise);
  if (graphInfo) {
    pendingGraphs.push(graphInfo);
  }
  if (casEntries) {
    pendingCasEntries.push(...casEntries);
  }

  if (!flushScheduled) {
    flushScheduled = true;
    queueMicrotask(async () => {
      const writes = pendingWrites;
      const graphs = pendingGraphs;
      const cas = pendingCasEntries;
      pendingWrites = [];
      pendingGraphs = [];
      pendingCasEntries = [];
      flushScheduled = false;

      await Promise.all(writes);
      if (graphs.length > 0) {
        broadcastSyncNotification({ graphs });
        notifySyncTargets({ graphs, casEntries: cas });
      }
    });
  }
}

// setGraph: グラフDAGをIndexedDBに保存
worldLineGraphListenerMiddleware.startListening({
  actionCreator: setGraph,
  effect: async (action, listenerApi) => {
    if ((action as { meta?: { fromSync?: boolean } }).meta?.fromSync) return;

    const { scopeId } = action.payload;
    const state = listenerApi.getState() as RootState;
    const graphJson = state.worldLineGraph?.graphs[scopeId];
    if (!graphJson) return;

    const writePromise = saveGraphToIDB(scopeId, graphJson);
    trackWrite(writePromise, { scopeId, graph: graphJson });
    await writePromise;
  },
});

// setCasEntries: 状態データをIndexedDBに保存
worldLineGraphListenerMiddleware.startListening({
  actionCreator: setCasEntries,
  effect: async (action) => {
    if ((action as { meta?: { fromSync?: boolean } }).meta?.fromSync) return;

    const { entries } = action.payload;
    if (entries.length === 0) return;

    const writePromise = saveStatesToIDB(entries);
    trackWrite(writePromise, undefined, entries);
    await writePromise;
  },
});
