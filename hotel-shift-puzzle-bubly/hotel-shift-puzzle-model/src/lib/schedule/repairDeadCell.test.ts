import { MonthlyStaffSchedule, type ShiftCell } from "./MonthlyStaffSchedule.js";
import { WorkingDay } from "./WorkingDay.js";
import { WorkShift } from "./WorkShift.js";
import { MaxConsecutiveWorkdaysConstraint } from "./MaxConsecutiveWorkdaysConstraint.js";
import { MaxDayOffPerDayConstraint } from "./MaxDayOffPerDayConstraint.js";
import { findRepairsForDeadCell } from "./repairDeadCell.js";
import type { ScheduleConstraint } from "./ScheduleConstraint.js";
import { AllowedShiftConstraint, ALLOWED_SHIFT_CONSTRAINT } from "./AllowedShiftConstraint.js";
import { WorkingStaffGroup } from "../staff/WorkingStaffGroup.js";
import { WorkingStaffMember } from "../staff/WorkingStaffMember.js";

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

describe("findRepairsForDeadCell と可能勤務帯", () => {
  const late = WorkShift.of("late", "遅番", { hour: 15 });
  const shiftNameById = new Map([
    ["early", "早番"],
    ["late", "遅番"],
  ]);
  /** s2 は早番しか入れない。s1 は絞っていない */
  const staffGroup = new WorkingStaffGroup({
    id: "sched-1",
    members: [
      new WorkingStaffMember({ staffId: "s1" }),
      new WorkingStaffMember({ staffId: "s2", allowedShiftIds: ["early"] }),
    ],
  });
  const withAllowedShift = (schedule: MonthlyStaffSchedule) => ({
    ...input(schedule),
    workShifts: [early, late],
    constraints: [...constraints, new AllowedShiftConstraint(staffGroup, shiftNameById)],
  });
  const isLate = (c: ShiftCell) => c.kind === "work" && c.shiftId === "late";

  it("入れない勤務帯に入れる書き換えも、可能勤務帯違反を代償として出す", () => {
    const diagnosis = findRepairsForDeadCell(withAllowedShift(deadBoard()), dead);

    // s2 の休みを遅番（s2 は入れない）に変えても、6日目の休み枠は空く
    const repair = diagnosis.repairs.find(
      (r) => r.staffId === "s2" && r.day.day === 6 && isLate(r.to)
    );
    expect(repair).toBeDefined();
    expect(repair?.unlocks).toEqual([off]);
    expect(repair?.costs.map((v) => v.constraintType)).toEqual([ALLOWED_SHIFT_CONSTRAINT]);
  });

  it("代償の無い書き換え（入れる早番へ）の方が先に並ぶ", () => {
    const diagnosis = findRepairsForDeadCell(withAllowedShift(deadBoard()), dead);
    const toEarly = diagnosis.repairs.findIndex(
      (r) => r.staffId === "s2" && r.day.day === 6 && r.to.kind === "work" && !isLate(r.to)
    );
    const toLate = diagnosis.repairs.findIndex(
      (r) => r.staffId === "s2" && r.day.day === 6 && isLate(r.to)
    );
    expect(toEarly).toBeGreaterThanOrEqual(0);
    expect(toEarly).toBeLessThan(toLate);
  });

  it("詰みセルの値が入れない勤務帯なら、『なぜ入らないか』に可能勤務帯が出る", () => {
    const limitedS1 = new WorkingStaffGroup({
      id: "sched-1",
      members: [new WorkingStaffMember({ staffId: "s1", allowedShiftIds: ["early"] })],
    });
    const diagnosis = findRepairsForDeadCell(
      {
        ...input(deadBoard()),
        workShifts: [early, late],
        constraints: [...constraints, new AllowedShiftConstraint(limitedS1, shiftNameById)],
      },
      dead
    );

    const lateBlocked = diagnosis.blocked.find((b) => isLate(b.cell));
    expect(lateBlocked?.blockedBy.map((v) => v.constraintType)).toContain(
      ALLOWED_SHIFT_CONSTRAINT
    );
  });
});
