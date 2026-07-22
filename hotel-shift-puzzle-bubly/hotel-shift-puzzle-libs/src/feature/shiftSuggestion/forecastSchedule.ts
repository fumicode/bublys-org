import {
  ScheduleForecast,
  computeConstraintDelta,
  shiftCellsEqual,
  type MonthlyStaffSchedule,
  type ScheduleConstraint,
  type ScheduleForecastIntent,
  type ScheduleForecastMetrics,
  type ScheduleForecastRisk,
  type Staff,
  type StaffMonthlyShiftWish,
  type WorkShift,
  type WorkingDay,
  type ScheduleAvailability,
  type DecodedWish,
} from "@bublys-org/hotel-shift-puzzle-model";
import { AUTO_SHIFT_STEPS, runAutoShiftStep } from "../autoShift.js";
import type { PolicyShiftSuggestion } from "./types.js";

export const SCHEDULE_FORECAST_VERSION = "1";

/** ロールアウト評価するセル候補の上限（上位スコアから） */
export const MAX_FORECAST_CANDIDATES = 5;

export type BuiltScheduleForecast = {
  forecast: ScheduleForecast;
  decisionSchedule: MonthlyStaffSchedule;
  projectedSchedule: MonthlyStaffSchedule;
};

type BuildScheduleForecastsArgs = {
  schedule: MonthlyStaffSchedule;
  baseNodeId: string;
  staffId: string;
  day: WorkingDay;
  suggestions: PolicyShiftSuggestion[];
  constraints: ScheduleConstraint[];
  staffList: Staff[];
  workShifts: WorkShift[];
  wishByStaff: Map<string, StaffMonthlyShiftWish>;
  availability?: ScheduleAvailability;
  preferenceOf?: (staffId: string, day: WorkingDay) => DecodedWish;
};

function countStaffingGap(
  schedule: MonthlyStaffSchedule,
  workShifts: WorkShift[]
): number {
  let gap = 0;
  for (const day of schedule.workingDays()) {
    const assignedByShift = schedule.countWorkingByShift(day);
    for (const shift of workShifts) {
      const required = schedule.requiredStaffing.requiredFor(day, shift.name);
      gap += Math.max(0, required - (assignedByShift.get(shift.id) ?? 0));
    }
  }
  return gap;
}

function countSatisfiedWishes(
  schedule: MonthlyStaffSchedule,
  staffList: Staff[],
  preferenceOf?: (staffId: string, day: WorkingDay) => DecodedWish
): number {
  if (!preferenceOf) return 0;
  let count = 0;
  for (const staff of staffList) {
    for (const day of schedule.workingDays()) {
      const preference = preferenceOf(staff.id, day);
      if (preference.kind === "neutral" || preference.kind === "ambiguous") continue;
      if (shiftCellsEqual(schedule.statusOf(staff.id, day), preference)) count++;
    }
  }
  return count;
}

function metricsOf(
  schedule: MonthlyStaffSchedule,
  base: MonthlyStaffSchedule,
  args: BuildScheduleForecastsArgs
): ScheduleForecastMetrics {
  const violations = schedule.checkConstraints(args.constraints);
  const delta = computeConstraintDelta(
    base.checkConstraints(args.constraints),
    violations
  );
  return {
    violationCount: violations.length,
    concessionCount: delta.concessions.length,
    staffingGap: countStaffingGap(schedule, args.workShifts),
    undecidedCount: schedule.state.assignments.filter((a) => a.isUndecided).length,
    wishSatisfiedCount: countSatisfiedWishes(
      schedule,
      args.staffList,
      args.preferenceOf
    ),
  };
}

function riskOf(
  before: ScheduleForecastMetrics,
  projected: ScheduleForecastMetrics
): ScheduleForecastRisk {
  if (projected.undecidedCount === 0 && projected.violationCount > 0) return "dead-end";
  if (
    projected.violationCount > before.violationCount ||
    projected.staffingGap > before.staffingGap
  ) {
    return "risky";
  }
  if (projected.concessionCount > 0) return "concession";
  return "safe";
}

