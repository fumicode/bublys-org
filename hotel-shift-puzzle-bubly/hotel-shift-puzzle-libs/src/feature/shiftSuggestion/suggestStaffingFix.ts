import {
  type MonthlyStaffSchedule,
  type ScheduleConstraint,
  type ShiftCell,
  type Staff,
  type StaffMonthlyShiftWish,
  type WorkShift,
  type WorkingDay,
  type ScheduleAvailability,
  type DecodedWish,
} from "@bublys-org/hotel-shift-puzzle-model";
import { AUTO_SHIFT_STEPS, runAutoShiftStep } from "../autoShift.js";
import { HeuristicSuggestionPolicy } from "./heuristicPolicy.js";

/** 連鎖として試す手数の上限（最初の一手＋副作用の解消で最大この手数まで）。 */
export const MAX_STAFFING_FIX_MOVES = 2;
/** 各段でロールアウト評価するスタッフ候補の上限（ヒューリスティックの上位スコアから） */
export const MAX_STAFFING_FIX_BRANCH = 3;

export type StaffingFixSuggestion = {
  /** 最初の一手の対象者（実際に適用するのはこの1人・このセルだけ） */
  staffId: string;
  cell: ShiftCell;
  reasons: string[];
  violationsBefore: number;
  /** 連鎖を最後まで適用した場合の見通し（このセルだけ適用した直後の値ではない） */
  violationsAfter: number;
  gapBefore: number;
  gapAfter: number;
  /**
   * この一手の副作用で生じた不足を、連鎖でさらに解消するために必要な追加の一手。
   * 適用はしない（見通しとして理由文に使う）。空なら副作用なしでこの一手だけで完結。
   */
  followUpSteps: Array<{ staffId: string; dayKey: string; shiftId: string }>;
};

/**
 * 人数不足の連鎖解決に必要な文脈（day/shiftId 以外）。
 * suggestStaffingFix・suggestConstraintFix の両方から同じ形で使う。
 */
export type StaffingFixContext = {
  constraints: ScheduleConstraint[];
  staffList: Staff[];
  workShifts: WorkShift[];
  wishByStaff: Map<string, StaffMonthlyShiftWish>;
  availability?: ScheduleAvailability;
  preferenceOf?: (staffId: string, day: WorkingDay) => DecodedWish;
  isAvailable?: (staffId: string, shiftId: string) => boolean;
  linkedReportScoreOf?: (staffId: string) => number;
  isBusyDay?: (dayKey: string) => boolean;
};

export type StaffingMoveStep = {
  staffId: string;
  dayKey: string;
  shiftId: string;
  reasons: string[];
};

export type StaffingChainResult = {
  steps: StaffingMoveStep[];
  schedule: MonthlyStaffSchedule;
  violations: number;
};

type SuggestStaffingFixArgs = StaffingFixContext & {
  schedule: MonthlyStaffSchedule;
  day: WorkingDay;
  /** 埋めたい勤務帯（人数不足のセルが指す代表 shiftId） */
  shiftId: string;
};

/** 勤務帯を名前でグループ化する（同名なら同一勤務帯として必要人数を合算比較する）。 */
function groupShiftsByName(workShifts: WorkShift[]): Array<{ name: string; ids: string[] }> {
  const groups: Array<{ name: string; ids: string[] }> = [];
  const indexByName = new Map<string, number>();
  for (const w of workShifts) {
    let idx = indexByName.get(w.name);
    if (idx === undefined) {
      idx = groups.length;
      indexByName.set(w.name, idx);
      groups.push({ name: w.name, ids: [] });
    }
    groups[idx].ids.push(w.id);
  }
  return groups;
}

