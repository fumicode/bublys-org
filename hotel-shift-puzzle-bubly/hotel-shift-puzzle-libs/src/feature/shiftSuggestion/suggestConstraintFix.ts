import {
  shiftCellsEqual,
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
import type { PolicyShiftSuggestion } from "./types.js";
import { MAX_STAFFING_FIX_MOVES, resolveStaffingSideEffects } from "./suggestStaffingFix.js";

/** ロールアウト評価するセル候補の上限（上位スコアから） */
export const MAX_FIX_CANDIDATES = 5;

export type ConstraintFixSuggestion = {
  id: string;
  cell: ShiftCell;
  reasons: string[];
  violationsBefore: number;
  violationsAfter: number;
  /**
   * このセルを変えた副作用で他の勤務帯が新たに人数不足になった場合、それを連鎖で
   * 解消するために必要な追加の一手。適用はしない（見通しとして理由文に使う）。
   */
  followUpSteps: Array<{ staffId: string; dayKey: string; shiftId: string }>;
};

type SuggestConstraintFixArgs = {
  schedule: MonthlyStaffSchedule;
  staffId: string;
  day: WorkingDay;
  constraints: ScheduleConstraint[];
  /** ヒューリスティックで既にランク済みの候補（呼び出し側のポリシーをそのまま使う） */
  suggestions: PolicyShiftSuggestion[];
  staffList: Staff[];
  workShifts: WorkShift[];
  wishByStaff: Map<string, StaffMonthlyShiftWish>;
  availability?: ScheduleAvailability;
  /** 副作用（人数不足）の連鎖解決に使う。suggestStaffingFix と同じ文脈。 */
  preferenceOf?: (staffId: string, day: WorkingDay) => DecodedWish;
  isAvailable?: (staffId: string, shiftId: string) => boolean;
  linkedReportScoreOf?: (staffId: string) => number;
  isBusyDay?: (dayKey: string) => boolean;
};

/**
 * 今このセルに出ている制約違反を、既存の自動ステップで数手先までロールアウトした
 * 見通しごと比較し、最も違反を減らせる代替値を1つだけ返す。
 * 候補がその日の別の勤務帯を新たに人数不足にする場合は、suggestStaffingFix と同じ連鎖解決
 * （残り手数の範囲）を試し、解決できない候補は採用しない（横流しで別の穴を開けるだけの
 * 提案をしない）。
 * 改善が見込めないときは null（無理に提案しない＝緩い提案）。
 */
export function suggestConstraintFix(
  args: SuggestConstraintFixArgs
): ConstraintFixSuggestion | null {
  const currentCell = args.schedule.statusOf(args.staffId, args.day);
  const violationsBefore = args.schedule.checkConstraints(args.constraints).length;
  if (violationsBefore === 0) return null;

  let best: {
    suggestion: PolicyShiftSuggestion;
    violations: number;
    followUpSteps: Array<{ staffId: string; dayKey: string; shiftId: string }>;
  } | null = null;

  for (const suggestion of args.suggestions.slice(0, MAX_FIX_CANDIDATES)) {
    if (suggestion.cell.kind === "undecided") continue;
    if (shiftCellsEqual(suggestion.cell, currentCell)) continue;

    let projected = args.schedule.setCell(args.staffId, args.day, suggestion.cell);
    for (const step of AUTO_SHIFT_STEPS) {
      projected = runAutoShiftStep(step, {
        schedule: projected,
        staffList: args.staffList,
        workShifts: args.workShifts,
        wishByStaff: args.wishByStaff,
        availability: args.availability,
      }).schedule;
    }

    // この一手の副作用で、その日の別の勤務帯が新たに人数不足になっていないか。
    // なっていれば残り手数の範囲で連鎖解決を試み、解決できないなら候補から外す。
    const sideEffects = resolveStaffingSideEffects(
      args.schedule,
      projected,
      args.day,
      args,
      MAX_STAFFING_FIX_MOVES - 1
    );
    if (!sideEffects) continue;

    const violations = sideEffects.schedule.checkConstraints(args.constraints).length;
    if (!best || violations < best.violations) {
      best = {
        suggestion,
        violations,
        followUpSteps: sideEffects.steps.map(({ staffId, dayKey, shiftId }) => ({
          staffId,
          dayKey,
          shiftId,
        })),
      };
    }
  }

  if (!best || best.violations >= violationsBefore) return null;

  return {
    id: best.suggestion.id,
    cell: best.suggestion.cell,
    reasons: best.suggestion.reasons,
    violationsBefore,
    violationsAfter: best.violations,
    followUpSteps: best.followUpSteps,
  };
}
