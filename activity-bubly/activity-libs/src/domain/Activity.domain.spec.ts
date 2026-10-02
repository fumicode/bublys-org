/**
 * アクティビティのテスト。
 *
 * ★ 見ているのは 2 つ ── **読み方**（時間と金額の言い換え）と、
 *   **役の名乗り**。役がずれると、旅程に落としたときに時間も金額も既定に落ちるが、
 *   落ちたことは画面のどこにも出ない（黙って 60 分になる）ので、ここで止める。
 */
import { describe, expect, it } from "vitest";
import { getRoleField, readRoleNumber, readRoleText } from "@bublys-org/domain-registry/schema";
import { ACTIVITY_SHAPE, Activity_アクティビティ } from "./Activity.domain.js";

const activity = Activity_アクティビティ.fromPlain({
  id: "a1",
  name: "芦ノ湖遊覧船",
  place: { type: "Spot", id: "motohakone" },
  durationMin: 90,
  price: 1500,
  rating: 4.4,
  reviewCount: 120,
  description: "遊覧船",
});

describe("読み方", () => {
  it("時間は人の言い方にする", () => {
    expect(activity.durationLabel).toBe("1時間30分");
    expect(Activity_アクティビティ.fromPlain({ ...activity.state, durationMin: 60 }).durationLabel).toBe("1時間");
    expect(Activity_アクティビティ.fromPlain({ ...activity.state, durationMin: 45 }).durationLabel).toBe("45分");
  });

  it("0 円は「無料」と言う（¥0 とは書かない）", () => {
    expect(activity.priceLabel).toBe("¥1,500");
    expect(Activity_アクティビティ.fromPlain({ ...activity.state, price: 0 }).priceLabel).toBe("無料");
  });
});

describe("不変", () => {
  it("名前を変えても元は変わらない", () => {
    const next = activity.withName("遊覧船");
    expect(next.name).toBe("遊覧船");
    expect(activity.name).toBe("芦ノ湖遊覧船");
  });

  it("保存形と行き来しても中身が変わらない", () => {
    expect(Activity_アクティビティ.fromPlain(activity.toPlain()).toPlain()).toEqual(activity.state);
  });
});

describe("役の名乗り", () => {
  it("題名・時間・金額・場所を名乗っている", () => {
    expect(getRoleField(ACTIVITY_SHAPE, "title")?.name).toBe("name");
    expect(getRoleField(ACTIVITY_SHAPE, "duration")?.name).toBe("durationMin");
    expect(getRoleField(ACTIVITY_SHAPE, "money")?.name).toBe("price");
    expect(getRoleField(ACTIVITY_SHAPE, "place")?.name).toBe("place");
  });

  it("**相手はこの型を知らないまま**、役だけで中身を読める", () => {
    const plain = activity.toPlain();
    expect(readRoleText(ACTIVITY_SHAPE, plain, "title")).toBe("芦ノ湖遊覧船");
    expect(readRoleNumber(ACTIVITY_SHAPE, plain, "duration")).toBe(90);
    expect(readRoleNumber(ACTIVITY_SHAPE, plain, "money")).toBe(1500);
  });
});
