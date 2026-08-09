import {
  computeConstraintDelta,
  type MonthlyStaffSchedule,
  type ScheduleConstraint,
  type ShiftCell,
  type WorkShift,
  type WorkingDay,
} from "@bublys-org/hotel-shift-puzzle-model";

/** そのセルに入れうる値の全体（勤務帯 + 休み + 未定）。候補集合の出発点。 */
export function enumerateCellCandidates(workShifts: WorkShift[]): ShiftCell[] {
  const cells: ShiftCell[] = workShifts.map((w) => ({
    kind: "work",
    shiftId: w.id,
  }));
  cells.push({ kind: "day-off" });
  cells.push({ kind: "undecided" });
  return cells;
}

/**
 * その未定セルが取りうる候補のうち、既存の制約チェックに対して新たな違反を
 * 一切増やさないものだけを返す（= 候補集合の中身となる「合法な候補」）。
 *
 * 「未定」自体は決定ではないので候補から除く。候補が1件に絞られたら一意に決まった、
 * と言えるようにするため。
 */
export function legalCandidatesFor(
  schedule: MonthlyStaffSchedule,
  constraints: ScheduleConstraint[],
  staffId: string,
  day: WorkingDay,
  workShifts: WorkShift[]
): ShiftCell[] {
  const before = schedule.checkConstraints(constraints);

  return enumerateCellCandidates(workShifts)
    .filter((cell) => cell.kind !== "undecided")
    .filter((cell) => {
      const after = schedule
        .setCell(staffId, day, cell)
        .checkConstraints(constraints);
      return computeConstraintDelta(before, after).newlyViolated.length === 0;
    });
}
