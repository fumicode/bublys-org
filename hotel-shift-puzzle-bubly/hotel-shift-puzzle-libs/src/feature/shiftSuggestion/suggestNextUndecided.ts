import type { MonthlyStaffSchedule, WorkingDay } from "@bublys-org/hotel-shift-puzzle-model";

/**
 * staffList 順 × 稼働日順で未定セルを探す。
 * `after` を渡すとそのセルより後ろだけを見る（回り込まない）。
 * 渡さなければ先頭の未定セルを返す。
 */
export function suggestNextUndecided(
  schedule: MonthlyStaffSchedule,
  staffIds: string[],
  after?: { staffId: string; day: WorkingDay }
): { staffId: string; day: WorkingDay } | null {
  let seenAfter = !after;
  for (const staffId of staffIds) {
    for (const day of schedule.workingDays()) {
      if (!seenAfter) {
        if (after && staffId === after.staffId && day.equals(after.day)) {
          seenAfter = true;
        }
        continue;
      }
      if (schedule.isUndecided(staffId, day)) {
        return { staffId, day };
      }
    }
  }
  return null;
}
