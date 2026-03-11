import { getCurrentStore } from '@bublys-org/state-management';
import { applySyncPayload } from './applySyncPayload';
import type { WorldLineGraphJson } from '../domain/WorldLineGraph';

/**
 * サーバーから差分graph + CASを取得してReduxに反映する。
 *
 * サーバーには knownHashes を送り、クライアントが既に持っているCASを除外してもらう。
 */
export async function pullServerState(url: string): Promise<void> {
  const store = getCurrentStore();
  if (!store) return;

  // Reduxに既にあるCASハッシュを収集
  const cas = store.getState().worldLineGraph?.cas ?? {};
  const knownHashes = Object.keys(cas);

  // 差分リクエスト
  const params = new URLSearchParams();
  params.set('diff', 'true');
  if (knownHashes.length > 0) {
    params.set('knownHashes', knownHashes.join(','));
  }

  const res = await fetch(`${url}?${params}`);
  if (!res.ok) return;

  const { graphs, cas: newCas } = (await res.json()) as {
    graphs: Record<string, WorldLineGraphJson>;
    cas: Record<string, unknown>;
  };

  const casEntries = Object.entries(newCas).map(([hash, data]) => ({
    hash,
    data,
  }));

  applySyncPayload({ graphs, casEntries });
}
