import {
  MonthlyStaffSchedule,
  RequiredStaffing,
  WorkingDay,
} from "@bublys-org/hotel-shift-puzzle-model";

/**
 * 需要の波（必要スタッフ数）を曜日で表す。
 * 宿泊は土日に多いので、週末ほど人数が必要というイメージ。
 * 9人規模に対して 1日 5〜7 人が出勤し、2〜4 人が休む配分。
 * 週末は7人＝2人しか休めないので、責任者の割り振りに逃げ場が無くなる（制約が効く）。
 *   - 平日(月〜木) : 早番2 中番2 遅番1（計5）
 *   - 金          : 早番3 中番2 遅番2（計7・週末入り）
 *   - 土日        : 早番3 中番2 遅番2（計7・繁忙）
 */
export function sampleDemandFor(weekday: number): Record<string, number> {
  if (weekday === 0 || weekday === 6) return { 早番: 3, 中番: 2, 遅番: 2 }; // 日・土
  if (weekday === 5) return { 早番: 3, 中番: 2, 遅番: 2 }; // 金
  return { 早番: 2, 中番: 2, 遅番: 1 }; // 平日
}

const demandFor = sampleDemandFor;

/**
 * 曜日の波では表せない、日ごとの必要人数の個別調整。
 * 稼働日キー("2026-07-05") → 勤務帯名 → 必要人数。曜日の既定値に上書きする
 * （書いた勤務帯だけ差し替え、書かない勤務帯は曜日の既定値のまま）。
 */
const DEMAND_OVERRIDES: Record<string, Record<string, number>> = {
  "2026-07-05": { 早番: 2, 遅番: 1 }, // 日
  "2026-07-10": { 遅番: 1 }, // 金
  "2026-07-11": { 早番: 2 }, // 土
  "2026-07-12": { 早番: 2 }, // 日
  "2026-07-18": { 早番: 2, 遅番: 1 }, // 土
  "2026-07-19": { 早番: 2 }, // 日
};

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
  // 各稼働日に、その曜日の需要を設定する（土日多め）。日ごとの個別調整があれば上書きする。
  const lastDay = new Date(year, month, 0).getDate();
  let requiredStaffing = RequiredStaffing.empty();
  for (let d = 1; d <= lastDay; d++) {
    const day = WorkingDay.of(year, month, d);
    const demand = { ...demandFor(day.weekday), ...(DEMAND_OVERRIDES[day.key] ?? {}) };
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
