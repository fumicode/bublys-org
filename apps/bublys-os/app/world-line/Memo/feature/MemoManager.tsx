import { Memo } from '../domain/Memo';

/**
 * Memoのシリアライズ
 */
export function serializeMemo(memo: Memo): any {
  return memo.toJson();
}

/**
 * Memoのデシリアライズ
 */
export function deserializeMemo(data: any): Memo {
  return Memo.fromJson(data);
}

/**
 * Memoの初期状態を作成
 */
export function createInitialMemo(): Memo {
  return Memo.create();
}

