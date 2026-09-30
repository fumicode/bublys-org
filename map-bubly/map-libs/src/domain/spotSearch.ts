/**
 * **地点を探す。**
 *
 * > 越後だけで 793 件ある。**全部並べる**という答えは無い。
 *
 * ★ **出す数に上限を置く。** 一覧は 1 件につき泡を 1 つ作るので、793 件を並べると
 *   画面が持たない。見つかった数はそのまま言い、出すのは頭から何件か
 *   ── 「多すぎる」を黙って切るのではなく、**何件あるかを言ってから**切る。
 * ★ **字は正規化してから比べる。** 全角の英数と半角、大小、間の空白が混ざる
 *   （出所が違う行が並んでいる）。揃えずに比べると「ＪＲ」で「JR」が出ない。
 * ★ 空白で区切った語は**すべて含む**（AND）。「湯沢 温泉」で両方を含むものだけ。
 * ★ ここは純粋な計算。React も Redux も知らない。
 */
import type { SpotPlain } from "./Spot.domain.js";

/** 探す条件。どれも指定しなければ「ぜんぶ」 */
export type SpotQuery = {
  /** 字で探す（名前・住所・市町村・地方・目印のどこかに当たれば） */
  readonly text?: string;
  /** この目印を**すべて**持つものだけ */
  readonly tags?: readonly string[];
  readonly city?: string;
  readonly region?: string;
};

export type SpotSearchResult = {
  /** 出す分（上限まで） */
  readonly hits: readonly SpotPlain[];
  /**
   * **当たったものぜんぶ**（上限で切る前）。
   *
   * ★ 次に絞れる目印は、これを数える ── 出している 40 件から数えると、
   *   **先頭 40 件に出てくる目印しか押せない**（実測で踏んだ）。
   */
  readonly matches: readonly SpotPlain[];
  /** 見つかった数 */
  readonly total: number;
};

/** 一度に出す数。これ以上は「まだある」とだけ言う */
export const SPOT_SEARCH_LIMIT = 40;

/**
 * 比べるための形に揃える ── 全角と半角、大小、間の空白。
 * `NFKC` は「ＪＲ」を「JR」に、「１」を「1」にする。
 */
const normalize = (s: string): string => s.normalize("NFKC").toLowerCase().replace(/\s+/g, "");

/** その地点の、字で探される所を 1 本に繋げたもの */
const haystack = (s: SpotPlain): string =>
  normalize([s.name, s.address ?? "", s.city ?? "", s.region ?? "", s.note ?? "", ...(s.tags ?? [])].join(" "));

/** 空白で切った語。1 つも無ければ「字では絞らない」 */
const terms = (text: string | undefined): string[] =>
  (text ?? "").trim().split(/\s+/).map(normalize).filter(Boolean);

export const matchesSpot = (spot: SpotPlain, query: SpotQuery): boolean => {
  if (query.city && spot.city !== query.city) return false;
  if (query.region && spot.region !== query.region) return false;
  if (query.tags?.length) {
    const have = spot.tags ?? [];
    if (!query.tags.every((t) => have.includes(t))) return false;
  }
  const words = terms(query.text);
  if (words.length === 0) return true;
  const hay = haystack(spot);
  return words.every((w) => hay.includes(w));
};

export const searchSpots = (
  spots: readonly SpotPlain[],
  query: SpotQuery,
  limit: number = SPOT_SEARCH_LIMIT,
): SpotSearchResult => {
  const found = spots.filter((s) => matchesSpot(s, query));
  return { hits: found.slice(0, limit), matches: found, total: found.length };
};

/**
 * いま出ているものから、**次に絞れる目印**を数えて返す（多い順）。
 *
 * ★ 目印の一覧を決め打ちで持たない ── 調べ物が増えたら目印も増えるので、
 *   写しを持つと必ず古くなる。**いま手元にあるものから数える**。
 */
export const countTags = (spots: readonly SpotPlain[]): Array<{ tag: string; count: number }> => {
  const n = new Map<string, number>();
  for (const s of spots) for (const t of s.tags ?? []) n.set(t, (n.get(t) ?? 0) + 1);
  return [...n.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "ja"));
};

/** 市町村も同じく、手元にあるものから（名前順） */
export const listCities = (spots: readonly SpotPlain[]): string[] =>
  [...new Set(spots.map((s) => s.city).filter((c): c is string => !!c))].sort((a, b) =>
    a.localeCompare(b, "ja"),
  );
