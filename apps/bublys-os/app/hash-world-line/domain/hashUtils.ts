/**
 * hashUtils.ts
 * JSON正規化ユーティリティ
 *
 * 注: ハッシュ計算は不要になったため削除。
 * タイムスタンプベースの識別子を使用する。
 */

/**
 * オブジェクトをソートされた改行・空白なしのJSON文字列に正規化
 *
 * 同じオブジェクトは常に同じJSON文字列になるように、
 * キーをアルファベット順にソートします。
 *
 * 主にデバッグや比較用途に使用。
 */
export function normalizeJson(obj: unknown): string {
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
    const value = normalizeJson((obj as Record<string, unknown>)[key]);
    return `"${key}":${value}`;
  });

  return `{${pairs.join(',')}}`;
}