/** その日・各勤務帯（代表 shiftId ごと）の不足人数（0以上）。必要数0の勤務帯は含めない。 */
function shiftDeficitsOn(
  schedule: MonthlyStaffSchedule,
  day: WorkingDay,
  workShifts: WorkShift[]
): Map<string, number> {
  const assignedByShift = schedule.countWorkingByShift(day);
  const deficits = new Map<string, number>();
  for (const g of groupShiftsByName(workShifts)) {
    const required = schedule.requiredFor(day, g.name);
    if (required <= 0) continue;
    const assigned = g.ids.reduce((sum, id) => sum + (assignedByShift.get(id) ?? 0), 0);
    deficits.set(g.ids[0], Math.max(0, required - assigned));
  }
  return deficits;
}

/** 勤務表全体（全稼働日×全勤務帯）の不足人数の合計。 */
function totalStaffingGap(schedule: MonthlyStaffSchedule, workShifts: WorkShift[]): number {
  let gap = 0;
  for (const day of schedule.workingDays()) {
    for (const deficit of shiftDeficitsOn(schedule, day, workShifts).values()) gap += deficit;
  }
  return gap;
}

function pickBetterChain(
  a: StaffingChainResult | null,
  b: StaffingChainResult
): StaffingChainResult {
  if (!a) return b;
  if (b.violations !== a.violations) return b.violations < a.violations ? b : a;
  return b.steps.length <= a.steps.length ? b : a; // 手数が少ない方を優先
}

/**
 * ある変更の前後（before→after）で、その日のどこかの勤務帯が新たに人数不足になっていないか調べる。
 * なっていなければ steps: [] を返す（副作用なし）。なっていれば、残り手数の範囲で
 * resolveStaffingGap による連鎖解決を試み、全部解決できればその連鎖の手順を返す。
 * 予算内で解決できない副作用が残るなら null（この変更は採用しない）。
 *
 * suggestStaffingFix（人数不足セル起点）・suggestConstraintFix（制約違反セル起点）の
 * どちらも、何かのセルを変えた後にこれを呼んで「他の勤務帯を巻き込んでいないか」を確認する。
 */
export function resolveStaffingSideEffects(
  before: MonthlyStaffSchedule,
  after: MonthlyStaffSchedule,
  day: WorkingDay,
  ctx: StaffingFixContext,
  movesLeft: number
): { schedule: MonthlyStaffSchedule; steps: StaffingMoveStep[] } | null {
  const deficitsBefore = shiftDeficitsOn(before, day, ctx.workShifts);
  const deficitsAfter = shiftDeficitsOn(after, day, ctx.workShifts);
  const worsened = [...deficitsAfter.entries()]
    .filter(([shiftId, deficit]) => deficit > (deficitsBefore.get(shiftId) ?? 0))
    .map(([shiftId]) => shiftId);

  if (worsened.length === 0) return { schedule: after, steps: [] };
  if (movesLeft <= 0) return null; // これ以上の連鎖に使える手数が残っていない

  let schedule = after;
  let steps: StaffingMoveStep[] = [];
  for (const worsenedShiftId of worsened) {
    const sub = resolveStaffingGap(day, worsenedShiftId, schedule, ctx, movesLeft);
    if (!sub) return null;
    steps = [...steps, ...sub.steps];
    schedule = sub.schedule;
  }
  return { schedule, steps };
}

/**
 * (日, 勤務帯) の人数不足を、最大 movesLeft 手先まで見越して解決する。
 * ある候補を動かした結果、別の勤務帯が新たに不足しても、それを追加の一手（残り手数の範囲内）で
 * 解消できるなら、その候補は「良い一手」として採用する（1手先だけで悪化と即断しない）。
 * どの候補も予算内で解消できなければ null（無理に提案しない）。
 */
