import type {
  AutoShiftStep,
  MonthlyStaffSchedule,
  ScheduleConstraint,
} from "@bublys-org/hotel-shift-puzzle-model";
import { SHIFT_LEADER_CONSTRAINT } from "@bublys-org/hotel-shift-puzzle-model";

export type AutoStepSuggestion = {
  stepKey: string;
  score: number;
  reason: string;
};

function countUndecided(schedule: MonthlyStaffSchedule): number {
  return schedule.state.assignments.filter((a) => a.isUndecided).length;
}

/** 日ごとの必要人数合計と出勤人数の差分を足し合わせた粗い需要ギャップ */
function totalStaffingGap(schedule: MonthlyStaffSchedule): number {
  let gap = 0;
  for (const day of schedule.workingDays()) {
    const byName = schedule.requiredStaffing.state.byDay[day.key] ?? {};
    const totalRequired = Object.values(byName).reduce((s, n) => s + n, 0);
    const totalAssigned = schedule.assignmentsOn(day).filter((a) => a.isWorking).length;
    gap += Math.max(0, totalRequired - totalAssigned);
  }
  return gap;
}

function scoreStep(
  step: AutoShiftStep,
  ctx: {
    undecidedCount: number;
    violationCount: number;
    staffingGap: number;
    leaderViolationCount: number;
  }
): AutoStepSuggestion {
  const key = step.key.toLowerCase();
  const label = step.label.toLowerCase();
  let score = 0;
  const reasons: string[] = [];

  if (ctx.undecidedCount >= 3 && ctx.violationCount <= 2) {
    if (key.includes("wish") || label.includes("希望")) {
      score += 10 + Math.min(ctx.undecidedCount, 20);
      reasons.push(`未定セルが${ctx.undecidedCount}件`);
    }
  }

  if (ctx.staffingGap > 0) {
    if (
      key.includes("fill") ||
      key.includes("demand") ||
      label.includes("必要人数")
    ) {
      score += 12 + ctx.staffingGap;
      reasons.push(`需要不足が約${ctx.staffingGap}人分`);
    }
  }

  if (ctx.leaderViolationCount > 0) {
    if (
      key.includes("leader") ||
      key.includes("partner") ||
      label.includes("責任者") ||
      label.includes("相方")
    ) {
      score += 8 + ctx.leaderViolationCount * 2;
      reasons.push(`責任者違反が${ctx.leaderViolationCount}件`);
    }
  }

  if (score === 0) {
    score = 1;
    reasons.push("いつでも実行可能");
  }

  return {
    stepKey: step.key,
    score,
    reason: reasons.join("、"),
  };
}

/**
 * 自動シフトパネル向け: 現在の勤務表状態からおすすめステップを1つ返す。
 */
export function suggestAutoStep(args: {
  schedule: MonthlyStaffSchedule;
  constraints: ScheduleConstraint[];
  steps: AutoShiftStep[];
}): AutoStepSuggestion | null {
  const { schedule, constraints, steps } = args;
  if (steps.length === 0) return null;

  const violations = schedule.checkConstraints(constraints);
  const leaderViolationCount = violations.filter((v) =>
    v.constraintType.startsWith(SHIFT_LEADER_CONSTRAINT)
  ).length;

  const ctx = {
    undecidedCount: countUndecided(schedule),
    violationCount: violations.length,
    staffingGap: totalStaffingGap(schedule),
    leaderViolationCount,
  };

  const ranked = steps
    .map((step) => scoreStep(step, ctx))
    .sort((a, b) => b.score - a.score);

  return ranked[0] ?? null;
}
