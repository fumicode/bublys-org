/**
 * StateSnapshot
 * オブジェクトの状態への参照（type, id, timestamp）
 *
 * これは「状態の内容」ではなく「状態へのポインタ」を表す。
 * 実際の状態データは IndexedDB に `${type}:${id}:${timestamp}` をキーとして保存される。
 */
export interface StateSnapshot {
  /** オブジェクトの型（例: 'counter', 'user', 'task'） */
  readonly type: string;
  /** オブジェクトのID（例: 'counter-001'） */
  readonly id: string;
  /** 状態のタイムスタンプ（ミリ秒） */
  readonly timestamp: number;
}

/**
 * StateSnapshot を作成
 */
export function createStateSnapshot(
  type: string,
  id: string,
  timestamp: number
): StateSnapshot {
  return { type, id, timestamp };
}

/**
 * オブジェクトを識別するキー（type:id）
 * 同一オブジェクトの異なるバージョンを区別しない
 */
export function snapshotKey(snapshot: StateSnapshot): string {
  return `${snapshot.type}:${snapshot.id}`;
}

/**
 * 特定のバージョンを識別するフルキー（type:id:timestamp）
 * IndexedDB の状態ストアのキーとして使用
 */
export function fullSnapshotKey(snapshot: StateSnapshot): string {
  return `${snapshot.type}:${snapshot.id}:${snapshot.timestamp}`;
}

/**
 * フルキー文字列から StateSnapshot を復元
 */
export function parseFullSnapshotKey(key: string): StateSnapshot | undefined {
  const parts = key.split(':');
  if (parts.length < 3) return undefined;

  const type = parts[0];
  const id = parts[1];
  const timestamp = parseInt(parts.slice(2).join(':'), 10);

  if (isNaN(timestamp)) return undefined;

  return { type, id, timestamp };
}

/**
 * 2つの StateSnapshot が同じオブジェクトを指しているか
 */
export function isSameObject(a: StateSnapshot, b: StateSnapshot): boolean {
  return a.type === b.type && a.id === b.id;
}

/**
 * 2つの StateSnapshot が完全に同じか（同一オブジェクトの同一バージョン）
 */
export function isSameSnapshot(a: StateSnapshot, b: StateSnapshot): boolean {
  return a.type === b.type && a.id === b.id && a.timestamp === b.timestamp;
}
