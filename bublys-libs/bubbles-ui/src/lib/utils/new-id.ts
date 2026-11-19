/**
 * 新しい ID（UUID v4）を作る。
 *
 * ★ `crypto.randomUUID()` は**安全な接続（HTTPS か localhost）でしか使えない**。
 *   スマホの実機で確かめるために、同じ Wi-Fi の PC の dev サーバーへ
 *   `http://192.168.x.x:4006` のように IP でつなぐと、関数そのものが無くて
 *   最初のバブルを作るところで落ちていた（`crypto.randomUUID is not a function`）。
 *   `crypto.getRandomValues()` は安全でない接続でも使えるので、無いときはそれで作る。
 *   公開版（HTTPS）では `randomUUID` があるので、そちらを使う。
 */
export function newId(): string {
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === "function") return c.randomUUID();
  const bytes = new Uint8Array(16);
  c.getRandomValues(bytes);
  // RFC 4122 の v4：版（4）と変種（10xx）のビットを立てる
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
