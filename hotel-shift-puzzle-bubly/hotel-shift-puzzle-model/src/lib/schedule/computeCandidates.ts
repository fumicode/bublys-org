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
 *
 * ## 不変条件：候補集合は盤面だけの関数
 *
 *   recomputeCandidates(prev, input, changed)  ===  computeAllCandidates(input)
 *
 * 差分計算をしても、そこに至る編集の順番に結果が左右されてはいけない（同じ盤面なら
 * 常に同じ提案が出る。世界線で戻れば戻る前と同じ提案になる）。そのために、
 *
 *   - 差分で引き継ぐのは 1 の結果（legalByCell）**だけ**。制約の scope 宣言から
 *     影響範囲が閉じているので、範囲外のセルの合法候補は変わらないと言い切れる
 *   - 2 の絞り込みは毎回、今の盤面の全違反から掛け直す。前回の絞り込み結果を
 *     土台にして更に絞ることはしない（絞り込みは違反から導かれる派生でしかない）
 *
 * 絞り込みは1パスだけ行う（絞った結果を使ってさらに絞る連鎖はしない）。連鎖は人が承認して
 * セルが確定したときに、次の再計算として自然に起きる。
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
  const legalByCell: Record<string, ShiftCell[]> = {};
  for (const staffId of input.staffIds) {
    for (const day of input.schedule.workingDays()) {
      if (!input.schedule.isUndecided(staffId, day)) continue;
      legalByCell[candidateCellKey(staffId, day.key)] = legalCandidatesFor(
        input.schedule,
        input.constraints,
        staffId,
        day,
        input.workShifts
      );
    }
  }
  return narrowByUnsatisfiedConstraints(
    ScheduleCandidates.fromLegal(input.schedule.id, legalByCell),
    input
  );
}

/**
 * 変更されたセルの影響範囲だけを計算し直した候補集合を返す（セル編集時）。
 *
 * 差分で引き継ぐのは合法候補（prev.state.legalByCell）だけで、絞り込みは全体に掛け直す。
 * 範囲は制約の scope 宣言から求める（affectedCells）。範囲外のセルは前回の合法候補をそのまま
 * 引き継ぐので、盤面全体の再計算を避けられる。
 *
 * 未定 → 確定（承認）、確定 → 別の値（書き換え）、確定 → 未定（差し戻し）のいずれも
 * 同じ経路で扱える。確定したセルは候補集合から外れ、未定に戻ったセルは合法候補を得て戻る。
 *
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

  const legalByCell = { ...prev.state.legalByCell };
  for (const cell of affected.values()) {
    const key = candidateCellKey(cell.staffId, cell.day.key);
    if (!input.schedule.isUndecided(cell.staffId, cell.day)) {
      delete legalByCell[key]; // 確定したセルは候補集合から外れる
      continue;
    }
    legalByCell[key] = legalCandidatesFor(
      input.schedule,
      input.constraints,
      cell.staffId,
      cell.day,
      input.workShifts
    );
  }

  return narrowByUnsatisfiedConstraints(
    ScheduleCandidates.fromLegal(input.schedule.id, legalByCell),
    input
  );
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
 * 入力は必ず絞り込み前の合法候補（ScheduleCandidates.fromLegal で作ったもの）を渡すこと。
 * 絞り込み済みの集合を渡すと、絞り込みが積み重なって編集の順番に結果が依存する。
 */
function narrowByUnsatisfiedConstraints(
  candidates: ScheduleCandidates,
  input: CandidateComputationInput
): ScheduleCandidates {
  const violations = input.schedule.checkConstraints(input.constraints);
  if (violations.length === 0) return candidates;

  const constraintByType = new Map<string, ScheduleConstraint>();
  for (const constraint of input.constraints) {
    if (!constraintByType.has(constraint.type)) {
      constraintByType.set(constraint.type, constraint);
    }
  }

  let result = candidates;
  for (const violation of violations) {
    const constraint = constraintByType.get(violation.constraintType);
    if (!constraint) continue;

    const scopeCells = cellsInScopeOf(violation, constraint, input);
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
