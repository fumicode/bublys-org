/**
 * OS にロード済みのバブリのオリジンを覚えておくストア。
 *
 * 保存するのは **オリジンだけ**で、バンドル本体は持たない。
 * 起動時に `{origin}/bubly.js` を取り直すので、配信側を更新すれば
 * 次の起動で自動的に新しいバンドルが入る（配信側が落ちているときは
 * そのバブリだけ復元に失敗する。オリジンは消さずに残す）。
 */

const STORAGE_KEY = "bublys.loaded-bubly-origins";

/** 保存の形を 1 つに揃える（前後の空きと末尾スラッシュだけ） */
export const normalizeBublyOrigin = (origin: string): string =>
  origin.trim().replace(/\/$/, "");

/**
 * 打たれたものを、URL として読める形に組み直してオリジンだけ取り出す。
 * 読めなければ空。**捨てるためではなく、候補を 1 つ増やすために使う**。
 */
const foldToOrigin = (typed: string): string => {
  // 先頭が http / https なら、その後ろの区切りが崩れていても組み直す
  // （`http/localhost:4001` のような打ち損ない）。無ければ `http://` を補う
  const scheme = /^(https?)\b[:/]*(.*)$/i.exec(typed);
  const absolute = scheme ? `${scheme[1].toLowerCase()}://${scheme[2]}` : `http://${typed}`;
  try {
    const { origin } = new URL(absolute);
    return origin === "null" ? "" : origin;
  } catch {
    return "";
  }
};

/**
 * **打たれたもので取りに行けそうな先**を、確からしい順に並べて返す。
 *
 * ★ **打った字は捨てない。** こちらが読めなかっただけで打ち間違いとは限らないし、
 *   「形になっていない」と言って止めるのは、打った人にはただ開けないのと同じ。
 *   畳んだものを**先に**出して、打ったそのままも残す ── どちらで取りに行くかは
 *   打った人が選ぶ。
 * ★ 畳んだ結果が打ったものと同じなら 1 つだけ返る（選ぶ所は出さなくてよい）。
 */
export const bublyOriginCandidates = (typed: string): string[] => {
  const raw = typed.trim();
  if (!raw) return [];
  return [...new Set([foldToOrigin(raw), raw].filter(Boolean))];
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
