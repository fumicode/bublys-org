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
