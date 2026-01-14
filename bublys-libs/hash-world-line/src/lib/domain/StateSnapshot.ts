/**
 * StateSnapshot
 * オブジェクトの状態への参照（type, id, hash）
 *
 * これは「状態の内容」ではなく「状態へのポインタ」を表す。
 * 実際の状態データは IndexedDB に `${type}:${id}:${hash}` をキーとして保存される。
 *
 * hash は状態データの内容から計算されるため、同一内容は同一 hash になる。
 * これにより CAS（Content Addressed Storage）パターンを実現し、
 * 重複した状態の保存を防ぐことができる。
 */
export interface StateSnapshot {
  /** オブジェクトの型（例: 'counter', 'user', 'task'） */
  readonly type: string;
  /** オブジェクトのID（例: 'counter-001'） */
  readonly id: string;
  /** 状態のハッシュ値（8文字の16進数） */
  readonly hash: string;
}

/**
 * StateSnapshot を作成
 */
export function createStateSnapshot(
  type: string,
  id: string,
  hash: string
): StateSnapshot {
  return { type, id, hash };
}

/**
 * オブジェクトを識別するキー（type:id）
 * 同一オブジェクトの異なるバージョンを区別しない
 */
export function snapshotKey(snapshot: StateSnapshot): string {
  return `${snapshot.type}:${snapshot.id}`;
}

/**
 * 特定のバージョンを識別するフルキー（type:id:hash）
 * IndexedDB の状態ストアのキーとして使用
 */
export function fullSnapshotKey(snapshot: StateSnapshot): string {
  return `${snapshot.type}:${snapshot.id}:${snapshot.hash}`;
}

/**
 * フルキー文字列から StateSnapshot を復元
 */
export function parseFullSnapshotKey(key: string): StateSnapshot | undefined {
  const parts = key.split(':');
  if (parts.length !== 3) return undefined;

  const [type, id, hash] = parts;
  if (!type || !id || !hash) return undefined;

  return { type, id, hash };
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
  return a.type === b.type && a.id === b.id && a.hash === b.hash;
}
