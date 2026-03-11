import { setGraph, setCasEntries } from './worldLineGraphSlice';
import { getCurrentStore } from '@bublys-org/state-management';
import type { WorldLineGraphJson } from '../domain/WorldLineGraph';

// ============================================================================
// applySyncPayload — 外部ソースからの変更をReduxに反映する共通処理
//
// 受信パスの共通ルール:
//   1. CAS entries を先にディスパッチ（hash参照→データ未着の中間状態を防ぐ）
//   2. Graph を後にディスパッチ
//   3. fromSync: true メタを付与（リスナーの再通知ループを防ぐ）
//
// HTTP Pull、BroadcastChannel、将来の WebSocket 受信で共通利用する。
// ============================================================================

export interface IncomingSyncData {
  graphs: Record<string, WorldLineGraphJson> | Array<{ scopeId: string; graph: WorldLineGraphJson }>;
  casEntries: Array<{ hash: string; data: unknown }>;
}

/**
 * 外部ソース（サーバー、他タブ等）から受信したデータをReduxに反映する。
 */
export function applySyncPayload(data: IncomingSyncData): void {
  const store = getCurrentStore();
  if (!store) return;

  // CAS first
  if (data.casEntries.length > 0) {
    store.dispatch({
      ...setCasEntries({ entries: data.casEntries }),
      meta: { fromSync: true },
    });
  }

  // Graph second
  const graphs = Array.isArray(data.graphs)
    ? data.graphs
    : Object.entries(data.graphs).map(([scopeId, graph]) => ({ scopeId, graph }));

  for (const { scopeId, graph } of graphs) {
    store.dispatch({
      ...setGraph({ scopeId, graph }),
      meta: { fromSync: true },
    });
  }
}
