/**
 * repairDeadCell — 詰みセル（候補0件）を解消する「1手」を探す
 *
 * 候補集合は「今の盤面で何が入れられるか」しか言わない。何も入れられないセル（詰み）が
 * 出たとき、人が知りたいのはその先——**どこを書き換えればここが埋まるのか**。
 *
 * 探し方は総当たりだが、探す範囲は制約が自分で教えてくれる:
 *
 *   1. 詰みセルの各値について「なぜ入らないか」（＝新しく出る違反）を取る
 *      （evaluateCellCandidates。候補集合の計算で既に判定していることの副産物）
 *   2. その違反を動かせるセルの範囲を、違反を出した制約の scope から求める
 *      （cellsInScopeOf と同じ考え方。連勤なら本人の行、休み上限ならその日の列だけ）
 *   3. 範囲内の確定済みセルを1つずつ別の値に置き換えてみて、詰みセルに何か入るようになるかを見る
 *
 * 見つかった手はたいてい**別の問題と引き換え**になる（休ませればその日の人数が足りなくなる）。
 * どちらが良いかは制約の重み付け——つまり現場の判断——なので、ここでは決めない。
 * 解消される違反（resolves）と新たに出る違反（costs）を両方返して、選ぶのは人に委ねる。
 */
import type { ConstraintViolationPlain } from "./ConstraintViolation.js";
import type { ShiftCell } from "./MonthlyStaffSchedule.js";
import type { ScheduleConstraint } from "./ScheduleConstraint.js";
import { WorkingDay } from "./WorkingDay.js";
import type { ScheduleCellRef } from "./affectedCells.js";
import { shiftCellsEqual } from "./MonthlyStaffSchedule.js";
import { computeConstraintDelta } from "./ScheduleEditLog.js";
import {
  enumerateCellCandidates,
  evaluateCellCandidates,
  legalCandidatesFor,
  type CellCandidateEvaluation,
} from "./cellCandidates.js";
import type { CandidateComputationInput } from "./computeCandidates.js";

/** 詰みセルを解消する1手の書き換え案 */
export type ScheduleRepair = {
  /** 書き換えるセル（確定済み） */
  staffId: string;
  day: WorkingDay;
  /** そこを何に変えるか */
  to: ShiftCell;
  /** 書き換えると詰みセルに入れられるようになる値 */
  unlocks: ShiftCell[];
  /** この書き換えで解消される違反（詰みの解消そのものは含まない） */
  resolves: ConstraintViolationPlain[];
  /** この書き換えで新たに出る違反＝代償 */
  costs: ConstraintViolationPlain[];
};

/** 詰みセルの診断（なぜ入らないか＋どう直せるか） */
export type DeadCellDiagnosis = {
  staffId: string;
  day: WorkingDay;
  /** 値ごとの「入らない理由」 */
  blocked: CellCandidateEvaluation[];
  /** 解消できる1手の候補（代償の少ない順） */
  repairs: ScheduleRepair[];
};

/** 診断の plain 形（worker との受け渡し用。WorkingDay はキー文字列で運ぶ） */
export type ScheduleRepairPlain = Omit<ScheduleRepair, "day"> & { dayKey: string };
export type DeadCellDiagnosisPlain = Omit<DeadCellDiagnosis, "day" | "repairs"> & {
  dayKey: string;
  repairs: ScheduleRepairPlain[];
};

export function deadCellDiagnosisToPlain(
  diagnosis: DeadCellDiagnosis
): DeadCellDiagnosisPlain {
  const { day, repairs, ...rest } = diagnosis;
  return {
    ...rest,
    dayKey: day.key,
    repairs: repairs.map(({ day: repairDay, ...repair }) => ({
      ...repair,
      dayKey: repairDay.key,
    })),
  };
}

export function deadCellDiagnosisFromPlain(
  plain: DeadCellDiagnosisPlain
): DeadCellDiagnosis {
  const { dayKey, repairs, ...rest } = plain;
  return {
    ...rest,
    day: WorkingDay.fromKey(dayKey),
    repairs: repairs.map(({ dayKey: repairDayKey, ...repair }) => ({
      ...repair,
      day: WorkingDay.fromKey(repairDayKey),
    })),
  };
}

/** 探索の打ち切り（盤面が大きいときに時間を使い切らないための歯止め） */
export type RepairSearchLimits = {
  /** 1つの詰みセルについて返す手の上限 */
  maxRepairs?: number;
};

const DEFAULT_MAX_REPAIRS = 8;

