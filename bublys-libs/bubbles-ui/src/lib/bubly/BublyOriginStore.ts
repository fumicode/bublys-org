/**
 * OS にロード済みのバブリのオリジンを覚えておくストア。
 *
 * 保存するのは **オリジンだけ**で、バンドル本体は持たない。
 * 起動時に `{origin}/bubly.js` を取り直すので、配信側を更新すれば
 * 次の起動で自動的に新しいバンドルが入る（配信側が落ちているときは
 * そのバブリだけ復元に失敗する。オリジンは消さずに残す）。
 */

const STORAGE_KEY = "bublys.loaded-bubly-origins";

/**
 * **打たれたものを、オリジン 1 つに畳む。**
 *
 * 取りに行くのは `{origin}/bubly.js` だけなので、その手前は何であってもよい
 * ── 配信先のページをそのまま貼れるし、`http://` を省いてもよい。
 * 畳めなければ空文字を返す（呼ぶ側はそれを「押せない」の合図に使う）。
 *
 * ★ **比較と保存もここを通る。** `localhost:4001` と `http://localhost:4001/`
 *   を別のものとして 2 回覚えないため、畳むのはこの 1 か所に集める。
 * ★ `http/localhost:4001` のような**コロンの打ち損ない**も直す。直さないと
 *   `http://` を足した相対パスとして OS 自身を取りに行き、404 の HTML を
 *   JavaScript として読んで `Unexpected token '<'` になる（実測）。
 */
export const normalizeBublyOrigin = (origin: string): string => {
  const typed = origin.trim();
  if (!typed) return "";

  // 先頭が http / https なら、その後ろの区切りが崩れていても組み直す。
  // そうでなければ `http://` を補う（`localhost:4001` や `bublys.ooo`）
  const scheme = /^(https?)\b[:/]*(.*)$/i.exec(typed);
  const absolute = scheme ? `${scheme[1].toLowerCase()}://${scheme[2]}` : `http://${typed}`;

  try {
    // origin は「scheme + ホスト + ポート」だけ。道もクエリも印も落ちる
    const { origin: only } = new URL(absolute);
    return only === "null" ? "" : only;
  } catch {
    return "";
  }
};

const readRaw = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    // プライベートモード等で localStorage が使えないケース
    return [];
  }
};

const writeRaw = (origins: string[]): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(origins));
  } catch {
    // 保存できなくても現在のセッションのロード自体は成功しているので握り潰す
  }
};

/** 保存済みのバブリオリジン一覧 */
export const getSavedBublyOrigins = (): string[] => readRaw();

/** バブリオリジンを覚える（重複は作らない） */
export const rememberBublyOrigin = (origin: string): void => {
  const normalized = normalizeBublyOrigin(origin);
  if (!normalized) return;
  const origins = readRaw();
  if (origins.includes(normalized)) return;
  writeRaw([...origins, normalized]);
};

/** バブリオリジンを忘れる */
export const forgetBublyOrigin = (origin: string): void => {
  const normalized = normalizeBublyOrigin(origin);
  writeRaw(readRaw().filter((o) => o !== normalized));
};
