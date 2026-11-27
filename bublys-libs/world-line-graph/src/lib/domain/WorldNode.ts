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
  /**
   * このノードを生んだ「ユーザーの 1 意図」の id。
   * 同じ意図の続きの変化は新しいノードを作らず、このノードを amend する。
   */
  readonly intentId?: string;
  /** 意図の名前（open:… / drag / close:… など）。DAG 表示のフォールバック名に使う。 */
  readonly intentLabel?: string;
  /**
   * 複数ステップからなるコマンドのグループID。
   * 同じ commandGroupId を持つノードは1つのコマンドの中間ステップ群を表す。
   */
  readonly commandGroupId?: string;
  /** このノードがコマンド内の何番目のステップか（0始まり） */
  readonly commandStepIndex?: number;
  /** コマンド全体のステップ数 */
  readonly commandStepCount?: number;
}

function generateNodeId(stateHash?: string): string {
  const timestamp = Date.now().toString(36);
  // ノードは「時刻 timestamp に world（= stateHash）へ到達した」イベント。
  // id 後半は**このノードが生まれた瞬間**の world hash。
  // 同じ意図の中で中身が amend されると、現在の node.stateHash とは一致しなくなる。
  // world の同一性を見るときは必ず node.stateHash を使うこと（id からは導かない）。
  // skipSnap で同じ状態のノードを強制的に作るとき、同一ミリ秒 + 同一 hash で
  // ID が衝突するのを防ぐため、常にランダム要素を末尾に付ける。
  const hash = stateHash ?? Math.random().toString(36).slice(2, 8);
  const random = Math.random().toString(36).slice(2, 6);
  return `${timestamp}-${hash}-${random}`;
}

export type CreateWorldNodeOptions = {
  stateHash?: string;
  intentId?: string;
  intentLabel?: string;
  commandGroupId?: string;
  commandStepIndex?: number;
  commandStepCount?: number;
};

export function createWorldNode(
  parentId: string | null,
  changedRefs: StateRef[],
  worldLineId: string,
  options?: CreateWorldNodeOptions
): WorldNode {
  const { stateHash, intentId, intentLabel, commandGroupId, commandStepIndex, commandStepCount } =
    options ?? {};
  return {
    id: generateNodeId(stateHash),
    parentId,
    timestamp: Date.now(),
    changedRefs,
    worldLineId,
    ...(stateHash ? { stateHash } : {}),
    ...(intentId ? { intentId } : {}),
    ...(intentLabel ? { intentLabel } : {}),
    ...(commandGroupId ? { commandGroupId } : {}),
    ...(commandStepIndex !== undefined ? { commandStepIndex } : {}),
    ...(commandStepCount !== undefined ? { commandStepCount } : {}),
  };
}
