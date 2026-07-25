import {
  MonthlyStaffSchedule,
  Staff,
  WorkShift,
  WorkingDay,
  MaxConsecutiveWorkdaysConstraint,
  MinMonthlyDayOffConstraint,
  ShiftLeaderConstraint,
  ShiftLeaderRule,
} from "@bublys-org/hotel-shift-puzzle-model";
import { suggestConstraintFix } from "./suggestConstraintFix.js";
import type { PolicyShiftSuggestion } from "./types.js";

describe("suggestConstraintFix", () => {
  const early = WorkShift.of("early", "早番", { hour: 7 });
  const staff = new Staff({ id: "s1", name: "田中", department: "フロント" });

  const suggestionFor = (
    cell: PolicyShiftSuggestion["cell"],
    score: number
  ): PolicyShiftSuggestion => ({
    id: `s1:cand:${JSON.stringify(cell)}`,
    cell,
    score,
    reasons: ["テスト用の理由"],
    wouldConcede: false,
  });

  it("6連勤になる出勤を、休みにする候補へ差し替えると違反が減る", () => {
    // 1日を休みにして区切り、2〜7日を出勤にして6連勤（上限5）にする。
    // 7日目（連勤の最後）を休みへ差し替えれば 2〜6日の5連勤で収まるはず。
    let schedule = MonthlyStaffSchedule.create({
      id: "sched-1",
      storeId: "store-1",
      year: 2026,
      month: 6,
    });
    schedule = schedule.setCell("s1", WorkingDay.of(2026, 6, 1), { kind: "day-off" });
    for (let d = 2; d <= 7; d++) {
      schedule = schedule.setCell(
        "s1",
        WorkingDay.of(2026, 6, d),
        { kind: "work", shiftId: "early" }
      );
    }
    const day7 = WorkingDay.of(2026, 6, 7);

    const constraints = [new MaxConsecutiveWorkdaysConstraint(5)];
    expect(schedule.checkConstraints(constraints).length).toBeGreaterThan(0);

    const result = suggestConstraintFix({
      schedule,
      staffId: "s1",
      day: day7,
      constraints,
      suggestions: [
        suggestionFor({ kind: "work", shiftId: "early" }, 10),
        suggestionFor({ kind: "day-off" }, 5),
      ],
      staffList: [staff],
      workShifts: [early],
      wishByStaff: new Map(),
    });

    expect(result).not.toBeNull();
    expect(result?.cell).toEqual({ kind: "day-off" });
    expect(result?.violationsAfter).toBeLessThan(result?.violationsBefore ?? Infinity);
  });

  it("違反がなければ何も提案しない", () => {
    const schedule = MonthlyStaffSchedule.create({
      id: "sched-1",
      storeId: "store-1",
      year: 2026,
      month: 6,
    });
    const day = WorkingDay.of(2026, 6, 1);
    const result = suggestConstraintFix({
      schedule,
      staffId: "s1",
      day,
      constraints: [],
      suggestions: [suggestionFor({ kind: "work", shiftId: "early" }, 10)],
      staffList: [staff],
      workShifts: [early],
      wishByStaff: new Map(),
    });
    expect(result).toBeNull();
  });

  it("改善する候補がなければ null", () => {
    let schedule = MonthlyStaffSchedule.create({
      id: "sched-1",
      storeId: "store-1",
      year: 2026,
      month: 6,
    });
    for (let d = 1; d <= 7; d++) {
      schedule = schedule.setCell(
        "s1",
        WorkingDay.of(2026, 6, d),
        { kind: "work", shiftId: "early" }
      );
    }
    const day7 = WorkingDay.of(2026, 6, 7);
    const constraints = [new MaxConsecutiveWorkdaysConstraint(5)];

    const result = suggestConstraintFix({
      schedule,
      staffId: "s1",
      day: day7,
      constraints,
      // 候補が現在値と同じ（出勤=early）だけ → 差し替え候補なし
      suggestions: [suggestionFor({ kind: "work", shiftId: "early" }, 10)],
      staffList: [staff],
      workShifts: [early],
      wishByStaff: new Map(),
    });
    expect(result).toBeNull();
  });

  it("縦の制約（責任者ルール未充足など日単位・staffId非紐づきの違反）も解消候補を探す", () => {
    // s1 は早責候補で、他の日はすべて早番（充足）。7日だけ休みにして早責を不在にする。
    // → 7日を早番へ変えれば、その日だけの違反が解消するはず。
    let schedule = MonthlyStaffSchedule.create({
      id: "sched-1",
      storeId: "store-1",
      year: 2026,
      month: 6,
    });
    for (const day of schedule.workingDays()) {
      schedule = schedule.setCell("s1", day, { kind: "work", shiftId: "early" });
    }
    const day7 = WorkingDay.of(2026, 6, 7);
    schedule = schedule.setCell("s1", day7, { kind: "day-off" });

    const rule = new ShiftLeaderRule({
      key: "early-leader",
      label: "早責",
      shiftName: "早番",
      leaderStaffIds: ["s1"],
      minCount: 1,
    });
    const constraints = [new ShiftLeaderConstraint(rule, ["early"])];

    const before = schedule.checkConstraints(constraints);
    expect(before.length).toBeGreaterThan(0);
    expect(before[0].staffId).toBeUndefined(); // 日単位（staffId なし）の違反であること

    const result = suggestConstraintFix({
      schedule,
      staffId: "s1",
      day: day7,
      constraints,
      suggestions: [
        suggestionFor({ kind: "day-off" }, 10),
        suggestionFor({ kind: "work", shiftId: "early" }, 5),
      ],
      staffList: [staff],
      workShifts: [early],
      wishByStaff: new Map(),
    });

    expect(result).not.toBeNull();
    expect(result?.cell).toEqual({ kind: "work", shiftId: "early" });
    expect(result?.violationsAfter).toBe(0);
  });

  it("月の最低休日数（staffIdには紐づくが特定の日を持たない違反）も解消候補を探す", () => {
    // s1 は全日出勤（休み0日）。最低休日数1日に届いていない。
    let schedule = MonthlyStaffSchedule.create({
      id: "sched-1",
      storeId: "store-1",
      year: 2026,
      month: 6,
    });
    for (const day of schedule.workingDays()) {
      schedule = schedule.setCell("s1", day, { kind: "work", shiftId: "early" });
    }

    const constraints = [new MinMonthlyDayOffConstraint(1)];
    const before = schedule.checkConstraints(constraints);
    expect(before.length).toBeGreaterThan(0);
    expect(before[0].staffId).toBe("s1");
    expect(before[0].days).toEqual([]); // 特定の日を持たない月単位の違反であること

    const day1 = WorkingDay.of(2026, 6, 1);
    const result = suggestConstraintFix({
      schedule,
      staffId: "s1",
      day: day1,
      constraints,
      suggestions: [
        suggestionFor({ kind: "work", shiftId: "early" }, 10),
        suggestionFor({ kind: "day-off" }, 5),
      ],
      staffList: [staff],
      workShifts: [early],
      wishByStaff: new Map(),
    });

    expect(result).not.toBeNull();
    expect(result?.cell).toEqual({ kind: "day-off" });
    expect(result?.violationsAfter).toBe(0);
  });

  it("解消策が別の勤務帯を新たに人数不足にしても、連鎖で解消できるなら採用する", () => {
    // s1 は2〜7日が6連勤（上限5）。7日を休みにすれば解消するが、7日の早番はs1が
    // 唯一の担当（必要1人）なので、休みにすると早番が0/1になる。休みのs2が肩代わりできる。
    let schedule = MonthlyStaffSchedule.create({
      id: "sched-1",
      storeId: "store-1",
      year: 2026,
      month: 6,
    });
    schedule = schedule.setCell("s1", WorkingDay.of(2026, 6, 1), { kind: "day-off" });
    for (let d = 2; d <= 7; d++) {
      schedule = schedule.setCell(
        "s1",
        WorkingDay.of(2026, 6, d),
        { kind: "work", shiftId: "early" }
      );
    }
    const day7 = WorkingDay.of(2026, 6, 7);
    schedule = schedule.setRequired(day7, "早番", 1);
    schedule = schedule.setCell("s2", day7, { kind: "day-off" });

    const constraints = [new MaxConsecutiveWorkdaysConstraint(5)];
    const s2 = new Staff({ id: "s2", name: "鈴木" });

    const result = suggestConstraintFix({
      schedule,
      staffId: "s1",
      day: day7,
      constraints,
      suggestions: [
        suggestionFor({ kind: "work", shiftId: "early" }, 10),
        suggestionFor({ kind: "day-off" }, 5),
      ],
      staffList: [staff, s2],
      workShifts: [early],
      wishByStaff: new Map(),
    });

    expect(result).not.toBeNull();
    expect(result?.cell).toEqual({ kind: "day-off" });
    expect(result?.followUpSteps).toEqual([
      { staffId: "s2", dayKey: day7.key, shiftId: "early" },
    ]);
  });

  it("解消策の副作用を連鎖でも解消できる人がいなければ提案しない", () => {
    // 上と同じ状況だが、早番を肩代わりできる人がいない。
    let schedule = MonthlyStaffSchedule.create({
      id: "sched-1",
      storeId: "store-1",
      year: 2026,
      month: 6,
    });
    schedule = schedule.setCell("s1", WorkingDay.of(2026, 6, 1), { kind: "day-off" });
    for (let d = 2; d <= 7; d++) {
      schedule = schedule.setCell(
        "s1",
        WorkingDay.of(2026, 6, d),
        { kind: "work", shiftId: "early" }
      );
    }
    const day7 = WorkingDay.of(2026, 6, 7);
    schedule = schedule.setRequired(day7, "早番", 1);

    const constraints = [new MaxConsecutiveWorkdaysConstraint(5)];

    const result = suggestConstraintFix({
      schedule,
      staffId: "s1",
      day: day7,
      constraints,
      suggestions: [
        suggestionFor({ kind: "work", shiftId: "early" }, 10),
        suggestionFor({ kind: "day-off" }, 5),
      ],
      staffList: [staff], // 肩代わりできる人がいない
      workShifts: [early],
      wishByStaff: new Map(),
    });

    expect(result).toBeNull();
  });
});
