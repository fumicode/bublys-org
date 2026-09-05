import { MonthlyStaffSchedule } from "./MonthlyStaffSchedule.js";
import { WorkingDay } from "./WorkingDay.js";
import { MinMonthlyDayOffConstraint } from "./MinMonthlyDayOffConstraint.js";

describe("MinMonthlyDayOffConstraint", () => {
  it("空の勤務表（全員未定）は違反にしない（まだ達成不可能ではない）", () => {
    const schedule = MonthlyStaffSchedule.create({
      id: "sched-1",
      storeId: "store-1",
      year: 2026,
      month: 6, // 30日
    });
    const constraints = [new MinMonthlyDayOffConstraint(8)];
    expect(schedule.checkConstraints(constraints)).toEqual([]);
  });

  it("1セルだけ出勤/休みにしても、残り日数でまだ届く見込みなら違反にしない", () => {
    let schedule = MonthlyStaffSchedule.create({
      id: "sched-1",
      storeId: "store-1",
      year: 2026,
      month: 6,
    });
    schedule = schedule.setCell("s1", WorkingDay.of(2026, 6, 1), {
      kind: "work",
      shiftId: "early",
    });
    const constraints = [new MinMonthlyDayOffConstraint(8)];
    expect(schedule.checkConstraints(constraints)).toEqual([]);
  });

  it("残りの未定日を全部休みにしても最低日数に届かなければ違反にする", () => {
    let schedule = MonthlyStaffSchedule.create({
      id: "sched-1",
      storeId: "store-1",
      year: 2026,
      month: 6, // 30日
    });
    // 1〜25日を出勤済みにする → 残り5日（26〜30）を全部休みにしても5日にしかならず、8日に届かない
    for (let d = 1; d <= 25; d++) {
      schedule = schedule.setCell("s1", WorkingDay.of(2026, 6, d), {
        kind: "work",
        shiftId: "early",
      });
    }
    const constraints = [new MinMonthlyDayOffConstraint(8)];
    const violations = schedule.checkConstraints(constraints);
    expect(violations.length).toBe(1);
    expect(violations[0].staffId).toBe("s1");
    expect(violations[0].days).toEqual([]);
  });

  it("既に最低日数に届いていれば違反にしない", () => {
    let schedule = MonthlyStaffSchedule.create({
      id: "sched-1",
      storeId: "store-1",
      year: 2026,
      month: 6,
    });
    for (let d = 1; d <= 8; d++) {
      schedule = schedule.setCell("s1", WorkingDay.of(2026, 6, d), {
        kind: "day-off",
      });
    }
    const constraints = [new MinMonthlyDayOffConstraint(8)];
    expect(schedule.checkConstraints(constraints)).toEqual([]);
  });
});
