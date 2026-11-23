/**
 * シフト希望の一覧づくり（勤務表・スタッフ・希望 の3つから表示用の行を組む）。
 *
 * 「希望を出す期」は **勤務表がある期**、というルール1つで決まる（＝作成者がシフトを
 * 組もうとしている期。期を別途「募集中」と登録するしくみは作らない）。暦月の期も4週の期も同じ。
 * この導出は期の一覧・期ごとの一覧・スタッフ詳細の3画面で要るので、純粋関数としてここに1箇所だけ置く。
 *
 * 表示語彙（状態・ラベル）は ui/shiftWishStatus が持つ。ここはその語彙で行を組むだけ。
 */
import {
  StaffMonthlyShiftWish,
  type MonthlyStaffSchedule,
  type SchedulePeriod,
  type Staff,
} from "@bublys-org/hotel-shift-puzzle-model";
import {
  shiftWishStatusOf,
  type ShiftWishPeriodProgress,
  type ShiftWishPeriodSummary,
  type ShiftWishStaffRow,
} from "../ui/shiftWishStatus.js";

/**
 * 勤務表がある期（重複除去・古い順）。同じ期の勤務表が複数あっても1つに畳む。
 * 暦月の期の勤務表も4週の期の勤務表も、その期が希望を出す期になる。
 */
export const periodsWithSchedule = (
  schedules: readonly MonthlyStaffSchedule[]
): SchedulePeriod[] => {
  const byKey = new Map<string, SchedulePeriod>();
  for (const s of schedules) {
    if (!byKey.has(s.period.key)) byKey.set(s.period.key, s.period);
  }
  return [...byKey.values()].sort(
    (a, b) => a.start.compareTo(b.start) || a.key.localeCompare(b.key)
  );
};

/**
 * その期の希望を staffId で引ける Map にする（他の期は混ざらない）。
 * 勤務表が希望を引くのはここ1箇所。希望が受け持つ期（{@link StaffMonthlyShiftWish.period}）と
 * 勤務表の期が同じものだけを引く。
 */
export const wishesOfPeriod = (
  wishes: readonly StaffMonthlyShiftWish[],
  period: SchedulePeriod
): Map<string, StaffMonthlyShiftWish> =>
  new Map(wishes.filter((w) => w.period.equals(period)).map((w) => [w.staffId, w]));

/** 期の一覧の行：勤務表がある期ごとに、全スタッフぶんの回収の進み具合を数える */
export const periodProgressList = (
  schedules: readonly MonthlyStaffSchedule[],
  wishes: readonly StaffMonthlyShiftWish[],
  staffCount: number
): ShiftWishPeriodProgress[] =>
  periodsWithSchedule(schedules).map((period) => {
    const ofPeriod = [...wishesOfPeriod(wishes, period).values()];
    const statuses = ofPeriod.map((w) => shiftWishStatusOf(w));
    return {
      period,
      collectedCount: statuses.filter((s) => s === "collected").length,
      startedCount: statuses.filter((s) => s !== "empty").length,
      staffCount,
    };
  });

/** スタッフ詳細の行：その人が、勤務表がある期それぞれでどこまで進んでいるか */
export const periodSummariesOf = (
  schedules: readonly MonthlyStaffSchedule[],
  wishes: readonly StaffMonthlyShiftWish[],
  staffId: string
): ShiftWishPeriodSummary[] => {
  const byId = new Map(wishes.map((w) => [w.id, w]));
  return periodsWithSchedule(schedules).map((period) => {
    const wish = byId.get(StaffMonthlyShiftWish.idOf(staffId, period));
    return {
      period,
      status: shiftWishStatusOf(wish),
      filledDays: wish?.filledDayCount ?? 0,
      collectedAt: wish?.submittedAt ?? null,
    };
  });
};

/** 期ごとの一覧の行：その期の、スタッフ全員ぶん（希望がまだ無い人も「未入力」で並ぶ） */
export const staffWishRows = (
  staffList: readonly Staff[],
  wishes: readonly StaffMonthlyShiftWish[],
  period: SchedulePeriod
): ShiftWishStaffRow[] => {
  const byStaff = wishesOfPeriod(wishes, period);
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
