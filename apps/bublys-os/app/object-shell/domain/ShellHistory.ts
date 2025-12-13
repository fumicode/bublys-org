/**
 * ShellAction
 * Reduxライクなアクション構造
 * 操作の種類とペイロードを定義
 */
export interface ShellAction {
  type: string;                          // アクションタイプ（例：'counter/countUp', 'memo/updateContent'）
  payload?: any;                         // アクションのペイロード（オプション）
  meta?: {                               // メタデータ（オプション）
    userId?: string;                     // 操作を実行したユーザーID
    description?: string;                // 操作の説明
    [key: string]: any;                  // その他のメタデータ
  };
}

/**
 * ShellHistoryNode<T>
 * シェルの履歴を線形リストとして管理
 * 各ノードは前の状態への参照を持つ
 */
export interface ShellHistoryNode<T> {
  // 履歴チェーン
  previous: ShellHistoryNode<T> | null;  // 前のシェル状態へのリンク

  // 変更情報（Reduxライクなアクション）
  timestamp: number;                     // 変更時刻（Unix timestamp）
  action: ShellAction;                   // 実行されたアクション

  // スナップショット（オプション）
  // メモリ効率のため、すべての履歴にスナップショットを保存するわけではない
  snapshot?: T;                          // ドメインオブジェクトのスナップショット
}

/**
 * 新しい履歴ノードを作成
 */
export function createHistoryNode<T>(
  previous: ShellHistoryNode<T> | null,
  action: ShellAction,
  snapshot?: T
): ShellHistoryNode<T> {
  return {
    previous,
    timestamp: Date.now(),
    action,
    snapshot,
  };
}

/**
 * 新しい履歴ノードを作成（簡易版：actionを自動構築）
 */
export function createHistoryNodeSimple<T>(
  previous: ShellHistoryNode<T> | null,
  actionType: string,
  payload?: any,
  userId?: string,
  description?: string,
  snapshot?: T
): ShellHistoryNode<T> {
  return createHistoryNode<T>(
    previous,
    {
      type: actionType,
      payload,
      meta: userId || description ? { userId, description } : undefined,
    },
    snapshot
  );
}

/**
 * 履歴の長さを取得
 */
export function getHistoryLength<T>(node: ShellHistoryNode<T> | null): number {
  let count = 0;
  let current = node;
  while (current !== null) {
    count++;
    current = current.previous;
  }
  return count;
}

/**
 * 履歴を配列として取得（新しい順）
 */
export function getHistoryAsArray<T>(
  node: ShellHistoryNode<T> | null,
  limit?: number
): ShellHistoryNode<T>[] {
  const history: ShellHistoryNode<T>[] = [];
  let current = node;
  let count = 0;

  while (current !== null && (!limit || count < limit)) {
    history.push(current);
    current = current.previous;
    count++;
  }

  return history;
}

/**
 * 特定のアクションタイプの履歴を検索
 */
export function findHistoryByActionType<T>(
  node: ShellHistoryNode<T> | null,
  actionType: string
): ShellHistoryNode<T>[] {
  const results: ShellHistoryNode<T>[] = [];
  let current = node;

  while (current !== null) {
    if (current.action.type === actionType) {
      results.push(current);
    }
    current = current.previous;
  }

  return results;
}

/**
 * @deprecated Use findHistoryByActionType instead
 */
export function findHistoryByOperation<T>(
  node: ShellHistoryNode<T> | null,
  operation: string
): ShellHistoryNode<T>[] {
  return findHistoryByActionType(node, operation);
}

/**
 * 特定の時刻以降の履歴を取得
 */
export function getHistorySince<T>(
  node: ShellHistoryNode<T> | null,
  timestamp: number
): ShellHistoryNode<T>[] {
  const results: ShellHistoryNode<T>[] = [];
  let current = node;

  while (current !== null && current.timestamp >= timestamp) {
    results.push(current);
    current = current.previous;
  }

  return results;
}

/**
 * N個前の履歴ノードを取得
 */
export function getNthPreviousNode<T>(
  node: ShellHistoryNode<T> | null,
  n: number
): ShellHistoryNode<T> | null {
  let current = node;
  for (let i = 0; i < n && current !== null; i++) {
    current = current.previous;
  }
  return current;
}

/**
 * 履歴の圧縮：古い履歴を間引く
 * 例：10個以上の履歴がある場合、10個より古いものは10個ごとに1つだけ残す
 */
export function compressHistory<T>(
  node: ShellHistoryNode<T> | null,
  keepRecent: number = 10,
  keepEveryN: number = 10
): ShellHistoryNode<T> | null {
  if (!node) return null;

  const history = getHistoryAsArray(node);
  if (history.length <= keepRecent) {
    return node;
  }

  // 最近のkeepRecent個は全て保持
  const recentHistory = history.slice(0, keepRecent);
  const oldHistory = history.slice(keepRecent);

  // 古い履歴はkeepEveryN個ごとに1つ保持
  const compressedOldHistory = oldHistory.filter((_, index) => index % keepEveryN === 0);

  // 履歴チェーンを再構築
  let compressed: ShellHistoryNode<T> | null = null;
  for (const h of [...compressedOldHistory].reverse()) {
    compressed = {
      ...h,
      previous: compressed,
    };
  }

  for (const h of [...recentHistory].reverse()) {
    compressed = {
      ...h,
      previous: compressed,
    };
  }

  return compressed;
}

/**
 * 履歴を切り捨て（最新N個のみ保持）
 */
export function truncateHistory<T>(
  node: ShellHistoryNode<T> | null,
  maxLength: number
): ShellHistoryNode<T> | null {
  if (!node) return null;

  const history = getHistoryAsArray(node, maxLength);

  // 履歴チェーンを再構築
  let truncated: ShellHistoryNode<T> | null = null;
  for (const h of [...history].reverse()) {
    truncated = {
      ...h,
      previous: truncated,
    };
  }

  return truncated;
}

/**
 * シリアライゼーション用の型
 * 循環参照を避けるため、履歴をフラットな配列として保存
 */
export interface SerializedHistory {
  nodes: Array<{
    timestamp: number;
    action: ShellAction;
    snapshot?: any;  // JSON serializable
  }>;
}

/**
 * JSON形式に変換
 */
export function serializeHistory<T>(
  node: ShellHistoryNode<T> | null,
  snapshotSerializer?: (snapshot: T) => any
): SerializedHistory {
  const history = getHistoryAsArray(node);

  return {
    nodes: history.map(h => ({
      timestamp: h.timestamp,
      action: h.action,
      snapshot: h.snapshot && snapshotSerializer
        ? snapshotSerializer(h.snapshot)
        : h.snapshot,
    })),
  };
}

/**
 * JSONから履歴を復元
 */
export function deserializeHistory<T>(
  json: SerializedHistory,
  snapshotDeserializer?: (data: any) => T
): ShellHistoryNode<T> | null {
  if (!json.nodes || json.nodes.length === 0) {
    return null;
  }

  // 配列を逆順にして、古いものから順にチェーンを構築
  const nodes = [...json.nodes].reverse();

  let history: ShellHistoryNode<T> | null = null;
  for (const nodeData of nodes) {
    history = {
      previous: history,
      timestamp: nodeData.timestamp,
      action: nodeData.action,
      snapshot: nodeData.snapshot && snapshotDeserializer
        ? snapshotDeserializer(nodeData.snapshot)
        : nodeData.snapshot,
    };
  }

  return history;
}
