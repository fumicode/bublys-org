/**
 * 旅程のテスト ── **落としたものが予定になる**所が主。
 * ここが狂うと、掴んで落としても時刻が重なったり、金額が合わなくなる。
 */
import { describe, expect, it } from "vitest";
import { Itinerary_旅程, type ItineraryPlain } from "./Itinerary.domain.js";
import { formatMin, parseMin } from "./ItineraryItem.domain.js";

const hm = (h: number, m: number) => h * 60 + m;

const base: ItineraryPlain = {
  id: "t1",
  title: "箱根",
  days: [
    {
      date: "2026-05-17",
      items: [
        { id: "a", startMin: hm(9, 0), endMin: hm(10, 0), title: "朝の散歩", kind: "sightseeing", cost: 0, ref: { type: "Spot", id: "s1" } },
        { id: "b", startMin: hm(12, 0), endMin: hm(13, 0), title: "昼食", kind: "meal", cost: 1500, ref: { type: "Spot", id: "s2" } },
      ],
    },
    { date: "2026-05-18", items: [] },
  ],
};

const itinerary = Itinerary_旅程.fromPlain(base);

describe("Itinerary_旅程", () => {
  it("落としたものは、その日の最後の後ろに継ぐ", () => {
    const next = itinerary.appended("2026-05-17", {
      id: "c",
      title: "遊覧船",
      durationMin: 60,
      kind: "sightseeing",
      cost: 1500,
      ref: { type: "Activity", id: "a3" },
      activityId: "act1",
    });
    const added = next.findItem("c");
    // 最後の終わり 13:00 ＋ すき間 15 分
    expect(added?.startMin).toBe(hm(13, 15));
    expect(added?.endMin).toBe(hm(14, 15));
    expect(added?.ref).toEqual({ type: "Activity", id: "a3" });
  });

  it("その日が空なら 9:00 から始める", () => {
    const next = itinerary.appended("2026-05-18", {
      id: "d",
      title: "参拝",
      durationMin: 45,
      kind: "sightseeing",
    });
    expect(next.findItem("d")?.startMin).toBe(hm(9, 0));
    expect(next.findItem("d")?.endMin).toBe(hm(9, 45));
  });

  it("まだ無い日に落とすと、その日が生まれる（日付の順に入る）", () => {
    const next = itinerary.appended("2026-05-16", { id: "e", title: "前泊", durationMin: 30, kind: "stay" });
    expect(next.dates).toEqual(["2026-05-16", "2026-05-17", "2026-05-18"]);
  });

  it("予定は必ず始まりの早い順に並ぶ", () => {
    const moved = itinerary.withItem(itinerary.findItem("b")!.withTime(hm(7, 0), hm(8, 0)));
    expect(moved.day("2026-05-17")!.items.map((i) => i.id)).toEqual(["b", "a"]);
  });

  it("但し書きのある費用は合計に足さない（別勘定なので）", () => {
    const withStay = itinerary.appended("2026-05-17", { id: "f", title: "チェックイン", durationMin: 30, kind: "stay" });
    const noted = withStay.withItem(
      Itinerary_旅程.fromPlain({
        ...withStay.toPlain(),
        days: withStay.toPlain().days.map((d) => ({
          ...d,
          items: d.items.map((i) => (i.id === "f" ? { ...i, cost: 19200, costNote: "宿泊費別" } : i)),
        })),
      }).findItem("f")!,
    );
    expect(noted.totalCost).toBe(1500);
  });

  it("外すと合計も減る", () => {
    expect(itinerary.totalCost).toBe(1500);
    expect(itinerary.withoutItem("b").totalCost).toBe(0);
  });

  it("その日に立ち寄る先を、時刻の順で言える（地図へ渡す道）", () => {
    expect(itinerary.day("2026-05-17")!.refs).toEqual([
      { type: "Spot", id: "s1" },
      { type: "Spot", id: "s2" },
    ]);
  });

  it("保存形と行き来しても中身が変わらない", () => {
    expect(Itinerary_旅程.fromPlain(itinerary.toPlain()).toPlain()).toEqual(base);
  });

  it("元のインスタンスは変わらない（不変）", () => {
    itinerary.appended("2026-05-17", { id: "x", title: "y", durationMin: 10, kind: "other" });
    expect(itinerary.day("2026-05-17")!.items).toHaveLength(2);
  });
});

describe("時刻の読み書き", () => {
  it("分と HH:MM を往復できる", () => {
    expect(formatMin(hm(8, 30))).toBe("08:30");
    expect(parseMin("08:30")).toBe(hm(8, 30));
    expect(parseMin("8:30")).toBe(hm(8, 30));
  });

  it("読めない時刻は undefined（黙って 0 時にしない）", () => {
    expect(parseMin("25:00")).toBeUndefined();
    expect(parseMin("08:70")).toBeUndefined();
    expect(parseMin("あさ")).toBeUndefined();
  });
});

describe("時刻と費用を直す", () => {
  const item = itinerary.findItem("a")!; // 09:00 - 10:00

  it("始まりを動かすと、予定ごと動く（長さはそのまま）", () => {
    const moved = item.withStart(hm(8, 0));
    expect(moved.startMin).toBe(hm(8, 0));
    expect(moved.endMin).toBe(hm(9, 0));
  });

  it("終わりを動かすと、長さが変わる（始まりは動かない）", () => {
    const longer = item.withEnd(hm(12, 0));
    expect(longer.startMin).toBe(hm(9, 0));
    expect(longer.endMin).toBe(hm(12, 0));
  });

  it("終わりは始まりより前にできない（時刻が逆さまにならない）", () => {
    expect(item.withEnd(hm(7, 0)).endMin).toBe(hm(9, 0));
  });

  it("その日の外へは出さない", () => {
    expect(item.withStart(-60).startMin).toBe(0);
    expect(item.withEnd(hm(30, 0)).endMin).toBe(23 * 60 + 59);
    // 始まりを終わり際へ動かしても、終わりはその日に収まる
    expect(item.withStart(hm(23, 30)).endMin).toBe(23 * 60 + 59);
  });

  it("費用はマイナスにならない。小数は丸める", () => {
    expect(item.withCost(-100).cost).toBe(0);
    expect(item.withCost(1234.6).cost).toBe(1235);
  });

  it("直しても元のインスタンスは変わらない", () => {
    item.withStart(hm(8, 0));
    item.withCost(999);
    expect(item.startMin).toBe(hm(9, 0));
    expect(item.cost).toBe(0);
  });
});
