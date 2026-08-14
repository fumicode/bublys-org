import {
  setGraph,
  setCasEntries,
  deleteScope,
  WorldLineGraph,
  computeStateHash,
  createStateRef,
} from "@bublys-org/world-line-graph";
import type { AppDispatch } from "@bublys-org/state-management";
import { Memo } from "../domain/Memo";
import { MEMO_TYPE, memoScopeId } from "../domain/MemoDomain";

/**
 * 新規メモ用に world-line-graph に scope を作って、initial memo を seed する。
 *
 * useCasScope.addObject と等価のことを Redux dispatch で行う薄いユーティリティ。
 * MemoCollection の「メモを追加」のようにフックの外から発火する場合に使う。
 */
export function dispatchCreateMemo(dispatch: AppDispatch, memo: Memo): void {
  const memoId = memo.id;
  const scopeId = memoScopeId(memoId);
  const data = memo.toJson();
  const hash = computeStateHash(data);
  const ref = createStateRef(MEMO_TYPE, memoId, hash);

  const graph = WorldLineGraph.empty().grow([ref]);

  dispatch(setGraph({ scopeId, graph: graph.toJSON() }));
  dispatch(setCasEntries({ entries: [{ hash, data }] }));
}

/**
 * メモを削除する（= その scope を world-line-graph から消す）。
 */
export function dispatchDeleteMemo(dispatch: AppDispatch, memoId: string): void {
  dispatch(deleteScope(memoScopeId(memoId)));
}
