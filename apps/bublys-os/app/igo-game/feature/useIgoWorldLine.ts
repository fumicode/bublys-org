"use client";
import { useCasScope } from "@bublys-org/world-line-graph";
import { IgoGame_囲碁ゲーム } from "../domain";
import { IGO_GAME_TYPE, igoScopeId } from "../domain/IgoGameDomain";

/**
 * 1 ゲームにつき 1 scope の world-line を提供するフック（memo の useMemoWorldLine と同型）。
 *
 * 仕組み:
 *  - `useCasScope("igo:<gameId>")` でゲーム専用 scope を確保
 *  - scope が空なら初期ゲーム（id = gameId）を seed する
 *  - 着手などの編集 API（`update`）は shell.update を呼んで graph を伸ばす
 *  - `apexGame` は scope の apex に紐づく最新の IgoGame を返す
 *  - 戻る/進む / 任意ノードへの moveTo / graph 全体は scope のものを露出
 *
 * 注: DomainRegistryProvider の内側で使うこと（IGO_GAME_TYPE を解決するため）。
 */
export type IgoWorldLine = {
  gameId: string;
  apexGame: IgoGame_囲碁ゲーム | null;
  update: (transform: (current: IgoGame_囲碁ゲーム) => IgoGame_囲碁ゲーム) => void;
  moveBack: () => void;
  moveForward: () => void;
  moveTo: (nodeId: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  graph: ReturnType<typeof useCasScope>["graph"];
  scope: ReturnType<typeof useCasScope>;
};

export function useIgoWorldLine(gameId: string, boardSize = 9): IgoWorldLine {
  // scope が空のとき useCasScope が initialObjects で root を seed する
  // （id を gameId に揃えるため create(gameId) を渡す）。
  const scope = useCasScope(igoScopeId(gameId), {
    initialObjects: [{ type: IGO_GAME_TYPE, object: IgoGame_囲碁ゲーム.create(gameId, boardSize) }],
  });

  const apexGame = scope.getShell<IgoGame_囲碁ゲーム>(IGO_GAME_TYPE, gameId)?.object ?? null;

  const update = (transform: (current: IgoGame_囲碁ゲーム) => IgoGame_囲碁ゲーム) => {
    const shell = scope.getShell<IgoGame_囲碁ゲーム>(IGO_GAME_TYPE, gameId);
    if (shell) shell.update(transform);
  };

  return {
    gameId,
    apexGame,
    update,
    moveBack: scope.moveBack,
    moveForward: scope.moveForward,
    moveTo: scope.moveTo,
    canUndo: scope.canUndo,
    canRedo: scope.canRedo,
    graph: scope.graph,
    scope,
  };
}
