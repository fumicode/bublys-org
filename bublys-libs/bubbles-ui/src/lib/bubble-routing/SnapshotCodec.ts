/**
 * SnapshotCodec — バブル url で「<name>@<snapshot>」を encode/decode するペア。
 *
 * git の `HEAD@{N}` / docker の `image@digest` / npm の `pkg@version` と同じ
 * 「at this snapshot」イデオムを、特定の `<name>` に束ねた値オブジェクトとして
 * 表現する。世界線まわりの hook はこの codec を**呼び出し側から注入される**ので、
 * 「universe」のような特定の base 名前を知らずに済む。
 *
 * 通常は {@link makeSnapshotRoute} 経由で base 文字列1個から codec と url パターン
 * を一緒に派生させる（drift しないように）。
 */
export type SnapshotCodec = {
  /** node から `<base>@<node>` 形式の url 文字列を作る。 */
  encode: (node: string) => string;
  /** url 文字列から node を取り出す。snapshot 指定子が無ければ null。 */
  decode: (url: string) => string | null;
};

/** `<base>@<snapshot>` の区切り文字。git/docker/npm 等と同じ「at this snapshot」イデオム。 */
const AT_PREFIX = "@";

/**
 * `<base>@<node>` 文法の {@link SnapshotCodec} を base 文字列から生成する。
 *
 * バブルルート（{@link makeSnapshotRoute}）は url パターンも一緒に派生させるが、
 * ルートを介さない URL（例: root universe のブラウザパス `/universe@<node>`）でも
 * 同じ文法を使いたいので codec だけここで切り出す。
 */
export const makeSnapshotCodec = (base: string): SnapshotCodec => {
  const prefix = `${base}${AT_PREFIX}`;
  return {
    encode: (node) => `${prefix}${node}`,
    decode: (url) => (url.startsWith(prefix) ? url.slice(prefix.length) : null),
  };
};
