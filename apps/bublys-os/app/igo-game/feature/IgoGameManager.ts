import { IgoGame_囲碁ゲーム, IgoGameState_囲碁ゲーム状態 } from '../domain';

/**
 * IgoGameのシリアライズ
 */
export function serializeIgoGame(game: IgoGame_囲碁ゲーム): IgoGameState_囲碁ゲーム状態 {
  return game.toJSON();
}

/**
 * IgoGameのデシリアライズ
 */
export function deserializeIgoGame(data: IgoGameState_囲碁ゲーム状態): IgoGame_囲碁ゲーム {
  return IgoGame_囲碁ゲーム.fromJSON(data);
}

/**
 * IgoGameの初期状態を作成
 */
export function createInitialIgoGame(): IgoGame_囲碁ゲーム {
  return IgoGame_囲碁ゲーム.create(crypto.randomUUID(), 9);
}
