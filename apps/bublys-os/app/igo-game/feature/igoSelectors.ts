import type { RootState } from "@bublys-org/state-management";
import { WorldLineGraph } from "@bublys-org/world-line-graph";
import { IgoGame_囲碁ゲーム, IgoGameState_囲碁ゲーム状態 } from "../domain";
import { IGO_GAME_TYPE, IGO_SCOPE_PREFIX, igoScopeId } from "../domain/IgoGameDomain";

/**
 * world-line-graph slice の graphs から `igo:` プレフィックス付きの scope ID を
 * 集めて、ゲーム ID 一覧（プレフィックス除去後）を返す。
 */
export const selectIgoGameIds = (state: RootState): string[] => {
  const graphs = state.worldLineGraph?.graphs;
  if (!graphs) return [];
  return Object.keys(graphs)
    .filter((scopeId) => scopeId.startsWith(IGO_SCOPE_PREFIX))
    .map((scopeId) => scopeId.slice(IGO_SCOPE_PREFIX.length));
};

/**
 * 指定 gameId の scope の apex に置かれている IgoGame を Redux から直接組み立てる。
 * （useCasScope は hook なので一覧用途では使えないため、graph + cas を直読みする）
 */
export const selectIgoGameAtApex =
  (gameId: string) =>
  (state: RootState): IgoGame_囲碁ゲーム | null => {
    const scopeId = igoScopeId(gameId);
    const graphJson = state.worldLineGraph?.graphs[scopeId];
    if (!graphJson) return null;
    const graph = WorldLineGraph.fromJSON(graphJson);
    const apex = graph.getApex();
    if (!apex) return null;
    const refs = graph.getStateRefsAt(apex.id);
    const ref = refs.find((r) => r.type === IGO_GAME_TYPE && r.id === gameId);
    if (!ref) return null;
    const data = state.worldLineGraph?.cas[ref.hash];
    if (data === undefined || data === null) return null;
    return IgoGame_囲碁ゲーム.fromJSON(data as IgoGameState_囲碁ゲーム状態);
  };
