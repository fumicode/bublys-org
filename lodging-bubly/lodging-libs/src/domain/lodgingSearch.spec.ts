/**
 * 宿を探す決まりのテスト。
 *
 * > 見つからないことより、**見つかったのに出ない**ほうが困る。
 *
 * 出所の違う行が混ざっていて、区分の呼び方も揺れている（「旅館」「旅館・宿」）。
 * そこで取りこぼさないことをここで見張る。
 */
import { describe, expect, it } from "vitest";
import type { LodgingPlain } from "./Lodging.domain.js";
import {
  countAreas,
  countKinds,
  listLodgingCities,
  LODGING_SEARCH_LIMIT,
  searchLodgings,
} from "./lodgingSearch.js";

const l = (o: Partial<LodgingPlain> & { id: string; name: string }): LodgingPlain => ({
  lat: 37,
  lng: 139,
  ...o,
});

const STAYS: LodgingPlain[] = [
  l({ id: "a", name: "湯沢グランドホテル", kind: "ホテル", area: "越後湯沢", city: "湯沢町", region: "中越" }),
  l({ id: "b", name: "旅館 山の宿", kind: "旅館・宿", area: "越後湯沢", city: "湯沢町", region: "中越" }),
  l({ id: "c", name: "GUEST HOUSE 雪", kind: "ゲストハウス/民宿", area: "赤倉温泉", city: "妙高市", region: "上越" }),
  l({ id: "d", name: "ペンションこまくさ", kind: "ペンション", area: "赤倉温泉", city: "妙高市", region: "上越" }),
];

describe("字で探す", () => {
  it("名前の一部で見つかる", () => {
    expect(searchLodgings(STAYS, { text: "こまくさ" }).hits.map((x) => x.id)).toEqual(["d"]);
  });

  it("エリアでも区分でも見つかる（どこに書いてあるかを人は知らない）", () => {
    expect(searchLodgings(STAYS, { text: "赤倉" }).total).toBe(2);
    expect(searchLodgings(STAYS, { text: "ペンション" }).hits.map((x) => x.id)).toEqual(["d"]);
  });

  it("**全角と半角、大小を揃えてから比べる**", () => {
    expect(searchLodgings(STAYS, { text: "guest" }).hits.map((x) => x.id)).toEqual(["c"]);
    expect(searchLodgings(STAYS, { text: "ｇｕｅｓｔ" }).hits.map((x) => x.id)).toEqual(["c"]);
  });

  it("空白で区切った語は、すべて含むものだけ", () => {
    expect(searchLodgings(STAYS, { text: "湯沢 ホテル" }).hits.map((x) => x.id)).toEqual(["a"]);
  });
});

describe("区分で絞る", () => {
  it("**呼び方が揺れていても落とさない** ── 区分は含むで見る", () => {
    // 「旅館」で「旅館・宿」も当てる
    expect(searchLodgings(STAYS, { kind: "旅館" }).hits.map((x) => x.id)).toEqual(["b"]);
    // 「民宿」で「ゲストハウス/民宿」も当てる
    expect(searchLodgings(STAYS, { kind: "民宿" }).hits.map((x) => x.id)).toEqual(["c"]);
  });

  it("エリア・市町村・地方はぴったりで絞る", () => {
    expect(searchLodgings(STAYS, { area: "赤倉温泉" }).total).toBe(2);
    expect(searchLodgings(STAYS, { city: "湯沢町" }).total).toBe(2);
    expect(searchLodgings(STAYS, { region: "上越" }).total).toBe(2);
  });

  it("字と絞り込みは重ねて効く", () => {
    expect(searchLodgings(STAYS, { text: "雪", region: "上越" }).hits.map((x) => x.id)).toEqual(["c"]);
  });
});

describe("多すぎるときは、数を言ってから切る", () => {
  const many = Array.from({ length: LODGING_SEARCH_LIMIT + 10 }, (_, i) =>
    l({ id: `x${i}`, name: `宿${i}`, kind: "ホテル" }),
  );

  it("出すのは上限まで。見つかった数はそのまま言う", () => {
    const r = searchLodgings(many, { kind: "ホテル" });
    expect(r.hits.length).toBe(LODGING_SEARCH_LIMIT);
    expect(r.total).toBe(LODGING_SEARCH_LIMIT + 10);
  });

  /**
   * ★ **絞り込みの選択肢は、出している分ではなく当たった分から数える。**
   *   出している 40 軒から数えると、先頭に出てこない区分は**永久に選べない**
   *   ── 実測で踏んだ（1,516 軒あるのに区分が 6 種しか出なかった）。
   */
  it("当たったものは、上限で切らずに全部返す", () => {
    const mixed = [
      ...Array.from({ length: LODGING_SEARCH_LIMIT }, (_, i) => l({ id: `h${i}`, name: `ホテル${i}`, kind: "ホテル" })),
      l({ id: "z", name: "奥の民宿", kind: "民宿" }),
    ];
    const r = searchLodgings(mixed, {});
    expect(r.hits.length).toBe(LODGING_SEARCH_LIMIT);
    expect(r.matches.length).toBe(LODGING_SEARCH_LIMIT + 1);
    // 上限の外に居る「民宿」も、選択肢としては出てくる
    expect(countKinds(r.matches).map((k) => k.value)).toContain("民宿");
    expect(countKinds(r.hits).map((k) => k.value)).not.toContain("民宿");
  });
});

describe("絞り込みの選択肢は、手元から数える", () => {
  it("区分とエリアは多い順", () => {
    expect(countAreas(STAYS)[0].count).toBe(2);
    expect(countKinds(STAYS).map((k) => k.value)).toContain("ホテル");
  });

  /**
   * ★ **漢字の並び順は書き写さない。** 並べるのは `localeCompare(…, "ja")` に任せていて、
   *   その順は ICU（動かす所）が決める ── ここに答えを書くと、別の環境で落ちる。
   *   見るのは「重複が無いこと」と「毎回同じ順であること」。
   */
  it("市町村は重複なく出る", () => {
    const cities = listLodgingCities(STAYS);
    expect([...cities].sort()).toEqual(["妙高市", "湯沢町"]);
    expect(new Set(cities).size).toBe(cities.length);
    expect(listLodgingCities(STAYS)).toEqual(cities);
  });
});

describe("空でも落ちない", () => {
  it("条件を 1 つも書かなければ、ぜんぶ", () => {
    expect(searchLodgings(STAYS, {}).total).toBe(4);
  });

  it("1 軒も無ければ、0 件", () => {
    expect(searchLodgings([], { text: "湯沢" })).toEqual({ hits: [], matches: [], total: 0 });
  });
});
