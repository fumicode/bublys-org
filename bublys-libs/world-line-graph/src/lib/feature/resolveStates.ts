/**
 * resolveStates — StateRef 群を実データへ解決する
 *
 * 世界線のノードは「どの状態か」を hash でしか持たない。実データはメモリ上の CAS
 * （Redux。上限つきで古いものから追い出される）と、永続ストア（IndexedDB。全部残る）の
 * 2段になっている。
 *
 * メモリ上の CAS だけを見て解決すると、追い出された時点で黙って読めなくなる。
 * 「最新のノードは読めるのに、古いノードへ時間移動すると状態が戻らない」はこれが原因。
 * ここでは足りないぶんを永続ストアから取ってから解決する。
 *
 * React にも Redux にも依存しない純粋な非同期関数にしてあるので、フックを立ち上げずに
 * 振る舞いを固定できる。
 */
import type { StateRef } from '../domain';
import type { CasRegistry } from './CasProvider';

export type ResolvedObject = {
  type: string;
  id: string;
  obj: unknown;
};

export type ResolveStatesResult = {
  /** 解決できたオブジェクト（削除済み＝tombstone は含まない） */
  resolved: ResolvedObject[];
  /** 永続ストアから取ってきたぶん（呼び出し側が CAS へ載せ直すために返す） */
  loaded: Map<string, unknown>;
  /** どこにも無くて解決できなかった ref（"type:id" 形式） */
  unresolved: string[];
};

/**
 * refs を実データへ解決する。
 *
 * @param cas         メモリ上の CAS（hash → data）。data が null なら削除済み
 * @param loadStates  メモリに無いぶんの取得先（既定は IndexedDB。テストから差し替え可能）
 */
export async function resolveStateRefs(
  refs: readonly StateRef[],
  cas: Readonly<Record<string, unknown>>,
  loadStates: (hashes: string[]) => Promise<Map<string, unknown>>,
  registry: CasRegistry
): Promise<ResolveStatesResult> {
  // メモリに無いぶんだけ、1回にまとめて取りに行く
  const missing = refs
    .filter((ref) => cas[ref.hash] === undefined)
    .map((ref) => ref.hash);
  const loaded =
    missing.length > 0 ? await loadStates(missing) : new Map<string, unknown>();

  const resolved: ResolvedObject[] = [];
  const unresolved: string[] = [];
  for (const ref of refs) {
    // ?? を使わないこと。tombstone（null）が「メモリに無い」と同じ扱いになってしまう
    const data =
      cas[ref.hash] !== undefined ? cas[ref.hash] : loaded.get(ref.hash);
    if (data === undefined) {
      unresolved.push(`${ref.type}:${ref.id}`);
      continue;
    }
    if (data === null) continue; // 削除済み（tombstone）
    const config = registry[ref.type];
    if (!config) continue; // 未登録の型は扱えない（別アプリのデータ等）
    resolved.push({ type: ref.type, id: ref.id, obj: config.fromJSON(data) });
  }

  return { resolved, loaded, unresolved };
}
