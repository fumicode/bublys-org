import { MonthlyStaffSchedule, type ShiftCell } from "./MonthlyStaffSchedule.js";
import { WorkingDay } from "./WorkingDay.js";
import { WorkShift } from "./WorkShift.js";
import { MaxConsecutiveWorkdaysConstraint } from "./MaxConsecutiveWorkdaysConstraint.js";
import { MaxDayOffPerDayConstraint } from "./MaxDayOffPerDayConstraint.js";
import { findRepairsForDeadCell } from "./repairDeadCell.js";
import type { ScheduleConstraint } from "./ScheduleConstraint.js";

const early = WorkShift.of("early", "早番", { hour: 7 });
const workShifts = [early];
const day = (d: number) => WorkingDay.of(2026, 6, d);
const work: ShiftCell = { kind: "work", shiftId: "early" };
const off: ShiftCell = { kind: "day-off" };

/**
 * s1 は 1〜5日を出勤済みで6日目に出勤できない（連勤上限5）。
 * 6日目は s2 が休んで休み上限(1人)を使い切っているので休むこともできない ＝ 詰み。
 */
function deadBoard() {
  let schedule = MonthlyStaffSchedule.create({
    id: "sched-1",
    storeId: "store-1",
    year: 2026,
    month: 6,
  });
  for (let d = 1; d <= 5; d++) schedule = schedule.setCell("s1", day(d), work);
  schedule = schedule.setCell("s2", day(6), off);
  return schedule;
}

const constraints: ScheduleConstraint[] = [
  new MaxConsecutiveWorkdaysConstraint(5),
  new MaxDayOffPerDayConstraint(1),
];
const input = (schedule: MonthlyStaffSchedule) => ({
  schedule,
  constraints,
  workShifts,
  staffIds: ["s1", "s2"],
});
const dead = { staffId: "s1", day: day(6) };

describe("findRepairsForDeadCell", () => {
  it("値ごとに『なぜ入らないか』を返す（Level 0）", () => {
    const diagnosis = findRepairsForDeadCell(input(deadBoard()), dead);

    const reasons = new Map(
      diagnosis.blocked.map((b) => [
        b.cell.kind === "work" ? b.cell.shiftId : b.cell.kind,
        b.blockedBy.map((v) => v.constraintType),
      ])
    );
    expect(reasons.get("early")).toEqual(["max-consecutive-workdays"]);
    expect(reasons.get("day-off")).toEqual(["max-day-off-per-day"]);
  });

  it("連勤を切る書き換えと、休み枠を空ける書き換えの両方を見つける", () => {
    const diagnosis = findRepairsForDeadCell(input(deadBoard()), dead);

    const found = diagnosis.repairs.map(
      (r) => `${r.staffId}/${r.day.day}→${r.to.kind === "work" ? r.to.shiftId : r.to.kind}`
    );
    // 連勤のどこかを休みにすれば6日目に出勤できる（ただし休み上限に触れない日に限る）
    expect(found).toContain("s1/3→day-off");
    // s2 の休みを出勤に変えれば6日目の休み枠が空く
    expect(found).toContain("s2/6→early");
  });

  it("解消される違反と代償を両方返す", () => {
    const diagnosis = findRepairsForDeadCell(input(deadBoard()), dead);
    const repair = diagnosis.repairs.find(
      (r) => r.staffId === "s2" && r.day.day === 6 && r.to.kind === "work"
    );

    expect(repair).toBeDefined();
    // s2 を出勤にすると s1 は6日目に休める
    expect(repair?.unlocks).toEqual([off]);
    // この盤面ではもともと違反が出ていないので、解消も代償も無い（＝純粋な改善）
    expect(repair?.costs).toEqual([]);
  });

  it("代償の少ない手から順に並ぶ", () => {
    const diagnosis = findRepairsForDeadCell(input(deadBoard()), dead);
    const costs = diagnosis.repairs.map((r) => r.costs.length);
    expect(costs).toEqual([...costs].sort((a, b) => a - b));
  });

  it("詰んでいないセルには手を返さない", () => {
    const schedule = MonthlyStaffSchedule.create({
      id: "sched-1",
      storeId: "store-1",
      year: 2026,
      month: 6,
    });
    const diagnosis = findRepairsForDeadCell(input(schedule), dead);
    expect(diagnosis.repairs).toEqual([]);
  });
});
