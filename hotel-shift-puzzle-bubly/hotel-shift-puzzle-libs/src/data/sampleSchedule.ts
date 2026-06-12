import { MonthlyStaffSchedule, WorkingDay } from "@bublys-org/hotel-shift-puzzle-model";
import { createSampleStaffList } from "./sampleStaff.js";
import { createSampleWorkShifts } from "./sampleWorkShifts.js";

/**
 * サンプルの月間スタッフ勤務表を生成する。
 * 2026年6月・store-1。早番/中番/遅番/休み/未定 を散りばめる。
 * 前半14日に割当を入れ、後半は未割当（=未定）のまま残す。
 *
 * 勤務帯（WorkShift）は独立集約なので、ここでは ID だけ参照する。
 */
export function createSampleSchedule(): MonthlyStaffSchedule {
  const workShiftIds = createSampleWorkShifts().map((w) => w.id); // ['early','middle','late']

  let schedule = MonthlyStaffSchedule.create({
    id: "sched-2026-06",
    storeId: "store-1",
    year: 2026,
    month: 6,
    workShiftIds,
  });

  const staffIds = createSampleStaffList().map((s) => s.id);

  // 早番・中番・遅番・休み・未定 を順に巡回させ、スタッフごとにずらして散りばめる
  const cycle = ["early", "middle", "late", "day-off", "undecided"] as const;

  for (let d = 1; d <= 14; d++) {
    const day = WorkingDay.of(2026, 6, d);
    staffIds.forEach((staffId, i) => {
      const token = cycle[(d + i) % cycle.length];
      if (token === "undecided") {
        schedule = schedule.markUndecided(staffId, day);
      } else if (token === "day-off") {
        schedule = schedule.assignDayOff(staffId, day);
      } else {
        schedule = schedule.assignShift(staffId, day, token);
      }
    });
  }

  return schedule;
}
