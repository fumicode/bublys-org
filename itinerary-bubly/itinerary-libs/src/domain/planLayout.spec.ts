/**
 * 置き場所の決まりのテスト。
 *
 * > 向きは「どの仲間か」。近さは「どれくらい埋まっているか」。
 *
 * ここが狂うと、**散らばり方が嘘をつく** ── 見た目が関係を表すと言っている以上、
 * 同じ仲間が別の向きへ飛んだり、決まっているものが遠くへ行ったりしてはいけない。
 */
import { describe, expect, it } from "vitest";
import { MAX_KNOWN, planPositions, type PlanPiece } from "./planLayout.js";

const p = (url: string, group: string, known: number): PlanPiece => ({ url, group, known });
const angle = (s: { x: number; y: number }) => Math.round((Math.atan2(s.y, s.x) * 180) / Math.PI);
const dist = (s: { x: number; y: number }) => Math.round(Math.hypot(s.x, s.y));

describe("向きは「どの仲間か」", () => {
  it("同じ仲間は、同じ向きに並ぶ", () => {
    const at = planPositions([p("a", "行きたい", 2), p("b", "行きたい", 2), p("c", "行きたい", 2)]);
    const angles = ["a", "b", "c"].map((u) => angle(at.get(u)!));
    // 同じ段なので、横へずれるぶんだけ角度は違うが、同じ側に居る
    expect(angles.every((deg) => Math.abs(deg - angles[0]) < 45)).toBe(true);
  });

  it("違う仲間は、違う向きへ行く", () => {
    const at = planPositions([p("a", "行きたい", 2), p("b", "やること", 2)]);
    expect(angle(at.get("a")!)).not.toBe(angle(at.get("b")!));
  });

  it("仲間が 9 つ目からは、同じ向きの外側に回る（向きは増やさない）", () => {
    const pieces = Array.from({ length: 9 }, (_, i) => p(`u${i}`, `g${i}`, MAX_KNOWN));
    const at = planPositions(pieces);
    expect(angle(at.get("u8")!)).toBe(angle(at.get("u0")!));
    expect(dist(at.get("u8")!)).toBeGreaterThan(dist(at.get("u0")!));
  });
});

describe("近さは「どれくらい埋まっているか」", () => {
  it("よく埋まっているものほど、中心に近い", () => {
    const at = planPositions([p("full", "g", MAX_KNOWN), p("half", "g", 2), p("empty", "g", 0)]);
    expect(dist(at.get("full")!)).toBeLessThan(dist(at.get("half")!));
    expect(dist(at.get("half")!)).toBeLessThan(dist(at.get("empty")!));
  });

  it("何も埋まっていなくても、遠すぎる所へは行かない（画面から出さない）", () => {
    const at = planPositions([p("a", "g", 0)]);
    expect(dist(at.get("a")!)).toBeLessThan(700);
  });

  it("真ん中の旅程には重ならない", () => {
    const at = planPositions([p("a", "g", MAX_KNOWN)]);
    expect(dist(at.get("a")!)).toBeGreaterThanOrEqual(250);
  });
});

describe("重ならない", () => {
  it("同じ仲間・同じ埋まり具合でも、同じ場所には置かない", () => {
    const at = planPositions([p("a", "g", 3), p("b", "g", 3), p("c", "g", 3)]);
    const spots = ["a", "b", "c"].map((u) => `${at.get(u)!.x},${at.get(u)!.y}`);
    expect(new Set(spots).size).toBe(3);
  });

  it("左右へ交互にずれる（片側に寄らない）", () => {
    const at = planPositions([p("a", "g", 3), p("b", "g", 3), p("c", "g", 3)]);
    const xs = ["a", "b", "c"].map((u) => at.get(u)!.x);
    expect(Math.sign(xs[1] - xs[0])).not.toBe(Math.sign(xs[2] - xs[0]));
  });
});

describe("空でも落ちない", () => {
  it("1 件も無ければ、置き場所も無い", () => {
    expect(planPositions([]).size).toBe(0);
  });

  it("仲間の名前が空でも、ひとつの仲間として扱う", () => {
    const at = planPositions([p("a", "", 1), p("b", "", 1)]);
    expect(at.size).toBe(2);
  });
});

describe("埋まり具合の差が、段に出る", () => {
  it("2 つ言えているものと、1 つも言えていないものは、同じ段にならない", () => {
    const at = planPositions([p("some", "g", 2), p("none", "g", 0)]);
    expect(dist(at.get("some")!)).toBeLessThan(dist(at.get("none")!));
  });

  it("隣どうしは、付箋の幅より広く離れる（重ならない）", () => {
    const at = planPositions([p("a", "g", 0), p("b", "g", 0)]);
    const dx = Math.abs(at.get("a")!.x - at.get("b")!.x);
    const dy = Math.abs(at.get("a")!.y - at.get("b")!.y);
    expect(Math.max(dx, dy)).toBeGreaterThanOrEqual(200);
  });
});

describe("真ん中の旅程に被らない", () => {
  /** 旅程の箱の半分（420×380 ＋ 帯）と、付箋の半分（200×92） */
  const CLEAR_X = 210 + 100;
  const CLEAR_Y = 202 + 46;

  it("**どの向きでも**、旅程の箱から出た所に置く（斜めも含めて）", () => {
    // 8 つの仲間 ＝ 8 方向すべて。いちばん内側の段（よく埋まっている）で見る
    const pieces = Array.from({ length: 8 }, (_, i) => p(`u${i}`, `g${i}`, MAX_KNOWN));
    for (const [, spot] of planPositions(pieces)) {
      expect(Math.abs(spot.x) >= CLEAR_X || Math.abs(spot.y) >= CLEAR_Y).toBe(true);
    }
  });

  it("いちばん外の段でも、盤（1240×1020）からはみ出さない", () => {
    const pieces = Array.from({ length: 8 }, (_, i) => p(`u${i}`, `g${i}`, 0));
    for (const [, spot] of planPositions(pieces)) {
      expect(Math.abs(spot.x)).toBeLessThanOrEqual(620 - 100);
      expect(Math.abs(spot.y)).toBeLessThanOrEqual(510 - 46);
    }
  });

  it("同じ向きの隣の段とも、付箋の丈より離れる（重ならない）", () => {
    const at = planPositions([p("near", "g", MAX_KNOWN), p("far", "g", 0)]);
    const dy = Math.abs(at.get("near")!.y - at.get("far")!.y);
    const dx = Math.abs(at.get("near")!.x - at.get("far")!.x);
    expect(Math.max(dx / 200, dy / 92)).toBeGreaterThanOrEqual(1);
  });
});
