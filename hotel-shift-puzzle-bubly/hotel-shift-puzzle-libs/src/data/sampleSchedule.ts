import {
  MonthlyStaffSchedule,
  RequiredStaffing,
  WorkingDay,
} from "@bublys-org/hotel-shift-puzzle-model";

/**
 * 需要の波（必要スタッフ数）を曜日で表す。
 * 宿泊は土日に多いので、週末ほど人数が必要というイメージ。
 * 16人規模に対して 1日 10〜12 人が出勤し、4〜6 人が休む配分（1日の休み上限が実際に効く）。
 *   - 平日(月〜木) : 早番4 中番3 遅番3（計10）
 *   - 金          : 早番4 中番4 遅番3（計11・週末入り）
 *   - 土日        : 早番5 中番4 遅番3（計12・繁忙）
 */
function demandFor(weekday: number): Record<string, number> {
  if (weekday === 0 || weekday === 6) return { 早番: 5, 中番: 4, 遅番: 3 }; // 日・土
  if (weekday === 5) return { 早番: 4, 中番: 4, 遅番: 3 }; // 金
  return { 早番: 4, 中番: 3, 遅番: 3 }; // 平日
}

/**
 * 指定した年月の、需要の波を持つ「空の」勤務表を生成する。
 * 割当は入れず（全セル未定）、自動シフト／手動で埋めていく前提のまっさらな状態。
 * 勤務帯（WorkShiftSet）は勤務表ごとの別集約（id=scheduleId）なので、勤務表自身は持たない。
 */
export function createSampleScheduleFor(
  year: number,
  month: number,
  id: string
): MonthlyStaffSchedule {
  // 各稼働日に、その曜日の需要を設定する（土日多め）
  const lastDay = new Date(year, month, 0).getDate();
  let requiredStaffing = RequiredStaffing.empty();
  for (let d = 1; d <= lastDay; d++) {
    const day = WorkingDay.of(year, month, d);
    const demand = demandFor(day.weekday);
    for (const [name, count] of Object.entries(demand)) {
      requiredStaffing = requiredStaffing.setRequired(day, name, count);
    }
  }

  return MonthlyStaffSchedule.create({
    id,
    storeId: "store-1",
    year,
    month,
    requiredStaffing,
  });
}

/** サンプルの勤務表（2026年6月・7月）。需要の波つき・割当は空。 */
export function createSampleSchedules(): MonthlyStaffSchedule[] {
  return [
    createSampleScheduleFor(2026, 6, "sched-2026-06"),
    createSampleScheduleFor(2026, 7, "sched-2026-07"),
  ];
}
