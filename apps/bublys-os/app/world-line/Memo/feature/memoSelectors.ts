import type { RootState } from "@bublys-org/state-management";
import { WorldLineGraph } from "@bublys-org/world-line-graph";
import { Memo, RawMemo } from "../domain/Memo";
import {
  MEMO_TYPE,
  MEMO_SCOPE_PREFIX,
  memoScopeId,
} from "../domain/MemoDomain";

/**
 * world-line-graph slice の graphs から `memo:` プレフィックス付きの scope ID を
 * 集めて、memo ID 一覧（プレフィックス除去後）を返す。
 */
export const selectMemoIds = (state: RootState): string[] => {
  const graphs = state.worldLineGraph?.graphs;
  if (!graphs) return [];
  return Object.keys(graphs)
    .filter((scopeId) => scopeId.startsWith(MEMO_SCOPE_PREFIX))
    .map((scopeId) => scopeId.slice(MEMO_SCOPE_PREFIX.length));
};

/**
 * 指定 memoId の scope の apex に置かれている Memo を Redux から直接組み立てる。
 *
 * useCasScope は hook なので「複数 memo を一覧する」用途では使えない。代わりに
 * graph と cas を直接読んで getStateRefsAt 相当を実行する。
 */
export const selectMemoAtApex = (memoId: string) => (state: RootState): Memo | null => {
  const scopeId = memoScopeId(memoId);
  const graphJson = state.worldLineGraph?.graphs[scopeId];
  if (!graphJson) return null;
  const graph = WorldLineGraph.fromJSON(graphJson);
  const apex = graph.getApex();
  if (!apex) return null;
  const refs = graph.getStateRefsAt(apex.id);
  const memoRef = refs.find((r) => r.type === MEMO_TYPE && r.id === memoId);
  if (!memoRef) return null;
  const data = state.worldLineGraph?.cas[memoRef.hash];
  if (data === undefined || data === null) return null;
  return Memo.fromJson(data as RawMemo);
};
