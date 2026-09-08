import type { MonthlyStaffSchedule, WorkingDay } from "@bublys-org/hotel-shift-puzzle-model";

/** staffList 順 × 稼働日順で最初の未定セルを返す */
export function suggestNextUndecided(
  schedule: MonthlyStaffSchedule,
  staffIds: string[]
): { staffId: string; day: WorkingDay } | null {
  for (const staffId of staffIds) {
    for (const day of schedule.workingDays()) {
      if (schedule.isUndecided(staffId, day)) {
        return { staffId, day };
      }
    }
  }
  return null;
}
