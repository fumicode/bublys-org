/**
 * URLからIDを抽出するユーティリティ関数
 */

/**
 * URLの最後のセグメントを取得（通常はID）
 * 例: "users/123" -> "123"
 * 例: "user-groups/abc-def" -> "abc-def"
 */
export function extractIdFromUrl(url: string): string | undefined {
  if (!url) return undefined;
  const segments = url.split('/').filter(Boolean);
  return segments[segments.length - 1];
}

/**
 * URLからリソースタイプを取得
 * 例: "users/123" -> "users"
 * 例: "user-groups/abc" -> "user-groups"
 */
export function extractTypeFromUrl(url: string): string | undefined {
  if (!url) return undefined;
  const segments = url.split('/').filter(Boolean);
  return segments[0];
}

/**
 * bubble typeとIDからURLを構築
 * 例: ("users", "123") -> "users/123"
 */
export function buildUrl(type: string, id: string): string {
  return `${type}/${id}`;
}
