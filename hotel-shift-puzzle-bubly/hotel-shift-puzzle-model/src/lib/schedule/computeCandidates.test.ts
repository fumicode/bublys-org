import { MonthlyStaffSchedule } from "./MonthlyStaffSchedule.js";
import { WorkingDay } from "./WorkingDay.js";
import { WorkShift } from "./WorkShift.js";
import { ShiftLeaderRule } from "./ShiftLeaderRule.js";
import { ShiftLeaderConstraint } from "./ShiftLeaderConstraint.js";
import { MaxConsecutiveWorkdaysConstraint } from "./MaxConsecutiveWorkdaysConstraint.js";
import { MaxDayOffPerDayConstraint } from "./MaxDayOffPerDayConstraint.js";
import { computeAllCandidates, recomputeCandidates } from "./computeCandidates.js";
import type { ScheduleConstraint } from "./ScheduleConstraint.js";

const early = WorkShift.of("early", "早番", { hour: 7 });
const late = WorkShift.of("late", "遅番", { hour: 15 });

const emptySchedule = () =>
  MonthlyStaffSchedule.create({
    id: "sched-1",
    storeId: "store-1",
    year: 2026,
    month: 6,
  });

describe("computeAllCandidates", () => {
  it("確定済みのセルは候補集合に載せない", () => {
    const day1 = WorkingDay.of(2026, 6, 1);
    const schedule = emptySchedule().setCell("s1", day1, {
      kind: "work",
      shiftId: "early",
    });

    const candidates = computeAllCandidates({
      schedule,
      constraints: [],
      workShifts: [early, late],
      staffIds: ["s1"],
    });

    expect(candidates.candidatesOf("s1", day1)).toBeUndefined();
    expect(candidates.candidatesOf("s1", WorkingDay.of(2026, 6, 2))).toHaveLength(3);
  });

  it("連勤上限に達していれば、そのセルは休みだけに絞られて確定手になる", () => {
    let schedule = emptySchedule();
    for (let d = 1; d <= 5; d++) {
      schedule = schedule.setCell("s1", WorkingDay.of(2026, 6, d), {
        kind: "work",
        shiftId: "early",
      });
    }
    const day6 = WorkingDay.of(2026, 6, 6);

    const candidates = computeAllCandidates({
      schedule,
      constraints: [new MaxConsecutiveWorkdaysConstraint(5)],
      workShifts: [early],
      staffIds: ["s1"],
    });

    expect(candidates.candidatesOf("s1", day6)).toEqual([{ kind: "day-off" }]);
    expect(candidates.forcedCells()).toContainEqual({
      staffId: "s1",
      day: expect.objectContaining({ state: { year: 2026, month: 6, day: 6 } }),
      cell: { kind: "day-off" },
    });
  });

  it("どの値を入れても違反するセルは、候補0件の詰みとして出る", () => {
    let schedule = emptySchedule();
    // s1: 1〜5日を出勤済み → 6日目に出勤すると連勤違反
    for (let d = 1; d <= 5; d++) {
      schedule = schedule.setCell("s1", WorkingDay.of(2026, 6, d), {
        kind: "work",
        shiftId: "early",
      });
    }
    // s2: 6日目を休みにして1日の休み上限(1人)を使い切る → 6日目に休みも取れない
    const day6 = WorkingDay.of(2026, 6, 6);
    schedule = schedule.setCell("s2", day6, { kind: "day-off" });

    const candidates = computeAllCandidates({
      schedule,
      constraints: [
        new MaxConsecutiveWorkdaysConstraint(5),
        new MaxDayOffPerDayConstraint(1),
      ],
      workShifts: [early],
      staffIds: ["s1", "s2"],
    });

    expect(candidates.candidatesOf("s1", day6)).toEqual([]);
    expect(candidates.deadCells()).toContainEqual({
      staffId: "s1",
      day: expect.objectContaining({ state: { year: 2026, month: 6, day: 6 } }),
    });
  });

  it("責任者が1人必要な日で、入れる人が1人しか残っていなければその勤務帯に絞られる", () => {
    // 早責の候補は L1 / L2 の2人。L1 が遅番で確定した日は、L2 が早番を取るしかない。
    const rule = new ShiftLeaderRule({
      key: "early",
      label: "早責",
      shiftName: "早番",
      leaderStaffIds: ["L1", "L2"],
      minCount: 1,
    });
    const constraints: ScheduleConstraint[] = [new ShiftLeaderConstraint(rule, ["early"])];
    const day1 = WorkingDay.of(2026, 6, 1);
    const schedule = emptySchedule().setCell("L1", day1, {
      kind: "work",
      shiftId: "late",
    });

    const candidates = computeAllCandidates({
      schedule,
      constraints,
      workShifts: [early, late],
      staffIds: ["L1", "L2", "X"],
    });

    // L2 は「早番以外を選ぶと早責が埋まらなくなる」ので早番だけに絞られる
    expect(candidates.candidatesOf("L2", day1)).toEqual([
      { kind: "work", shiftId: "early" },
    ]);
    // 責任者でない X は絞られない（早番に入っても早責は埋まらない）
    expect(candidates.candidatesOf("X", day1)).toHaveLength(3);
    // まだ2人とも空いている日は、どちらが取るか決まらないので絞らない
    expect(candidates.candidatesOf("L2", WorkingDay.of(2026, 6, 2))).toHaveLength(3);
  });
});

