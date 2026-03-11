import type { WorldLineGraphJson } from '../domain/WorldLineGraph';

// ============================================================================
// Sync Target Registry — 外部トランスポートへのPush通知拡張ポイント
//
// HTTP POST, WebSocket など外部同期先を登録する。
// リスナーのバッチフラッシュ後に fire-and-forget で通知。
// ============================================================================

export interface SyncPayload {
  graphs: Array<{ scopeId: string; graph: WorldLineGraphJson }>;
  casEntries: Array<{ hash: string; data: unknown }>;
}

export type SyncTarget = (payload: SyncPayload) => void | Promise<void>;

const targets = new Set<SyncTarget>();

export function registerSyncTarget(target: SyncTarget): () => void {
  targets.add(target);
  return () => {
    targets.delete(target);
  };
}

export function notifySyncTargets(payload: SyncPayload): void {
  for (const target of targets) {
    try {
      const result = target(payload);
      if (result && typeof result.catch === 'function') {
        result.catch((err) => console.error('[SyncTarget] error:', err));
      }
    } catch (err) {
      console.error('[SyncTarget] error:', err);
    }
  }
}
