/**
 * cellCandidates — 1セルに入れられる値（候補）の列挙と、合法な候補の絞り込み
 *
 * 候補集合機能の最小単位。ここは「そのセル単体で見て入れられるか」だけを判定し、
 * 「盤面全体として、どのセルが一意に決まるか」は computeCandidates が組み立てる。
 */
import type {
  ConstraintViolation,
  ConstraintViolationPlain,
} from "./ConstraintViolation.js";
import type { MonthlyStaffSchedule, ShiftCell } from "./MonthlyStaffSchedule.js";
import { computeConstraintDelta } from "./ConstraintDelta.js";
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
  const cells = enumerateCellCandidates(workShifts).filter(
    (cell) => cell.kind !== "undecided"
  );
  const introduced = violationsIntroducedBy(schedule, constraints, staffId, day, cells);
  // 候補評価は worker 境界を越える（structured clone）ので plain にして返す
  return cells.map((cell, i) => ({
    cell,
    blockedBy: introduced[i].map((v) => v.toPlain()),
  }));
}

/** そのセルにその値を入れたときの見込み（選択肢をセルの姿で描くのに使う） */
export type CellValuePreview = {
  cell: ShiftCell;
  /** 入れたあとの盤面の全違反（このセルにかかるものを選べば、入れたときのセルの姿になる） */
  after: ConstraintViolation[];
  /** 今の盤面と比べて新しく出る違反 */
  introduced: ConstraintViolation[];
};

/**
 * そのセルに各値を入れたときの見込み（cells と同じ順に返す）。
 *
 * 比べる相手は「今の盤面」なので、確定済みのセルなら「今の値からその値に替えたら」になる。
 * 今の値と同じ値なら盤面が変わらないので introduced は空になる。未定に戻す（クリア）も同じ式で
 * 見られる（必要人数が足りなくなる、など）。
 */
export function previewCellValues(
  schedule: MonthlyStaffSchedule,
  constraints: ScheduleConstraint[],
  staffId: string,
  day: WorkingDay,
  cells: ShiftCell[]
): CellValuePreview[] {
  const before = schedule.checkConstraints(constraints);
  return cells.map((cell) => {
    const after = schedule.setCell(staffId, day, cell).checkConstraints(constraints);
    return { cell, after, introduced: computeConstraintDelta(before, after).newlyViolated };
  });
}

/** そのセルを各値に替えたら、新しく出る違反（cells と同じ順に返す。{@link previewCellValues} の introduced） */
export function violationsIntroducedBy(
  schedule: MonthlyStaffSchedule,
  constraints: ScheduleConstraint[],
  staffId: string,
  day: WorkingDay,
  cells: ShiftCell[]
): ConstraintViolation[][] {
  return previewCellValues(schedule, constraints, staffId, day, cells).map(
    (p) => p.introduced
  );
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
