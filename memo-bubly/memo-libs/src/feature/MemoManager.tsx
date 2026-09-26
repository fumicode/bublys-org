import { Memo } from '../domain/Memo';

/**
 * Memoのシリアライズ
 */
export function serializeMemo(memo: Memo): any {
  return memo.toPlain();
}

/**
 * Memoのデシリアライズ
 */
export function deserializeMemo(data: any): Memo {
  return Memo.fromPlain(data);
}

/**
 * Memoの初期状態を作成
 */
export function createInitialMemo(): Memo {
  return Memo.create();
}

