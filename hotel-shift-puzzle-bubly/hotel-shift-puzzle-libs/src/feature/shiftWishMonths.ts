/**
 * シフト希望の一覧づくり（勤務表・勤務スタッフ群・スタッフ・希望 から表示用の行を組む）。
 *
 * 「希望を出す月」は **勤務表がある月**、というルール1つで決まる（＝作成者がシフトを
 * 組もうとしている月。月を別途「募集中」と登録するしくみは作らない）。この導出は
 * 月一覧・月別一覧・スタッフ詳細の3画面で要るので、純粋関数としてここに1箇所だけ置く。
 *
 * **希望を集める相手は名簿ではなく勤務スタッフ群が決める**（#159）。勤務表の行と
 * 同じ出所にしないと、勤務表から外した人を追いかけ続け、勤務表で足した臨時の人には
 * 聞きそこねる。顔ぶれの導出は {@link workingStaffOfMonth} 1箇所に置く。
 *
 * 表示語彙（状態・ラベル）は ui/shiftWishStatus が持つ。ここはその語彙で行を組むだけ。
 */
import {
  StaffMonthlyShiftWish,
  type MonthlyStaffSchedule,
  type Staff,
  type WorkingStaffGroup,
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

/**
 * その月に働く人たち（＝その月の希望を集める相手）。勤務表の行と同じ顔ぶれ・同じ順。
 *
 * 顔ぶれを決めるのは名簿ではなく**勤務スタッフ群**。だから勤務表から外した人は落ち、
 * 勤務表で足した臨時の人（実体を群のメンバーが抱えている）はちゃんと出る。
 *
 * **同じ月に勤務表が複数あれば和集合**にする。希望は人と月に1つ
 * （`StaffMonthlyShiftWish.idOf`）なので、勤務表ごとに別々に集めることはない。
 * 順は「最初の勤務表の群の順 → その勤務表に居ない人を、次の勤務表の順で」。
 *
 * 群をまだ持たない勤務表（この集約より前に作られたもの）は名簿全員が対象になる。
 * 勤務表の行の振る舞い（`feature/workingStaff.ts`）と**揃えてある**：片方だけ
 * 名簿に落ちると、見比べたときに行数が合わない。
 *
 * ★ 読む側は `ScheduleWorld` の外（希望一覧は世界をまたぐ問い合わせ）なので、群は
 *   APP スコープの最新値として渡ってくる。つまり勤務表の世界線を過去へ戻していても
 *   顔ぶれは常に最新。「いま誰から実際に希望を集めるか」は現実の話なので、これで正しい。
 */
export const workingStaffOfMonth = (
  schedules: MonthlyStaffSchedule[],
  groups: WorkingStaffGroup[],
  roster: Staff[],
  year: number,
  month: number
): Staff[] => {
  const groupById = new Map(groups.map((g) => [g.id, g]));
  const seen = new Set<string>();
  const rows: Staff[] = [];
  for (const schedule of schedules) {
    if (schedule.year !== year || schedule.month !== month) continue;
    const group = groupById.get(schedule.workingStaffGroupId);
    for (const staff of group ? group.resolve(roster) : roster) {
      if (seen.has(staff.id)) continue;
      seen.add(staff.id);
      rows.push(staff);
    }
  }
  return rows;
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

/**
 * 月一覧の行：勤務表がある月ごとに、回収の進み具合を数える。
 *
 * **分母はその月に働く人**（{@link workingStaffOfMonth}）。名簿全員で数えると、
 * 月別一覧が出す行数（＝働く人）と「◯人中」が食い違う。
 * 働く人でない人の希望は、残っていても数に入れない（外した人の回収済みで埋まらない）。
 */
export const monthProgressList = (
  schedules: MonthlyStaffSchedule[],
  groups: WorkingStaffGroup[],
  roster: Staff[],
  wishes: StaffMonthlyShiftWish[]
): ShiftWishMonthProgress[] =>
  monthsWithSchedule(schedules).map(({ year, month }) => {
    const working = workingStaffOfMonth(schedules, groups, roster, year, month);
    const byStaff = wishesOfMonth(wishes, year, month);
    const statuses = working.map((s) => shiftWishStatusOf(byStaff.get(s.id)));
    return {
      year,
      month,
      collectedCount: statuses.filter((s) => s === "collected").length,
      startedCount: statuses.filter((s) => s !== "empty").length,
      staffCount: working.length,
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

/**
 * 月別一覧の行：その月に働く人ぶん（希望がまだ無い人も「未入力」で並ぶ）。
 *
 * 渡す `staffList` は {@link workingStaffOfMonth} が決めた顔ぶれ。名簿を渡してはいけない
 * （勤務表から外した人を追いかけ続け、臨時の人が出ない）。
 */
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