function reasonsOf(
  intent: ScheduleForecastIntent,
  before: ScheduleForecastMetrics,
  projected: ScheduleForecastMetrics,
  suggestion: PolicyShiftSuggestion
): string[] {
  const reasons = [...suggestion.reasons];
  const gapDelta = before.staffingGap - projected.staffingGap;
  const undecidedDelta = before.undecidedCount - projected.undecidedCount;
  if (gapDelta > 0) reasons.push(`必要人数の不足を${gapDelta}人分減らす見通し`);
  if (undecidedDelta > 0) reasons.push(`未定を${undecidedDelta}件進める見通し`);
  if (projected.violationCount === 0) reasons.push("予測範囲では制約違反なし");
  if (intent === "constraint-safe") reasons.unshift("制約の安全性を優先");
  if (intent === "wish-first") reasons.unshift("本人の希望を優先");
  if (intent === "demand-first") reasons.unshift("必要人数の充足を優先");
  return [...new Set(reasons)].slice(0, 5);
}

/**
 * 各セル候補を一度適用し、既存の自動ステップを短いロールアウトとして順に実行する。
 * その結果から「制約安全・希望優先・需要優先」の意味を持つ最大3枝を選ぶ。
 */
export function buildScheduleForecasts(
  args: BuildScheduleForecastsArgs
): BuiltScheduleForecast[] {
  const before = metricsOf(args.schedule, args.schedule, args);
  const evaluated = args.suggestions
    .filter((s) => s.cell.kind !== "undecided")
    .slice(0, MAX_FORECAST_CANDIDATES)
    .map((suggestion) => {
      const decisionSchedule = args.schedule.setCell(
        args.staffId,
        args.day,
        suggestion.cell
      );
      let projectedSchedule = decisionSchedule;
      for (const step of AUTO_SHIFT_STEPS) {
        projectedSchedule = runAutoShiftStep(step, {
          schedule: projectedSchedule,
          staffList: args.staffList,
          workShifts: args.workShifts,
          wishByStaff: args.wishByStaff,
          availability: args.availability,
        }).schedule;
      }
      return {
        suggestion,
        decisionSchedule,
        projectedSchedule,
        afterDecision: metricsOf(decisionSchedule, args.schedule, args),
        projected: metricsOf(projectedSchedule, args.schedule, args),
      };
    });

  const selectors: Array<{
    intent: ScheduleForecastIntent;
    score: (item: (typeof evaluated)[number]) => number;
  }> = [
    {
      intent: "constraint-safe",
      score: (x) =>
        -x.projected.violationCount * 100 -
        x.projected.concessionCount * 40 -
        x.projected.staffingGap * 5 +
        x.suggestion.score,
    },
    {
      intent: "wish-first",
      score: (x) =>
        x.projected.wishSatisfiedCount * 20 -
        x.projected.violationCount * 20 +
        (x.suggestion.reasons.some((r) => r.includes("希望")) ? 50 : 0),
    },
    {
      intent: "demand-first",
      score: (x) =>
        -x.projected.staffingGap * 50 -
        x.projected.violationCount * 10 +
        (x.suggestion.reasons.some((r) => r.includes("不足")) ? 30 : 0),
    },
  ];

  const used = new Set<string>();
  const selected: Array<{
    intent: ScheduleForecastIntent;
    item: (typeof evaluated)[number];
  }> = [];
  for (const selector of selectors) {
    const item = [...evaluated]
      .filter((x) => !used.has(x.suggestion.id))
      .sort((a, b) => selector.score(b) - selector.score(a))[0];
    if (!item) continue;
    used.add(item.suggestion.id);
    selected.push({ intent: selector.intent, item });
  }

  const cacheKey = ScheduleForecast.cacheKey({
    scheduleId: args.schedule.state.id,
    baseNodeId: args.baseNodeId,
    staffId: args.staffId,
    dayKey: args.day.key,
    version: SCHEDULE_FORECAST_VERSION,
  });

  return selected.map(({ intent, item }) => ({
    decisionSchedule: item.decisionSchedule,
    projectedSchedule: item.projectedSchedule,
    forecast: new ScheduleForecast({
      id: `${cacheKey}:${intent}`,
      version: SCHEDULE_FORECAST_VERSION,
      scheduleId: args.schedule.state.id,
      baseNodeId: args.baseNodeId,
      staffId: args.staffId,
      dayKey: args.day.key,
      intent,
      decision: item.suggestion.cell,
      before,
      afterDecision: item.afterDecision,
      projected: item.projected,
      risk: riskOf(before, item.projected),
      reasons: reasonsOf(intent, before, item.projected, item.suggestion),
    }),
  }));
}
