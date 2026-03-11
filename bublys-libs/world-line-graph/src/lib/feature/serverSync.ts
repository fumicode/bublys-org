import { registerSyncTarget } from './syncTarget';
import { pullServerState } from './pullServerState';

// ============================================================================
// Server Sync — HTTP Push + Pull を統合した定期同期
//
// Push: registerSyncTarget で POST リクエストを登録
// Pull: pullServerState で差分 GET を定期実行
//
// 将来 WebSocket に置き換える場合、このファイルを差し替えるか
// 同様の startXxxSync 関数を作れば同じインターフェイスで動作する。
// ============================================================================

/**
 * サーバーとの定期同期を開始する。
 * @param baseUrl - sync APIのベースURL（例: "/api/wlg/sync"）
 * @param intervalMs - ポーリング間隔（デフォルト: 5000ms）
 * @returns クリーンアップ関数
 */
export function startServerSync(
  baseUrl: string,
  intervalMs = 5000,
): () => void {
  // Push: クライアント→サーバー
  const unregister = registerSyncTarget(async (payload) => {
    await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  });

  // 初回Pull
  pullServerState(baseUrl);

  // 定期ポーリング
  const timer = setInterval(() => {
    pullServerState(baseUrl);
  }, intervalMs);

  return () => {
    unregister();
    clearInterval(timer);
  };
}