describe("recomputeCandidates", () => {
  const rule = new ShiftLeaderRule({
    key: "early",
    label: "早責",
    shiftName: "早番",
    leaderStaffIds: ["L1", "L2"],
    minCount: 1,
  });
  const constraints: ScheduleConstraint[] = [new ShiftLeaderConstraint(rule, ["early"])];
  const staffIds = ["L1", "L2", "X"];
  const workShifts = [early, late];
  const day1 = WorkingDay.of(2026, 6, 1);

  it("影響範囲だけ計算し直しても、全計算と同じ結果になる", () => {
    const before = emptySchedule();
    const previous = computeAllCandidates({
      schedule: before,
      constraints,
      workShifts,
      staffIds,
    });

    const after = before.setCell("L1", day1, { kind: "work", shiftId: "late" });
    const input = { schedule: after, constraints, workShifts, staffIds };

    const incremental = recomputeCandidates(previous, input, [
      { staffId: "L1", day: day1 },
    ]);

    expect(incremental.toPlain()).toEqual(computeAllCandidates(input).toPlain());
  });

  it("確定したセルは候補集合から外れる", () => {
    const before = emptySchedule();
    const previous = computeAllCandidates({
      schedule: before,
      constraints,
      workShifts,
      staffIds,
    });
    expect(previous.candidatesOf("L1", day1)).toBeDefined();

    const after = before.setCell("L1", day1, { kind: "work", shiftId: "late" });
    const next = recomputeCandidates(
      previous,
      { schedule: after, constraints, workShifts, staffIds },
      [{ staffId: "L1", day: day1 }]
    );

    expect(next.candidatesOf("L1", day1)).toBeUndefined();
    expect(next.size).toBe(previous.size - 1);
  });

  it("勤務表が変わっていれば全計算にフォールバックする", () => {
    const other = MonthlyStaffSchedule.create({
      id: "sched-2",
      storeId: "store-1",
      year: 2026,
      month: 6,
    });
    const previous = computeAllCandidates({
      schedule: emptySchedule(),
      constraints,
      workShifts,
      staffIds,
    });

    const next = recomputeCandidates(
      previous,
      { schedule: other, constraints, workShifts, staffIds },
      []
    );

    expect(next.scheduleId).toBe("sched-2");
    expect(next.size).toBe(previous.size);
  });
});
