/**
 * ★ **アプリの外へは一切つながない。**
 *
 * 行政の現場ではネット接続が禁止されている。「つながらないはず」ではなく、
 * つなごうとしたら止める ── ことで、知らないうちに外へ出ていく通信（外部の画像・
 * フォント・解析など、将来だれかが足してしまうもの）も含めて閉じておく。
 *
 * 通してよいのは、アプリが自分で配っている画面と、ブラウザの中で完結するものだけ。
 */
const ALLOWED_PROTOCOLS = new Set([
  "app:", // 自分で配っている画面
  "blob:", // ブラウザの中で作ったデータ（ワールドファイルのダウンロードなど）
  "data:", // 埋め込みのデータ
  "devtools:", // 開発者ツール（開発中だけ開ける）
]);

/** そのリクエストを通してよいか */
export function isAllowedRequest(url: string): boolean {
  try {
    return ALLOWED_PROTOCOLS.has(new URL(url).protocol);
  } catch {
    return false;
  }
}
