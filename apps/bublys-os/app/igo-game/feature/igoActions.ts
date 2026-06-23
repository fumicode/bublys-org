import {
  setGraph,
  setCasEntries,
  deleteScope,
  WorldLineGraph,
  computeStateHash,
  createStateRef,
} from "@bublys-org/world-line-graph";
import type { AppDispatch } from "@bublys-org/state-management";
import { IgoGame_囲碁ゲーム } from "../domain";
import { IGO_GAME_TYPE, igoScopeId } from "../domain/IgoGameDomain";

/**
 * 新規対局用に world-line-graph に scope を作って初期ゲームを seed する。
 * （useCasScope.addObject 相当を Redux dispatch で行う薄いユーティリティ。
 * 一覧の「新規対局」のようにフックの外から発火する場合に使う）
 */
export function dispatchCreateIgoGame(dispatch: AppDispatch, game: IgoGame_囲碁ゲーム): void {
  const gameId = game.state.id;
  const scopeId = igoScopeId(gameId);
  const data = game.toJSON();
  const hash = computeStateHash(data);
  const ref = createStateRef(IGO_GAME_TYPE, gameId, hash);

  const graph = WorldLineGraph.empty().grow([ref]);

  dispatch(setGraph({ scopeId, graph: graph.toJSON() }));
  dispatch(setCasEntries({ entries: [{ hash, data }] }));
}

/** 対局を削除する（= その scope を world-line-graph から消す）。 */
export function dispatchDeleteIgoGame(dispatch: AppDispatch, gameId: string): void {
  dispatch(deleteScope(igoScopeId(gameId)));
}