export function resolveStaffingGap(
  day: WorkingDay,
  shiftId: string,
  schedule: MonthlyStaffSchedule,
  ctx: StaffingFixContext,
  movesLeft: number
): StaffingChainResult | null {
  const violationsBefore = schedule.checkConstraints(ctx.constraints).length;
  const targetCell: ShiftCell = { kind: "work", shiftId };
  const policy = new HeuristicSuggestionPolicy();

  const scored: Array<{ staffId: string; score: number; reasons: string[] }> = [];
  for (const staff of ctx.staffList) {
    const current = schedule.statusOf(staff.id, day);
    if (current.kind === "work" && current.shiftId === shiftId) continue; // 既にこの勤務帯
    if (ctx.isAvailable && !ctx.isAvailable(staff.id, shiftId)) continue; // 入れない勤務帯

    const ranked = policy.rankCellCandidates({
      schedule,
      constraints: ctx.constraints,
      staffId: staff.id,
      day,
      workShifts: ctx.workShifts,
      preferenceOf: ctx.preferenceOf,
      isAvailable: ctx.isAvailable,
      linkedReportScoreOf: ctx.linkedReportScoreOf,
      isBusyDay: ctx.isBusyDay,
    });
    const candidate = ranked.find((r) => r.cell.kind === "work" && r.cell.shiftId === shiftId);
    if (candidate) {
      scored.push({ staffId: staff.id, score: candidate.score, reasons: candidate.reasons });
    }
  }
  scored.sort((a, b) => b.score - a.score);

  let best: StaffingChainResult | null = null;

  for (const s of scored.slice(0, MAX_STAFFING_FIX_BRANCH)) {
    let projected = schedule.setCell(s.staffId, day, targetCell);
    for (const step of AUTO_SHIFT_STEPS) {
      projected = runAutoShiftStep(step, {
        schedule: projected,
        staffList: ctx.staffList,
        workShifts: ctx.workShifts,
        wishByStaff: ctx.wishByStaff,
        availability: ctx.availability,
      }).schedule;
    }
    const violationsAfter = projected.checkConstraints(ctx.constraints).length;
    if (violationsAfter > violationsBefore) continue; // 制約の悪化はどの段でも許さない

    const thisStep: StaffingMoveStep = {
      staffId: s.staffId,
      dayKey: day.key,
      shiftId,
      reasons: s.reasons,
    };

    const sideEffects = resolveStaffingSideEffects(schedule, projected, day, ctx, movesLeft - 1);
    if (!sideEffects) continue; // 副作用が予算内で解決できない候補は却下

    best = pickBetterChain(best, {
      steps: [thisStep, ...sideEffects.steps],
      schedule: sideEffects.schedule,
      violations: sideEffects.schedule.checkConstraints(ctx.constraints).length,
    });
  }

  return best;
}

/**
 * 「(日, 勤務帯)の人数不足」を起点に、その日その勤務帯へ入れる代替候補を探す。
 * 1手先だけでなく、最大 MAX_STAFFING_FIX_MOVES 手先までの副作用の連鎖解決を見越して判断する
 * （動かした先で別の不足が生じても、それが数手先で解消できるなら良い一手として採用する）。
 * 実際に返す/適用対象にするのは最初の一手だけで、連鎖の続きは followUpSteps として理由文に使う。
 * 予算内でどの候補も解消できなければ null（無理に提案しない）。
 */
export function suggestStaffingFix(
  args: SuggestStaffingFixArgs
): StaffingFixSuggestion | null {
  const violationsBefore = args.schedule.checkConstraints(args.constraints).length;
  const gapBefore = totalStaffingGap(args.schedule, args.workShifts);

  const resolved = resolveStaffingGap(
    args.day,
    args.shiftId,
    args.schedule,
    args,
    MAX_STAFFING_FIX_MOVES
  );
  if (!resolved) return null;

  const [firstStep, ...followUpSteps] = resolved.steps;
  return {
    staffId: firstStep.staffId,
    cell: { kind: "work", shiftId: args.shiftId },
    reasons: firstStep.reasons,
    violationsBefore,
    violationsAfter: resolved.violations,
    gapBefore,
    gapAfter: totalStaffingGap(resolved.schedule, args.workShifts),
    followUpSteps: followUpSteps.map(({ staffId, dayKey, shiftId }) => ({
      staffId,
      dayKey,
      shiftId,
    })),
  };
}
