/**
 * 探す決まりのテスト。
 *
 * > 見つからないことより、**見つかったのに出ない**ほうが困る。
 *
 * 出所の違う行が混ざっているので、全角と半角・大小・空白の揺れで
 * 取りこぼさないことをここで見張る。
 */
import { describe, expect, it } from "vitest";
import type { SpotPlain } from "./Spot.domain.js";
import {
  countTags,
  listCities,
  matchesSpot,
  searchSpots,
  SPOT_SEARCH_LIMIT,
} from "./spotSearch.js";

const s = (o: Partial<SpotPlain> & { id: string; name: string }): SpotPlain => ({
  category: "sightseeing",
  lat: 37,
  lng: 139,
  ...o,
});

const SPOTS: SpotPlain[] = [
  s({ id: "a", name: "越後湯沢温泉", tags: ["温泉・入浴", "温泉地"], city: "湯沢町", region: "中越", address: "湯沢" }),
  s({ id: "b", name: "GALA湯沢スキー場", tags: ["スキー・スノーボード", "冬季"], city: "湯沢町", region: "中越" }),
  s({ id: "c", name: "今代司酒造", tags: ["酒蔵", "見学可"], city: "新潟市", region: "下越", address: "中央区" }),
  s({ id: "d", name: "星峠の棚田", tags: ["棚田"], city: "十日町市", region: "中越" }),
];

describe("字で探す", () => {
  it("名前の一部で見つかる", () => {
    expect(searchSpots(SPOTS, { text: "棚田" }).hits.map((x) => x.id)).toEqual(["d"]);
  });

  it("住所でも目印でも見つかる（どこに書いてあるかを人は知らない）", () => {
    expect(searchSpots(SPOTS, { text: "中央区" }).hits.map((x) => x.id)).toEqual(["c"]);
    expect(searchSpots(SPOTS, { text: "酒蔵" }).hits.map((x) => x.id)).toEqual(["c"]);
  });

  it("**全角と半角、大小を揃えてから比べる**", () => {
    expect(searchSpots(SPOTS, { text: "ｇａｌａ" }).hits.map((x) => x.id)).toEqual(["b"]);
    expect(searchSpots(SPOTS, { text: "gala" }).hits.map((x) => x.id)).toEqual(["b"]);
  });

  it("空白で区切った語は、すべて含むものだけ", () => {
    expect(searchSpots(SPOTS, { text: "湯沢 スキー" }).hits.map((x) => x.id)).toEqual(["b"]);
    expect(searchSpots(SPOTS, { text: "湯沢 酒蔵" }).hits).toEqual([]);
  });

  it("字を書かなければ、絞らない", () => {
    expect(searchSpots(SPOTS, {}).total).toBe(4);
    expect(searchSpots(SPOTS, { text: "   " }).total).toBe(4);
  });
});

describe("目印と市町村で絞る", () => {
  it("目印は**すべて**持つものだけ", () => {
    expect(searchSpots(SPOTS, { tags: ["温泉・入浴"] }).hits.map((x) => x.id)).toEqual(["a"]);
    expect(searchSpots(SPOTS, { tags: ["温泉・入浴", "棚田"] }).hits).toEqual([]);
  });

  it("市町村・地方で絞れる", () => {
    expect(searchSpots(SPOTS, { city: "湯沢町" }).total).toBe(2);
    expect(searchSpots(SPOTS, { region: "下越" }).hits.map((x) => x.id)).toEqual(["c"]);
  });

  it("字と絞り込みは重ねて効く", () => {
    expect(searchSpots(SPOTS, { text: "湯沢", tags: ["冬季"] }).hits.map((x) => x.id)).toEqual(["b"]);
  });
});

describe("多すぎるときは、数を言ってから切る", () => {
  const many = Array.from({ length: SPOT_SEARCH_LIMIT + 25 }, (_, i) =>
    s({ id: `x${i}`, name: `温泉${i}`, tags: ["温泉・入浴"] }),
  );

  it("出すのは上限まで。**見つかった数はそのまま言う**", () => {
    const r = searchSpots(many, { text: "温泉" });
    expect(r.hits.length).toBe(SPOT_SEARCH_LIMIT);
    expect(r.total).toBe(SPOT_SEARCH_LIMIT + 25);
  });

  it("上限は渡して変えられる", () => {
    expect(searchSpots(many, {}, 5).hits.length).toBe(5);
  });

  /**
   * ★ **押せる目印は、出している分ではなく当たった分から数える。**
   *   出している 40 件から数えると、先頭に出てこない目印は永久に押せない。
   */
  it("当たったものは、上限で切らずに全部返す", () => {
    const mixed = [
      ...Array.from({ length: SPOT_SEARCH_LIMIT }, (_, i) => s({ id: `h${i}`, name: `温泉${i}`, tags: ["温泉・入浴"] })),
      s({ id: "z", name: "奥の棚田", tags: ["棚田"] }),
    ];
    const r = searchSpots(mixed, {});
    expect(r.hits.length).toBe(SPOT_SEARCH_LIMIT);
    expect(r.matches.length).toBe(SPOT_SEARCH_LIMIT + 1);
    expect(countTags(r.matches).map((t) => t.tag)).toContain("棚田");
    expect(countTags(r.hits).map((t) => t.tag)).not.toContain("棚田");
  });
});

describe("次に絞れるものは、手元から数える", () => {
  it("目印は多い順", () => {
    const counted = countTags(SPOTS);
    expect(counted[0].count).toBeGreaterThanOrEqual(counted[counted.length - 1].count);
    expect(counted.find((c) => c.tag === "温泉・入浴")?.count).toBe(1);
  });

  /** ★ 漢字の並び順は ICU が決めるので書き写さない（`lodgingSearch.spec` の註） */
  it("市町村は重複なく出る", () => {
    const cities = listCities(SPOTS);
    expect([...cities].sort()).toEqual(["十日町市", "新潟市", "湯沢町"]);
    expect(new Set(cities).size).toBe(cities.length);
  });
});

describe("1 件ずつの見分け", () => {
  it("条件を 1 つも書かなければ、どれも当たる", () => {
    expect(SPOTS.every((x) => matchesSpot(x, {}))).toBe(true);
  });
});
