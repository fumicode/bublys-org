/**
 * computeCandidates — 勤務表全体の候補集合を組み立てる
 *
 * 2つの絞り込みを重ねる:
 *
 *   1. 入れられない値を落とす（cellCandidates.legalCandidatesFor）
 *      「その値を入れた瞬間に新しい違反が出る」候補を除く。連勤上限に達している人の
 *      出勤候補などがここで落ちる。
 *
 *   2. 入れなければ満たせない値に絞る（narrowByUnsatisfiedConstraints）
 *      今まだ満たされていない制約について、それを解消できる一手が「たった1つのセル」にしか
 *      残っていなければ、そのセルの候補をその値だけに絞る。
 *      例: 早番に責任者が1人必要な日で、候補者のうち1人が休み・もう1人が遅番で確定したら、
 *          残った1人は早番しか取りえない。1 の判定だけでは（その日の違反はもともと出ている
 *          ので）落とせないため、この絞り込みが要る。
 *
 * 確定済みのセルは触らない。「後から見ると別の値が正しかった」場合は、人がそのセルを
 * 書き換える（世界線で戻る）前提で、ソフトウェアからは巻き戻さない。
 */
import type { ConstraintViolation } from "./ConstraintViolation.js";
import type { MonthlyStaffSchedule, ShiftCell } from "./MonthlyStaffSchedule.js";
import type { ScheduleConstraint } from "./ScheduleConstraint.js";
import type { WorkShift } from "./WorkShift.js";
import type { WorkingDay } from "./WorkingDay.js";
import { affectedCells, cellRefKey, type ScheduleCellRef } from "./affectedCells.js";
import { legalCandidatesFor } from "./cellCandidates.js";
import { ScheduleCandidates, candidateCellKey } from "./ScheduleCandidates.js";

/** 候補集合の計算に要る文脈（勤務表・効いている制約・選べる勤務帯・対象スタッフ） */
export type CandidateComputationInput = {
  schedule: MonthlyStaffSchedule;
  constraints: ScheduleConstraint[];
  workShifts: WorkShift[];
  staffIds: string[];
};

/** 盤面の全未定セルについて候補集合を計算する（初期化・制約変更時） */
export function computeAllCandidates(
  input: CandidateComputationInput
): ScheduleCandidates {
  const byCell: Record<string, ShiftCell[]> = {};
  for (const staffId of input.staffIds) {
    for (const day of input.schedule.workingDays()) {
      if (!input.schedule.isUndecided(staffId, day)) continue;
      byCell[candidateCellKey(staffId, day.key)] = legalCandidatesFor(
        input.schedule,
        input.constraints,
        staffId,
        day,
        input.workShifts
      );
    }
  }
  const naked = new ScheduleCandidates({
    scheduleId: input.schedule.id,
    byCell,
  });
  return narrowByUnsatisfiedConstraints(naked, input);
}

/**
 * 変更されたセルの影響範囲だけを計算し直した候補集合を返す（セル編集時）。
 *
 * 範囲は制約の scope 宣言から求める（affectedCells）。範囲外のセルは前回の候補をそのまま
 * 引き継ぐので、盤面全体の再計算を避けられる。
 * prev が別の勤務表のものだった場合は、安全側に倒して全計算し直す。
 */
export function recomputeCandidates(
  prev: ScheduleCandidates,
  input: CandidateComputationInput,
  changed: ScheduleCellRef[]
): ScheduleCandidates {
  if (prev.scheduleId !== input.schedule.id) return computeAllCandidates(input);

  const affected = new Map<string, ScheduleCellRef>();
  for (const cell of changed) {
    for (const next of affectedCells(
      cell,
      input.constraints,
      input.schedule,
      input.staffIds
    )) {
      affected.set(cellRefKey(next), next);
    }
  }

  const byCell = { ...prev.state.byCell };
  for (const cell of affected.values()) {
    const key = candidateCellKey(cell.staffId, cell.day.key);
    if (!input.schedule.isUndecided(cell.staffId, cell.day)) {
      delete byCell[key]; // 確定したセルは候補集合から外れる
      continue;
    }
    byCell[key] = legalCandidatesFor(
      input.schedule,
      input.constraints,
      cell.staffId,
      cell.day,
      input.workShifts
    );
  }

  const naked = new ScheduleCandidates({
    scheduleId: input.schedule.id,
    byCell,
  });
  return narrowByUnsatisfiedConstraints(naked, input, [...affected.values()]);
}

