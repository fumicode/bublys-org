/**
 * **宿を探す。**
 *
 * > 越後だけで 1,516 軒ある。**全部並べる**という答えは無い。
 *
 * ★ **出す数に上限を置く。** 一覧は 1 件につき泡を 1 つ作るので、1,500 軒を並べると
 *   画面が持たない。見つかった数はそのまま言い、出すのは頭から何件か。
 * ★ **字は正規化してから比べる。** 出所の違う行が並んでいるので、全角と半角・
 *   大小・空白が混ざる。揃えずに比べると「ホテル」で当たるのに「ＨＯＴＥＬ」で当たらない。
 * ★ 空白で区切った語は**すべて含む**（AND）。
 * ★ ここは純粋な計算。React も Redux も知らない。
 */
import type { LodgingPlain } from "./Lodging.domain.js";

/** 探す条件。どれも指定しなければ「ぜんぶ」 */
export type LodgingQuery = {
  /** 字で探す（名前・住所・エリア・市町村・区分のどこかに当たれば） */
  readonly text?: string;
  /** 区分（ホテル・旅館・民宿…）。前方一致ではなく**含む**で見る */
  readonly kind?: string;
  /** エリア・温泉地 */
  readonly area?: string;
  readonly city?: string;
  readonly region?: string;
};

export type LodgingSearchResult = {
  /** 出す分（上限まで） */
  readonly hits: readonly LodgingPlain[];
  /**
   * **当たったものぜんぶ**（上限で切る前）。
   *
   * ★ 次に絞れる選択肢は、これを数える ── 出している 40 軒から数えると、
   *   **1,516 軒のうち先頭 40 軒に出てくる区分しか選べない**（実測で踏んだ：
   *   区分が 6 種しか出なかった）。
   */
  readonly matches: readonly LodgingPlain[];
  /** 見つかった数 */
  readonly total: number;
};

/** 一度に出す数 */
export const LODGING_SEARCH_LIMIT = 40;

const normalize = (s: string): string => s.normalize("NFKC").toLowerCase().replace(/\s+/g, "");

const haystack = (l: LodgingPlain): string =>
  normalize(
    [l.name, l.kind ?? "", l.address ?? "", l.area ?? "", l.city ?? "", l.region ?? ""].join(" "),
  );

const terms = (text: string | undefined): string[] =>
  (text ?? "").trim().split(/\s+/).map(normalize).filter(Boolean);

export const matchesLodging = (lodging: LodgingPlain, query: LodgingQuery): boolean => {
  if (query.area && lodging.area !== query.area) return false;
  if (query.city && lodging.city !== query.city) return false;
  if (query.region && lodging.region !== query.region) return false;
  /**
   * ★ 区分だけは**含む**で見る。出所の呼び方が「旅館」「旅館・宿」「ゲストハウス/民宿」と
   *   揺れているので、ぴったり一致にすると「旅館」で「旅館・宿」が落ちる。
   */
  if (query.kind && !normalize(lodging.kind ?? "").includes(normalize(query.kind))) return false;
  const words = terms(query.text);
  if (words.length === 0) return true;
  const hay = haystack(lodging);
  return words.every((w) => hay.includes(w));
};

export const searchLodgings = (
  lodgings: readonly LodgingPlain[],
  query: LodgingQuery,
  limit: number = LODGING_SEARCH_LIMIT,
): LodgingSearchResult => {
  const found = lodgings.filter((l) => matchesLodging(l, query));
  return { hits: found.slice(0, limit), matches: found, total: found.length };
};

/**
 * 手元にあるものから、絞り込みの選択肢を数えて出す。
 *
 * ★ 決め打ちの一覧を持たない ── 調べ物が増えたら選択肢も増えるので、
 *   写しを持つと必ず古くなる。
 */
const tally = (values: ReadonlyArray<string | undefined>): Array<{ value: string; count: number }> => {
  const n = new Map<string, number>();
  for (const v of values) if (v) n.set(v, (n.get(v) ?? 0) + 1);
  return [...n.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, "ja"));
};

export const countKinds = (list: readonly LodgingPlain[]) => tally(list.map((l) => l.kind));
export const countAreas = (list: readonly LodgingPlain[]) => tally(list.map((l) => l.area));

/** 市町村は名前順（数の多い少ないより、探しやすさ） */
export const listLodgingCities = (list: readonly LodgingPlain[]): string[] =>
  [...new Set(list.map((l) => l.city).filter((c): c is string => !!c))].sort((a, b) =>
    a.localeCompare(b, "ja"),
  );
