import {
  MonthlyStaffSchedule,
  WorkShift,
  WorkingDay,
  MaxConsecutiveWorkdaysConstraint,
  MaxDayOffPerDayConstraint,
} from "@bublys-org/hotel-shift-puzzle-model";
import { legalCandidatesFor } from "./legalCandidates.js";

describe("legalCandidatesFor", () => {
  const early = WorkShift.of("early", "早番", { hour: 7 });

  it("'undecided' は候補に含めない", () => {
    const schedule = MonthlyStaffSchedule.create({
      id: "sched-1",
      storeId: "store-1",
      year: 2026,
      month: 6,
    });
    const day1 = WorkingDay.of(2026, 6, 1);
    const candidates = legalCandidatesFor(schedule, [], "s1", day1, [early]);
    expect(candidates.some((c) => c.kind === "undecided")).toBe(false);
  });

  it("制約が無ければ、undecided以外の全候補が合法", () => {
    const schedule = MonthlyStaffSchedule.create({
      id: "sched-1",
      storeId: "store-1",
      year: 2026,
      month: 6,
    });
    const day1 = WorkingDay.of(2026, 6, 1);
    const candidates = legalCandidatesFor(schedule, [], "s1", day1, [early]);
    expect(candidates).toEqual(
      expect.arrayContaining([{ kind: "day-off" }, { kind: "work", shiftId: "early" }])
    );
    expect(candidates.length).toBe(2);
  });

  it("連勤上限に達していれば、出勤候補だけが除かれる（休みのみ合法）", () => {
    let schedule = MonthlyStaffSchedule.create({
      id: "sched-1",
      storeId: "store-1",
      year: 2026,
      month: 6,
    });
    for (let d = 1; d <= 5; d++) {
      schedule = schedule.setCell("s1", WorkingDay.of(2026, 6, d), {
        kind: "work",
        shiftId: "early",
      });
    }
    const day6 = WorkingDay.of(2026, 6, 6);
    const constraints = [new MaxConsecutiveWorkdaysConstraint(5)];

    const candidates = legalCandidatesFor(schedule, constraints, "s1", day6, [early]);
    expect(candidates).toEqual([{ kind: "day-off" }]);
  });

  it("どの候補を選んでも別の制約に触れる場合は、合法な候補が0件になる", () => {
    let schedule = MonthlyStaffSchedule.create({
      id: "sched-1",
      storeId: "store-1",
      year: 2026,
      month: 6,
    });
    // s1: 1〜5日を出勤済み → 6日目に出勤すると連勤違反
    for (let d = 1; d <= 5; d++) {
      schedule = schedule.setCell("s1", WorkingDay.of(2026, 6, d), {
        kind: "work",
        shiftId: "early",
      });
    }
    // s2: 6日目を既に休みにして、1日の休み上限(1人)を使い切っておく
    // → 6日目に誰かが休みを追加すると上限違反
    const day6 = WorkingDay.of(2026, 6, 6);
    schedule = schedule.setCell("s2", day6, { kind: "day-off" });

    const constraints = [
      new MaxConsecutiveWorkdaysConstraint(5),
      new MaxDayOffPerDayConstraint(1),
    ];

    const candidates = legalCandidatesFor(schedule, constraints, "s1", day6, [early]);
    expect(candidates).toEqual([]);
  });
});
