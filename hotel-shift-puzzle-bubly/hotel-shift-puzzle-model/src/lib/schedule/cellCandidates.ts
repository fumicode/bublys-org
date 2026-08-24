/**
 * cellCandidates — 1セルに入れられる値（候補）の列挙と、合法な候補の絞り込み
 *
 * 候補集合機能の最小単位。ここは「そのセル単体で見て入れられるか」だけを判定し、
 * 「盤面全体として、どのセルが一意に決まるか」は computeCandidates が組み立てる。
 */
import type { ConstraintViolationPlain } from "./ConstraintViolation.js";
import type { MonthlyStaffSchedule, ShiftCell } from "./MonthlyStaffSchedule.js";
import { computeConstraintDelta } from "./ScheduleEditLog.js";
import type { ScheduleConstraint } from "./ScheduleConstraint.js";
import type { WorkShift } from "./WorkShift.js";
import type { WorkingDay } from "./WorkingDay.js";

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

/** 1つの値について「入れられるか、入れられないならなぜか」 */
export type CellCandidateEvaluation = {
  cell: ShiftCell;
  /**
   * その値を入れると新しく出る違反。空ならその値は入れられる（＝候補集合に載る）。
   * 候補が0件（詰み）のセルで「なぜどれも入らないのか」を説明するために残す。
   */
  blockedBy: ConstraintViolationPlain[];
};

/**
 * その未定セルが取りうる各値について、入れた場合に新しい違反が出るかを調べる。
 *
 * 「未定」自体は決定ではないので対象から除く。候補が1件に絞られたら一意に決まった、
 * と言えるようにするため。
 *
 * ここで分かるのは「入れた瞬間に新しい違反が出るか」だけであることに注意する
 * （＝数独でいう naked single の材料）。「入れないと他の制約が満たせなくなる値」は
 * この関数では分からないので、computeCandidates の充足による絞り込みが担う。
 */
export function evaluateCellCandidates(
  schedule: MonthlyStaffSchedule,
  constraints: ScheduleConstraint[],
  staffId: string,
  day: WorkingDay,
  workShifts: WorkShift[]
): CellCandidateEvaluation[] {
  const before = schedule.checkConstraints(constraints);

  return enumerateCellCandidates(workShifts)
    .filter((cell) => cell.kind !== "undecided")
    .map((cell) => {
      const after = schedule
        .setCell(staffId, day, cell)
        .checkConstraints(constraints);
      return { cell, blockedBy: computeConstraintDelta(before, after).newlyViolated };
    });
}

/**
 * その未定セルが取りうる候補のうち、既存の制約チェックに対して新たな違反を
 * 一切増やさないものだけを返す（= 候補集合の中身となる「合法な候補」）。
 */
export function legalCandidatesFor(
  schedule: MonthlyStaffSchedule,
  constraints: ScheduleConstraint[],
  staffId: string,
  day: WorkingDay,
  workShifts: WorkShift[]
): ShiftCell[] {
  return evaluateCellCandidates(schedule, constraints, staffId, day, workShifts)
    .filter((evaluation) => evaluation.blockedBy.length === 0)
    .map((evaluation) => evaluation.cell);
}
