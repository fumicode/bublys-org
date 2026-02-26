import { setGraph, setCasEntries } from './worldLineGraphSlice';
import { loadStatesFromIDB } from './IndexedDBStore';
import { getCurrentStore } from '@bublys-org/state-management';
import type { WorldLineGraphJson } from '../domain/WorldLineGraph';

const CHANNEL_NAME = 'wlg-sync';

// ============================================================================
// Shared BroadcastChannel — 単一インスタンスで送受信
//
// 同じインスタンスの postMessage は自身の onmessage を発火しないため、
// 自タブのアクションを自分で受信するループを防止できる。
// ============================================================================

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }
  return channel;
}

// ============================================================================
// 通知フォーマット — graph変更のみの軽量通知
//
// CASハッシュはgraph内のノードから導出できるため、通知に含めない。
// 送信側タブが既にIDBに書き込み済みなので、受信側はIDBから読めばよい。
// ============================================================================

export interface SyncNotification {
  graphs: Array<{ scopeId: string; graph: WorldLineGraphJson }>;
}

// ============================================================================
// Helper — graphからCASハッシュを抽出
// ============================================================================

function extractCasHashes(graph: WorldLineGraphJson): string[] {
  const hashes = new Set<string>();
  for (const node of Object.values(graph.nodes)) {
    for (const ref of node.changedRefs) {
      hashes.add(ref.hash);
    }
  }
  return Array.from(hashes);
}

// ============================================================================
// Sender — worldLineGraphListener から呼ばれる公開関数
// ============================================================================

export function broadcastSyncNotification(notification: SyncNotification): void {
  const ch = getChannel();
  if (!ch) return;
  ch.postMessage(notification);
}

// ============================================================================
// Receiver — 他タブからの通知を受けてIDBからデータを読みReduxに反映
//
// CAS entries を先にディスパッチし、graph を後にすることで
// 「hash は参照しているがデータ未着」の中間状態を防ぐ。
// ============================================================================

export function startCrossTabReceiver(): void {
  if (typeof window === 'undefined') return;

  const ch = getChannel();
  if (!ch) return;

  ch.onmessage = async (event) => {
    const store = getCurrentStore();
    if (!store) return;

    const { graphs } = event.data as SyncNotification;

    // graph内の全ノードからCASハッシュを抽出
    const allHashes = new Set<string>();
    for (const { graph } of graphs) {
      for (const hash of extractCasHashes(graph)) {
        allHashes.add(hash);
      }
    }

    // Reduxに既にあるハッシュを除外し、不足分だけIDBから読む
    const cas = store.getState().worldLineGraph?.cas ?? {};
    const missingHashes = Array.from(allHashes).filter((h) => !(h in cas));

    if (missingHashes.length > 0) {
      const casData = await loadStatesFromIDB(missingHashes);
      const entries = Array.from(casData.entries()).map(([hash, data]) => ({
        hash,
        data,
      }));
      if (entries.length > 0) {
        store.dispatch({
          ...setCasEntries({ entries }),
          meta: { fromSync: true },
        });
      }
    }

    // Graph更新（CAS反映後）
    for (const { scopeId, graph } of graphs) {
      store.dispatch({
        ...setGraph({ scopeId, graph }),
        meta: { fromSync: true },
      });
    }
  };
}
