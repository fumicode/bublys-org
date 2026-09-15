import {
  computeConstraintDelta,
  violationIdentityKey,
} from "./ConstraintDelta.js";
import { ConstraintViolation } from "./ConstraintViolation.js";
import { WorkingDay } from "./WorkingDay.js";

describe("computeConstraintDelta", () => {
  const day = WorkingDay.fromKey("2026-06-01");

  it("新しく出た違反を newlyViolated に入れる（スタッフ紐づきも日単位も）", () => {
    const after = [
      new ConstraintViolation({
        constraintType: "max-consecutive-workdays",
        staffId: "s1",
        days: [day],
        message: "6連勤（上限5連勤）",
      }),
      new ConstraintViolation({
        constraintType: "shift-leader",
        days: [day],
        message: "早責不足",
      }),
    ];
    const delta = computeConstraintDelta([], after);
    expect(delta.newlyViolated).toHaveLength(2);
    expect(delta.newlyResolved).toHaveLength(0);
  });

  it("解消された違反を newlyResolved に入れる", () => {
    const before = [
      new ConstraintViolation({
        constraintType: "min-monthly-day-off",
        staffId: "s1",
        days: [],
        message: "休日不足",
      }),
    ];
    const delta = computeConstraintDelta(before, []);
    expect(delta.newlyResolved).toHaveLength(1);
    expect(delta.newlyViolated).toHaveLength(0);
  });

  it("同じ違反が前後どちらにもあれば、増えも減りもしない", () => {
    const violation = () =>
      new ConstraintViolation({
        constraintType: "min-monthly-day-off",
        staffId: "s1",
        days: [day],
        message: "休日不足",
      });
    const delta = computeConstraintDelta([violation()], [violation()]);
    expect(delta.newlyViolated).toHaveLength(0);
    expect(delta.newlyResolved).toHaveLength(0);
  });

  it("violationIdentityKey は違反から安定キーを返す（最初と最後の稼働日で挟む）", () => {
    const violation = new ConstraintViolation({
      constraintType: "x",
      staffId: "s",
      days: [WorkingDay.fromKey("2026-06-01"), WorkingDay.fromKey("2026-06-03")],
      message: "m",
    });
    expect(violationIdentityKey(violation)).toBe("x:s:2026-06-01_2026-06-03");
  });
});
