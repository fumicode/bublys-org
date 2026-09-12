/**
 * シフト希望の一覧づくり（勤務表・スタッフ・希望 の3つから表示用の行を組む）。
 *
 * 「希望を出す月」は **勤務表がある月**、というルール1つで決まる（＝作成者がシフトを
 * 組もうとしている月。月を別途「募集中」と登録するしくみは作らない）。この導出は
 * 月一覧・月別一覧・スタッフ詳細の3画面で要るので、純粋関数としてここに1箇所だけ置く。
 *
 * 表示語彙（状態・ラベル）は ui/shiftWishStatus が持つ。ここはその語彙で行を組むだけ。
 */
import {
  StaffMonthlyShiftWish,
  type MonthlyStaffSchedule,
  type Staff,
} from "@bublys-org/hotel-shift-puzzle-model";
import {
  shiftWishStatusOf,
  type ShiftWishMonthProgress,
  type ShiftWishMonthSummary,
  type ShiftWishStaffRow,
} from "../ui/shiftWishStatus.js";

/** 年月（1-12） */
export type ShiftWishMonth = { year: number; month: number };

/** 勤務表がある年月（重複除去・古い順）。同じ月の勤務表が複数あっても1つに畳む。 */
export const monthsWithSchedule = (
  schedules: MonthlyStaffSchedule[]
): ShiftWishMonth[] => {
  const seen = new Set<string>();
  return schedules
    .map((s) => ({ year: s.year, month: s.month }))
    .filter(({ year, month }) => {
      const key = `${year}-${month}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.year - b.year || a.month - b.month);
};

/** その月の希望を staffId で引ける Map にする（他の月は混ざらない） */
export const wishesOfMonth = (
  wishes: StaffMonthlyShiftWish[],
  year: number,
  month: number
): Map<string, StaffMonthlyShiftWish> =>
  new Map(
    wishes
      .filter((w) => w.year === year && w.month === month)
      .map((w) => [w.staffId, w])
  );

/** 月一覧の行：勤務表がある月ごとに、全スタッフぶんの回収の進み具合を数える */
export const monthProgressList = (
  schedules: MonthlyStaffSchedule[],
  wishes: StaffMonthlyShiftWish[],
  staffCount: number
): ShiftWishMonthProgress[] =>
  monthsWithSchedule(schedules).map(({ year, month }) => {
    const ofMonth = [...wishesOfMonth(wishes, year, month).values()];
    const statuses = ofMonth.map((w) => shiftWishStatusOf(w));
    return {
      year,
      month,
      collectedCount: statuses.filter((s) => s === "collected").length,
      startedCount: statuses.filter((s) => s !== "empty").length,
      staffCount,
    };
  });

/** スタッフ詳細の行：その人が、勤務表がある月それぞれでどこまで進んでいるか */
export const monthSummariesOf = (
  schedules: MonthlyStaffSchedule[],
  wishes: StaffMonthlyShiftWish[],
  staffId: string
): ShiftWishMonthSummary[] => {
  const byId = new Map(wishes.map((w) => [w.id, w]));
  return monthsWithSchedule(schedules).map(({ year, month }) => {
    const wish = byId.get(StaffMonthlyShiftWish.idOf(staffId, year, month));
    return {
      year,
      month,
      status: shiftWishStatusOf(wish),
      filledDays: wish?.filledDayCount ?? 0,
      collectedAt: wish?.submittedAt ?? null,
    };
  });
};

/** 月別一覧の行：その月の、スタッフ全員ぶん（希望がまだ無い人も「未入力」で並ぶ） */
export const staffWishRows = (
  staffList: Staff[],
  wishes: StaffMonthlyShiftWish[],
  year: number,
  month: number
): ShiftWishStaffRow[] => {
  const byStaff = wishesOfMonth(wishes, year, month);
  return staffList.map((staff) => {
    const wish = byStaff.get(staff.id);
    return {
      staff,
      status: shiftWishStatusOf(wish),
      filledDays: wish?.filledDayCount ?? 0,
      collectedAt: wish?.submittedAt ?? null,
    };
  });
};
