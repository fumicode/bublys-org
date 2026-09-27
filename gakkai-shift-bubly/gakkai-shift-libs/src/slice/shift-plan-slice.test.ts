/**
 * **シフト案の置き場** ── ここも出し入れだけ。ただし 1 つだけ決まりがある。
 *
 * > **いま開いている案を消したら、残っている先頭へ移る。無ければ誰も開いていない。**
 *
 * 消しただけで居場所（`currentShiftPlanId`）を放っておくと、**無い案を指したまま**になり、
 * 画面は「開いているはずなのに何も無い」になる。
 *
 * ★ 置くときは**渡されたものを写して**持つ（`toMutableShiftPlanState`）。
 *   渡した側の配列をあとで触られても、置き場の中身が変わらないため。
 */
import {
  shiftPlanSlice, addShiftPlan, updateShiftPlan, deleteShiftPlan, setCurrentShiftPlanId,
} from "./shift-plan-slice.js";

const reducer = shiftPlanSlice.reducer;
const 案 = (id: string, name = id) => ({ id, name, assignments: [] }) as never;
const 初め = () => reducer(undefined, { type: "@@init" });

describe("gakkaiShiftPlan（シフト案の置き場）", () => {
  test("はじめは空で、どれも開いていない", () => {
    expect(初め().shiftPlans ?? []).toEqual([]);
    expect(初め().currentShiftPlanId ?? null).toBeNull();
  });

  test("足すと末尾に付く", () => {
    let s = reducer(初め(), addShiftPlan(案("p1")));
    s = reducer(s, addShiftPlan(案("p2")));
    expect(s.shiftPlans.map((p) => p.id)).toEqual(["p1", "p2"]);
  });

  test("差し替えは、同じ id の所だけ。居なければ増えない", () => {
    let s = reducer(初め(), addShiftPlan(案("p1", "一次案")));
    s = reducer(s, updateShiftPlan(案("p1", "二次案")));
    expect(s.shiftPlans.map((p) => p.name)).toEqual(["二次案"]);
    s = reducer(s, updateShiftPlan(案("居ない")));
    expect(s.shiftPlans.map((p) => p.id)).toEqual(["p1"]);
  });

  test("置いたものは写し ── 渡した配列をあとで触られても、中身は変わらない", () => {
    const 渡す = { id: "p1", name: "一次案", assignments: [] as unknown[] } as never as { id: string; assignments: unknown[] };
    const s = reducer(初め(), addShiftPlan(渡す as never));
    渡す.assignments.push({ 誰か: "あとから足した" });
    expect(s.shiftPlans[0].assignments).toEqual([]);
  });

  test("開いていない案を消しても、居場所はそのまま", () => {
    let s = reducer(初め(), addShiftPlan(案("p1")));
    s = reducer(s, addShiftPlan(案("p2")));
    s = reducer(s, setCurrentShiftPlanId("p1"));
    s = reducer(s, deleteShiftPlan("p2"));
    expect(s.currentShiftPlanId).toBe("p1");
  });

  test("開いている案を消したら、残っている先頭へ移る", () => {
    let s = reducer(初め(), addShiftPlan(案("p1")));
    s = reducer(s, addShiftPlan(案("p2")));
    s = reducer(s, setCurrentShiftPlanId("p1"));
    s = reducer(s, deleteShiftPlan("p1"));
    expect(s.shiftPlans.map((p) => p.id)).toEqual(["p2"]);
    expect(s.currentShiftPlanId).toBe("p2");
  });

  test("最後の 1 つを消したら、どれも開いていない", () => {
    let s = reducer(初め(), addShiftPlan(案("p1")));
    s = reducer(s, setCurrentShiftPlanId("p1"));
    s = reducer(s, deleteShiftPlan("p1"));
    expect(s.shiftPlans).toEqual([]);
    expect(s.currentShiftPlanId).toBeNull();
  });
});
