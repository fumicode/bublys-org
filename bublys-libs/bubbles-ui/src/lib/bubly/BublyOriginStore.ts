/**
 * OS にロード済みのバブリのオリジンを覚えておくストア。
 *
 * 保存するのは **オリジンだけ**で、バンドル本体は持たない。
 * 起動時に `{origin}/bubly.js` を取り直すので、配信側を更新すれば
 * 次の起動で自動的に新しいバンドルが入る（配信側が落ちているときは
 * そのバブリだけ復元に失敗する。オリジンは消さずに残す）。
 */

const STORAGE_KEY = "bublys.loaded-bubly-origins";

/** 末尾スラッシュを落として比較・保存の形を 1 つに揃える */
export const normalizeBublyOrigin = (origin: string): string =>
  origin.trim().replace(/\/$/, "");

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