/**
 * その違反を動かせるセルの範囲を、違反を出した制約の scope から求める。
 * computeCandidates の cellsInScopeOf と同じ規則だが、あちらは「違反を解消できるセル」、
 * こちらは「違反の成立に関わっているセル」を探す。範囲の求め方は同じなので規則を共有する。
 */
function cellsInfluencing(
  violation: ConstraintViolationPlain,
  constraint: ScheduleConstraint | undefined,
  input: CandidateComputationInput
): ScheduleCellRef[] {
  const scope = constraint?.scope ?? "global";
  const cells: ScheduleCellRef[] = [];
  const days = input.schedule.workingDays();
  const violationDays = days.filter((d) => violation.dayKeys.includes(d.key));

  if (scope === "cell" || scope === "staff") {
    if (!violation.staffId) return [];
    const target = scope === "cell" ? violationDays : days;
    for (const day of target) cells.push({ staffId: violation.staffId, day });
    return cells;
  }

  if (scope === "day") {
    for (const day of violationDays) {
      for (const staffId of input.staffIds) cells.push({ staffId, day });
    }
    return cells;
  }

  for (const staffId of input.staffIds) {
    for (const day of days) cells.push({ staffId, day });
  }
  return cells;
}

/**
 * 詰みセルを1手で解消できる書き換えを探す。
 * 何も見つからなければ空配列（＝1手では直らない盤面。制約そのものを緩めるしかない）。
 */
export function findRepairsForDeadCell(
  input: CandidateComputationInput,
  dead: ScheduleCellRef,
  limits: RepairSearchLimits = {}
): DeadCellDiagnosis {
  const { schedule, constraints, workShifts } = input;
  const blocked = evaluateCellCandidates(
    schedule,
    constraints,
    dead.staffId,
    dead.day,
    workShifts
  );

  const diagnosis: DeadCellDiagnosis = {
    staffId: dead.staffId,
    day: dead.day,
    blocked,
    repairs: [],
  };
  // 詰んでいないなら直すものは無い
  if (blocked.some((evaluation) => evaluation.blockedBy.length === 0)) return diagnosis;

  const constraintByType = new Map<string, ScheduleConstraint>();
  for (const constraint of constraints) {
    if (!constraintByType.has(constraint.type)) {
      constraintByType.set(constraint.type, constraint);
    }
  }

  // 塞いでいる違反すべてについて、その成立に関わるセルを集める（重複は1つにまとめる）
  const probes = new Map<string, ScheduleCellRef>();
  for (const evaluation of blocked) {
    for (const violation of evaluation.blockedBy) {
      const cells = cellsInfluencing(
        violation,
        constraintByType.get(violation.constraintType),
        input
      );
      for (const cell of cells) {
        // 詰みセル自身は書き換え先ではない（そこを埋めたいのだから）
        if (cell.staffId === dead.staffId && cell.day.equals(dead.day)) continue;
        // 未定セルは「書き換える」対象ではない（もともと自由に選べる）
        if (schedule.isUndecided(cell.staffId, cell.day)) continue;
        probes.set(`${cell.staffId}:${cell.day.key}`, cell);
      }
    }
  }

  const beforeViolations = schedule.checkConstraints(constraints);
  const values = enumerateCellCandidates(workShifts).filter(
    (cell) => cell.kind !== "undecided"
  );

  const repairs: ScheduleRepair[] = [];
  for (const probe of probes.values()) {
    const current = schedule.statusOf(probe.staffId, probe.day);
    for (const value of values) {
      if (shiftCellsEqual(current, value)) continue;

      const probed = schedule.setCell(probe.staffId, probe.day, value);
      const unlocks = legalCandidatesFor(
        probed,
        constraints,
        dead.staffId,
        dead.day,
        workShifts
      );
      if (unlocks.length === 0) continue; // まだ詰んだまま

      const delta = computeConstraintDelta(
        beforeViolations,
        probed.checkConstraints(constraints)
      );
      repairs.push({
        staffId: probe.staffId,
        day: probe.day,
        to: value,
        unlocks,
        resolves: delta.newlyResolved,
        costs: delta.newlyViolated,
      });
    }
  }

  // 代償の少ない順 → 解消する違反の多い順 → 盤面の読み順（同点でも並びが揺れないように）
  repairs.sort(
    (a, b) =>
      a.costs.length - b.costs.length ||
      b.resolves.length - a.resolves.length ||
      (a.day.key < b.day.key ? -1 : a.day.key > b.day.key ? 1 : 0) ||
      (a.staffId < b.staffId ? -1 : a.staffId > b.staffId ? 1 : 0)
  );

  diagnosis.repairs = repairs.slice(0, limits.maxRepairs ?? DEFAULT_MAX_REPAIRS);
  return diagnosis;
}
