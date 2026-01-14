/**
 * StateHash
 * 状態データから一意なハッシュを生成するユーティリティ
 *
 * アルゴリズム: FNV-1a (64bit)
 * - 高速（同期実行）
 * - ブラウザ/Node.js 両対応
 * - djb2 より分散が良い
 */

// FNV-1a 64bit の定数（BigInt で計算）
const FNV_PRIME = BigInt('0x100000001b3');
const FNV_OFFSET = BigInt('0xcbf29ce484222325');
const MASK_64 = BigInt('0xffffffffffffffff');

/**
 * 状態データから hash を生成（同期版）
 *
 * @param stateData シリアライズ済みの状態データ
 * @returns 16文字の16進数 hash 文字列
 */
export function computeStateHash(stateData: unknown): string {
  // JSON を正規化（キーをソートして一意に）
  const normalized = normalizeJson(stateData);

  // FNV-1a 64bit hash
  let hash = FNV_OFFSET;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= BigInt(normalized.charCodeAt(i));
    hash = (hash * FNV_PRIME) & MASK_64;
  }

  // 16文字の16進数文字列に変換
  return hash.toString(16).padStart(16, '0');
}

/**
 * JSON を正規化（キーをソート）
 *
 * オブジェクトのキー順序に依存しない一意な文字列表現を生成する。
 * これにより { a: 1, b: 2 } と { b: 2, a: 1 } が同じ hash になる。
 */
function normalizeJson(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map(normalizeJson).join(',') + ']';
  }

  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = keys.map(
    (key) =>
      `${JSON.stringify(key)}:${normalizeJson((obj as Record<string, unknown>)[key])}`
  );
  return '{' + pairs.join(',') + '}';
}
