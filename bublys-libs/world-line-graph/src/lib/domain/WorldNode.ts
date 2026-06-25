import { StateRef } from './StateRef';

export interface WorldNode {
  readonly id: string;
  readonly parentId: string | null;
  readonly timestamp: number;
  readonly changedRefs: StateRef[];
  readonly worldLineId: string;
  /** ユーザーがつけた表示名。タブ等のラベル付きビューに用いる。 */
  readonly label?: string;
  /**
   * このノードの「世界全体の状態」を表すハッシュ（root からの changedRefs を畳み込んだ
   * 全 ref.hash の合成）。打ち消しスナップ判定を O(1) 比較にするためノードに焼いて持つ。
   * 旧データには無いことがあり、その場合は呼び出し側で都度計算してフォールバックする。
   */
  readonly stateHash?: string;
}

function generateNodeId(stateHash?: string): string {
  const timestamp = Date.now().toString(36);
  // ノードは「時刻 timestamp に world（= stateHash）へ到達した」イベント。
  // 実体IDの後半を world のハッシュにして、IDに world の同一性と決定性を持たせる。
  // stateHash が無い場合（旧経路）だけランダムにフォールバックする。
  const suffix = stateHash ?? Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${suffix}`;
}

export function createWorldNode(
  parentId: string | null,
  changedRefs: StateRef[],
  worldLineId: string,
  stateHash?: string
): WorldNode {
  return {
    id: generateNodeId(stateHash),
    parentId,
    timestamp: Date.now(),
    changedRefs,
    worldLineId,
    ...(stateHash ? { stateHash } : {}),
  };
}
