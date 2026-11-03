import { MonthlyStaffSchedule } from "./MonthlyStaffSchedule.js";
import { ShiftLeaderRule } from "./ShiftLeaderRule.js";
import { ShiftLeaderConstraint } from "./ShiftLeaderConstraint.js";
import { ConstraintViolation } from "./ConstraintViolation.js";

describe("ShiftLeaderConstraint の違反の要約", () => {
  const schedule = MonthlyStaffSchedule.create({
    id: "sched-1",
    storeId: "store-1",
    year: 2026,
    month: 6,
  });
  const rule = (minCount: number) =>
    new ShiftLeaderRule({
      key: "early",
      label: "早責",
      shiftName: "早番",
      leaderStaffIds: ["L1", "L2"],
      minCount,
    });

  test("ルール名だけにせず、どうなっているか（不在）を添える", () => {
    const [v] = new ShiftLeaderConstraint(rule(1), ["early"]).check(schedule);
    expect(v.summary).toBe("早責が不在");
  });

  test("最低人数が2人以上なら、今の人数と最低人数を添える", () => {
    const [v] = new ShiftLeaderConstraint(rule(2), ["early"]).check(schedule);
    expect(v.summary).toBe("早責が0/2人");
  });

  test("要約は plain を通しても残り、無ければ message を使う", () => {
    const [v] = new ShiftLeaderConstraint(rule(1), ["early"]).check(schedule);
    expect(ConstraintViolation.fromPlain(v.toPlain()).summary).toBe(v.summary);
    const plain = { ...v.toPlain(), summary: undefined };
    expect(ConstraintViolation.fromPlain(plain).summary).toBe(v.message);
  });
});
