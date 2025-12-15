/**
 * hashUtils.ts
 * JSON正規化とハッシュ計算ユーティリティ
 */

/**
 * オブジェクトをソートされた改行・空白なしのJSON文字列に正規化
 *
 * 同じオブジェクトは常に同じJSON文字列になるように、
 * キーをアルファベット順にソートします。
 */
export function normalizeJson(obj: any): string {
  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';

  // プリミティブ型
  if (typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  // 配列
  if (Array.isArray(obj)) {
    const items = obj.map(item => normalizeJson(item));
    return `[${items.join(',')}]`;
  }

  // オブジェクト：キーをソート
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map(key => {
    const value = normalizeJson(obj[key]);
    return `"${key}":${value}`;
  });

  return `{${pairs.join(',')}}`;
}

/**
 * 文字列から SHA-256 ハッシュを計算（ブラウザ環境）
 */
export async function computeHash(data: string): Promise<string> {
  // ブラウザの SubtleCrypto API を使用
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);

  // ArrayBuffer を16進数文字列に変換
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * オブジェクトから直接ハッシュを計算（正規化 + ハッシュ）
 *
 * @param obj ハッシュ対象のオブジェクト
 * @param includeTimestamp タイムスタンプを含めるか（同じ状態でも異なるハッシュを生成）
 */
export async function computeObjectHash(
  obj: unknown,
  includeTimestamp = true
): Promise<string> {
  const dataToHash = includeTimestamp
    ? { ...obj as object, __timestamp: Date.now(), __nonce: Math.random() }
    : obj;
  const normalized = normalizeJson(dataToHash);
  return await computeHash(normalized);
}

/**
 * 同期版（テスト用）
 * 本番ではasync版を使用してください
 */
export function computeHashSync(data: string): string {
  // 簡易版：単純な文字列ハッシュ（開発/テスト用）
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}
