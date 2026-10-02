/**
 * 置き場所の決まりのテスト。
 *
 * > 向きは「どの仲間か」。近さは「どれくらい埋まっているか」。
 *
 * ここが狂うと、**散らばり方が嘘をつく** ── 見た目が関係を表すと言っている以上、
 * 同じ仲間が別の向きへ飛んだり、決まっているものが遠くへ行ったりしてはいけない。
 *
 * ★ **場の外に出さない**のがいちばん強い決まり。外に出た付箋は掴めないので、
 *   どんな大きさの場でも・何枚あっても出ないことを、ここで見張る。
 */
import { describe, expect, it } from "vitest";
import { CENTER, MAX_KNOWN, PIECE, planPositions, type PlanPiece } from "./planLayout.js";

const p = (url: string, group: string, known: number): PlanPiece => ({ url, group, known });
const angle = (s: { x: number; y: number }) => Math.round((Math.atan2(s.y, s.x) * 180) / Math.PI);
const dist = (s: { x: number; y: number }) => Math.round(Math.hypot(s.x, s.y));

/** ふだんの場（`bubbleRoutes` の既定と同じ） */
const BOX = { w: 1240, h: 1020 };
const at = (pieces: readonly PlanPiece[], box = BOX) => planPositions(pieces, box);

describe("向きは「どの仲間か」", () => {
  it("同じ仲間は、同じ向きに並ぶ", () => {
    const spots = at([p("a", "行きたい", 2), p("b", "行きたい", 2), p("c", "行きたい", 2)]);
    const angles = ["a", "b", "c"].map((u) => angle(spots.get(u)!));
    // 同じ段なので、横へずれるぶんだけ角度は違うが、同じ側に居る
    expect(angles.every((deg) => Math.abs(deg - angles[0]) < 45)).toBe(true);
  });

  it("違う仲間は、違う向きへ行く", () => {
    const spots = at([p("a", "行きたい", 2), p("b", "やること", 2)]);
    expect(angle(spots.get("a")!)).not.toBe(angle(spots.get("b")!));
  });
});

describe("近さは「どれくらい埋まっているか」", () => {
  it("よく埋まっているものほど、中心に近い", () => {
    const spots = at([p("full", "g", MAX_KNOWN), p("half", "g", 2), p("empty", "g", 0)]);
    expect(dist(spots.get("full")!)).toBeLessThan(dist(spots.get("half")!));
    expect(dist(spots.get("half")!)).toBeLessThan(dist(spots.get("empty")!));
  });

  it("2 つ言えているものと、1 つも言えていないものは、同じ段にならない", () => {
    const spots = at([p("some", "g", 2), p("none", "g", 0)]);
    expect(dist(spots.get("some")!)).toBeLessThan(dist(spots.get("none")!));
  });
});

describe("重ならない", () => {
  it("同じ仲間・同じ埋まり具合でも、同じ場所には置かない", () => {
    const spots = at([p("a", "g", 3), p("b", "g", 3), p("c", "g", 3)]);
    const seen = ["a", "b", "c"].map((u) => `${spots.get(u)!.x},${spots.get(u)!.y}`);
    expect(new Set(seen).size).toBe(3);
  });

  it("左右へ交互にずれる（片側に寄らない）", () => {
    const spots = at([p("a", "g", 3), p("b", "g", 3), p("c", "g", 3)]);
    const xs = ["a", "b", "c"].map((u) => spots.get(u)!.x);
    expect(Math.sign(xs[1] - xs[0])).not.toBe(Math.sign(xs[2] - xs[0]));
  });

  it("隣どうしは、付箋の幅ぶん離れる", () => {
    const spots = at([p("a", "g", 0), p("b", "g", 0)]);
    const dx = Math.abs(spots.get("a")!.x - spots.get("b")!.x);
    const dy = Math.abs(spots.get("a")!.y - spots.get("b")!.y);
    expect(Math.max(dx, dy)).toBeGreaterThanOrEqual(PIECE.w);
  });
});

describe("真ん中の旅程には被らない", () => {
  const CLEAR_X = CENTER.w / 2 + PIECE.w / 2;
  const CLEAR_Y = CENTER.h / 2 + PIECE.h / 2;

  it("**どの向きでも**、旅程の箱から出た所に置く（斜めも含めて）", () => {
    const pieces = Array.from({ length: 8 }, (_, i) => p(`u${i}`, `g${i}`, MAX_KNOWN));
    for (const [, spot] of at(pieces)) {
      expect(Math.abs(spot.x) >= CLEAR_X || Math.abs(spot.y) >= CLEAR_Y).toBe(true);
    }
  });
});

/**
 * ★ ここが今回の直しの的。前のテストは **1 方向に 1 枚ずつ**しか置いていなかったので、
 *   席ずらし（同じ向きに何枚も来たとき横へずれる）を通っておらず、
 *   実際には右へ 102px はみ出していた。
 */
describe("場の外には、けっして出さない", () => {
  /** その場に収まっているか（付箋の半分ぶんを見込んで） */
  const inside = (spot: { x: number; y: number }, box: { w: number; h: number }) =>
    Math.abs(spot.x) + PIECE.w / 2 <= box.w / 2 && Math.abs(spot.y) + PIECE.h / 2 <= box.h / 2;

  it("ふだんの場で、1 方向に何枚来ても出ない", () => {
    // 同じ仲間を 12 枚 ＝ 同じ向き・同じ段に席ずらしが 12 回
    const pieces = Array.from({ length: 12 }, (_, i) => p(`u${i}`, "g", 0));
    for (const [, spot] of at(pieces)) expect(inside(spot, BOX)).toBe(true);
  });

  it("**斜めの向き**でも出ない（1.4 倍に伸ばしているのはここ）", () => {
    // 8 方向 × 段 3 つ × 席ずらし
    const pieces = Array.from({ length: 48 }, (_, i) =>
      p(`u${i}`, `g${i % 8}`, [0, 2, MAX_KNOWN][i % 3]),
    );
    for (const [, spot] of at(pieces)) expect(inside(spot, BOX)).toBe(true);
  });

  it("場が狭くても広くても出ない", () => {
    const pieces = Array.from({ length: 20 }, (_, i) => p(`u${i}`, `g${i % 8}`, i % (MAX_KNOWN + 1)));
    for (const box of [{ w: 700, h: 500 }, { w: 1024, h: 768 }, { w: 2000, h: 1600 }]) {
      for (const [, spot] of planPositions(pieces, box)) expect(inside(spot, box)).toBe(true);
    }
  });

  it("付箋 1 枚ぶんも無い場でも、落ちずに真ん中に寄せる", () => {
    const spots = planPositions([p("a", "g", 0)], { w: 100, h: 80 });
    expect(spots.get("a")).toEqual({ x: 0, y: 0 });
  });
});

describe("空でも落ちない", () => {
  it("1 件も無ければ、置き場所も無い", () => {
    expect(at([]).size).toBe(0);
  });

  it("仲間の名前が空でも、ひとつの仲間として扱う", () => {
    expect(at([p("a", "", 1), p("b", "", 1)]).size).toBe(2);
  });
});
