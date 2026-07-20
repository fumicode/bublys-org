import type { MonthlyStaffSchedule } from "@bublys-org/hotel-shift-puzzle-model";

/** 必要人数合計が平均を上回る稼働日キー（#88 と同じ定義） */
export function busyDayKeysOf(schedule: MonthlyStaffSchedule): Set<string> {
  const requiredByDay = schedule.workingDays().map((day) => ({
    dayKey: day.key,
    required: Object.values(schedule.requiredStaffing.requiredOn(day)).reduce(
      (sum, n) => sum + n,
      0
    ),
  }));
  const withRequirement = requiredByDay.filter((d) => d.required > 0);
  if (withRequirement.length === 0) return new Set();

  const average =
    withRequirement.reduce((sum, d) => sum + d.required, 0) / withRequirement.length;

  return new Set(
    withRequirement.filter((d) => d.required > average).map((d) => d.dayKey)
  );
}
