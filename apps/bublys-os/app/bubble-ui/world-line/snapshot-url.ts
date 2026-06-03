/**
 * universe URL grammar — `<name>@<node>` という単一文法で「universe を
 * このスナップショットで見ている」を表す。
 *
 * - **ブラウザのアドレスバー**:
 *     /universe@<node>
 *     ↑ root universe を node ノードで見ている
 *
 * - **ネスト universe バブルの url**:
 *     universe@<node>
 *     ↑ そのネスト universe を node ノードで見ている
 *
 * root も nest も同じ「universe@<node>」で揃う。`@` は git の `HEAD@{N}` /
 * docker の `image@digest` / npm の `pkg@version` と同じ「at this snapshot」
 * イデオム。<name>@<node> という1つの読みでブラウザ url とバブル url の両方を貫く。
 */

/** snapshot 指定子の prefix。 */
export const AT_PREFIX = "@";

/** universe を表す名前（root のブラウザ url・ネスト universe バブル url の両方）。 */
export const UNIVERSE_URL_BASE = "universe";

/** `universe@<node>` を組み立てる。node 省略時はベースのみ（未スナップショット）。 */
export const buildUniverseUrl = (node?: string | null): string =>
  node ? `${UNIVERSE_URL_BASE}${AT_PREFIX}${node}` : UNIVERSE_URL_BASE;

/** `universe@<node>` 文字列から node を取り出す。`universe` だけなら null。 */
export const readUniverseAt = (url: string): string | null => {
  const prefix = `${UNIVERSE_URL_BASE}${AT_PREFIX}`;
  return url.startsWith(prefix) ? url.slice(prefix.length) : null;
};
