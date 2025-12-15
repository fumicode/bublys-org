/**
 * StateSnapshot
 * オブジェクトの状態への参照（type, id, stateHash）
 *
 * これは「状態の内容」ではなく「状態へのポインタ」を表す。
 * 実際の状態データは IndexedDB に `${type}:${id}:${stateHash}` をキーとして保存される。
 */
export interface StateSnapshot {
  /** オブジェクトの型（例: 'counter', 'user', 'task'） */
  readonly type: string;
  /** オブジェクトのID（例: 'counter-001'） */
  readonly id: string;
  /** 状態のSHA-256ハッシュ（例: 'a3f2e1...'） */
  readonly stateHash: string;
}

/**
 * StateSnapshot を作成
 */
export function createStateSnapshot(
  type: string,
  id: string,
  stateHash: string
): StateSnapshot {
  return { type, id, stateHash };
}

/**
 * オブジェクトを識別するキー（type:id）
 * 同一オブジェクトの異なるバージョンを区別しない
 */
export function snapshotKey(snapshot: StateSnapshot): string {
  return `${snapshot.type}:${snapshot.id}`;
}

/**
 * 特定のバージョンを識別するフルキー（type:id:stateHash）
 * IndexedDB の状態ストアのキーとして使用
 */
export function fullSnapshotKey(snapshot: StateSnapshot): string {
  return `${snapshot.type}:${snapshot.id}:${snapshot.stateHash}`;
}

/**
 * フルキー文字列から StateSnapshot を復元
 */
export function parseFullSnapshotKey(key: string): StateSnapshot | undefined {
  const parts = key.split(':');
  if (parts.length < 3) return undefined;

  // stateHash にコロンが含まれる可能性があるため、最初の2つ以外は結合
  const type = parts[0];
  const id = parts[1];
  const stateHash = parts.slice(2).join(':');

  return { type, id, stateHash };
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
  return a.type === b.type && a.id === b.id && a.stateHash === b.stateHash;
}