/**
 * まだ満たされていない制約について、それを解消できる一手が1つのセルにしか残っていなければ、
 * そのセルの候補をその値だけに絞る。
 *
 * 判定は「その候補を入れると、この違反（同じ key の違反）が消えるか」だけで行うので、
 * 制約の中身を知らなくても効く（制約は check() と scope しか公開しない）。
 * 1手では解消できない違反（責任者が2人不足など）は、解消できる候補が1つも見つからないので
 * 何も絞らない＝無理に決めつけない。
 *
 * 絞り込みは1パスだけ行う（絞った結果を使ってさらに絞る連鎖はしない）。連鎖は人が承認して
 * セルが確定したときに、次の再計算として自然に起きる。
 */
function narrowByUnsatisfiedConstraints(
  candidates: ScheduleCandidates,
  input: CandidateComputationInput,
  /** 指定すると、この範囲に関わる違反だけを見る（差分再計算用） */
  onlyTouching?: ScheduleCellRef[]
): ScheduleCandidates {
  const violations = input.schedule.checkConstraints(input.constraints);
  if (violations.length === 0) return candidates;

  const constraintByType = new Map<string, ScheduleConstraint>();
  for (const constraint of input.constraints) {
    if (!constraintByType.has(constraint.type)) {
      constraintByType.set(constraint.type, constraint);
    }
  }

  const touchedKeys = onlyTouching
    ? new Set(onlyTouching.map((c) => cellRefKey(c)))
    : undefined;

  let result = candidates;
  for (const violation of violations) {
    const constraint = constraintByType.get(violation.constraintType);
    if (!constraint) continue;

    const scopeCells = cellsInScopeOf(violation, constraint, input);
    if (touchedKeys && !scopeCells.some((c) => touchedKeys.has(cellRefKey(c)))) {
      continue; // この違反は今回の変更に関係しない
    }

    const fix = singleFixingCellFor(violation, constraint, scopeCells, result, input);
    if (fix) {
      result = result.withCell(fix.staffId, fix.day, fix.cells);
    }
  }
  return result;
}

/**
 * その違反を解消しうるセルの範囲を、制約の scope から求める。
 * 'day' なら違反日の全スタッフ、'staff' なら違反者の全稼働日、'cell' ならそのセルだけ、
 * 'global'（未宣言）なら盤面全体。
 */
function cellsInScopeOf(
  violation: ConstraintViolation,
  constraint: ScheduleConstraint,
  input: CandidateComputationInput
): ScheduleCellRef[] {
  const scope = constraint.scope ?? "global";
  const cells: ScheduleCellRef[] = [];
  const push = (staffId: string, day: WorkingDay) => cells.push({ staffId, day });

  if (scope === "cell" || scope === "staff") {
    if (!violation.staffId) return [];
    const days =
      scope === "cell" ? violation.days : input.schedule.workingDays();
    for (const day of days) push(violation.staffId, day);
    return cells;
  }

  if (scope === "day") {
    for (const day of violation.days) {
      for (const staffId of input.staffIds) push(staffId, day);
    }
    return cells;
  }

  for (const staffId of input.staffIds) {
    for (const day of input.schedule.workingDays()) push(staffId, day);
  }
  return cells;
}

/**
 * その違反を1手で解消できるセルを探す。解消できるセルがちょうど1つなら、そのセルと
 * 「解消できる値の集合」を返す（値が複数残ることはある。例えば同名の勤務帯が複数IDある場合）。
 * 解消できるセルが0個・2個以上なら null（まだ決まらない）。
 */
function singleFixingCellFor(
  violation: ConstraintViolation,
  constraint: ScheduleConstraint,
  scopeCells: ScheduleCellRef[],
  candidates: ScheduleCandidates,
  input: CandidateComputationInput
): { staffId: string; day: WorkingDay; cells: ShiftCell[] } | null {
  let found: { staffId: string; day: WorkingDay; cells: ShiftCell[] } | null = null;

  for (const scopeCell of scopeCells) {
    const options = candidates.candidatesOf(scopeCell.staffId, scopeCell.day);
    if (!options || options.length === 0) continue; // 確定済み or 詰み

    const fixing = options.filter((option) =>
      resolvesViolation(violation, constraint, scopeCell, option, input)
    );
    if (fixing.length === 0) continue;

    if (found) return null; // 解消できるセルが2つ以上ある＝まだ絞れない
    found = { staffId: scopeCell.staffId, day: scopeCell.day, cells: fixing };
  }

  // 既に1件（＝その値しか取れない）なら絞る意味がないが、返しても結果は変わらない
  return found;
}

/** その候補を入れると、この違反（同じ key の違反）が消えるか */
function resolvesViolation(
  violation: ConstraintViolation,
  constraint: ScheduleConstraint,
  cell: ScheduleCellRef,
  option: ShiftCell,
  input: CandidateComputationInput
): boolean {
  const after = input.schedule.setCell(cell.staffId, cell.day, option);
  return !constraint.check(after).some((v) => v.key === violation.key);
}
