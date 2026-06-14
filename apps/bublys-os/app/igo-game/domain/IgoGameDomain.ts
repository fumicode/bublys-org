import { defineDomainObjects } from "@bublys-org/domain-registry";
import { IgoGame_囲碁ゲーム, IgoGameState_囲碁ゲーム状態 } from "./IgoGame";

/**
 * 囲碁ゲームを world-line-graph 上の CAS shell として扱うための domain-registry 定義。
 *
 * 各ゲームは固有の scope（scopeId = `igo:<gameId>`）を持ち、その中で 1 種類の
 * shell（type = "igo-game", id = gameId）を更新していく。shell の id を gameId に
 * 揃えるため、初期ゲームは `IgoGame_囲碁ゲーム.create(gameId)` で作ること。
 */
export const IGO_GAME_TYPE = "igo-game";

export const IGO_GAME_DOMAIN = defineDomainObjects({
  [IGO_GAME_TYPE]: {
    class: IgoGame_囲碁ゲーム,
    fromJSON: (json: unknown) =>
      IgoGame_囲碁ゲーム.fromJSON(json as IgoGameState_囲碁ゲーム状態),
    toJSON: (game: IgoGame_囲碁ゲーム) => game.toJSON(),
    getId: (game: IgoGame_囲碁ゲーム) => game.state.id,
  },
});

/** igo の scopeId プレフィックス。selectScopeIds("igo:") でゲーム一覧を引ける。 */
export const IGO_SCOPE_PREFIX = "igo:";
export const igoScopeId = (gameId: string) => `${IGO_SCOPE_PREFIX}${gameId}`;
