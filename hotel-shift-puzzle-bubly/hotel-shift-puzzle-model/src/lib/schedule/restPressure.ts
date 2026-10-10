/**
 * restPressure — その人をその日出勤にしたら、休みの形がどれだけ崩れるか
 *
 * 責任者のように「誰かが出勤しなければならない枠」を、複数の候補から選ぶときに使う。
 * ルールは「**その日を出勤にしても休みの形が崩れにくい人から選ぶ**」。休みを置く段は
 * 先に確定した出勤の隙間にしか休みを入れられないので、出勤を確定させる側が休みの形を
 * 知らないと、休みの段が連休を作れなかったり、分散型の人に連休を作らされたりする。
 *
 * 比べる順（小さい方が崩れにくい。辞書順で比べる）:
 *   1. budget   … その日を出勤にすると、月の最低休日数を置く日が足りなくなるか
 *   2. overRun  … 休めない日の連続が、その人の続けてよい日数を超えるか
 *   3. pairSlot … 連休型の人で、単発の休みの隣（＝連休の相方になる日）を取ってしまうか
 *   4. streak   … 休めない日の連続の長さ（短いほど、休みを置く余地が残る）
 *
 * 「休めない日」は、出勤が入っている日と、未定でも出勤の希望がある日。未定の日をすべて
 * 休めると数えると、出勤の希望で埋まった週の人を「まだ余裕がある」と見誤り、休みを置く
 * 日が1日も残らない6連勤を作る。逆に未定をすべて出勤と数えると全員が同じ長さになり、
 * 比べる意味が無くなる。前月の確定版の末尾とはひと続きで数える。
 *
 * 純粋。
 */
import type { MonthlyStaffSchedule } from "./MonthlyStaffSchedule.js";
import type { WorkingDay } from "./WorkingDay.js";
import type { AutoShiftContext } from "./autoShiftStep.js";
import { DayOffStyle } from "../staff/DayOffStyle.js";

export type RestPressure = {
  budget: number;
  overRun: number;
  pairSlot: number;
  streak: number;
};

/** その人をその日出勤にしたときの、休みの形の崩れ方 */
export function restPressureOf(
  schedule: MonthlyStaffSchedule,
  ctx: Pick<
    AutoShiftContext,
    "dayOffStyleOf" | "maxConsecutiveWorkdays" | "minDayOff" | "preferenceOf"
  >,
  staffId: string,
  day: WorkingDay
): RestPressure {
  const days = schedule.workingDays();
  const idx = days.findIndex((d) => d.equals(day));
  const style = ctx.dayOffStyleOf?.(staffId) ?? DayOffStyle.DEFAULT;
  const limit = style.runLimitWithin(ctx.maxConsecutiveWorkdays ?? Infinity);
  const tail = schedule.precedingTail;

  const offAt = (j: number): boolean => {
    if (j >= days.length) return false;
    if (j >= 0) return schedule.isDayOff(staffId, days[j]);
    const tailDay = tail?.days[tail.days.length + j];
    return tailDay !== undefined && tail?.cellOf(staffId, tailDay)?.value.kind === "day-off";
  };

  // 休めない日：出勤が入っている日か、未定でも出勤の希望がある日
  const cannotRest = (d: WorkingDay): boolean =>
    schedule.isWorking(staffId, d) ||
    (schedule.isUndecided(staffId, d) && ctx.preferenceOf(staffId, d).kind === "work");

  // 休めない日の連続（この日を含む）。月初まで続けば前月末からの出勤を足す
  let before = 0;
  for (let j = idx - 1; j >= 0 && cannotRest(days[j]); j--) before++;
  if (before === idx) before += tail?.trailingWorkdays(staffId) ?? 0;
  let after = 0;
  for (let j = idx + 1; j < days.length && cannotRest(days[j]); j++) after++;
  const streak = before + 1 + after;

  // 休みを置ける日が足りるか：この日を出勤にした後の未定の日数で、足りない休みを賄えるか
  let budget = 0;
  if (ctx.minDayOff !== undefined) {
    const missing = ctx.minDayOff - schedule.countDayOffForStaff(staffId);
    // 休みを置ける未定の日（出勤の希望がある日は数えない）
    const undecidedAfter =
      days.filter((d) => schedule.isUndecided(staffId, d) && !cannotRest(d)).length - 1;
    if (missing > undecidedAfter) budget = 1;
  }

  // 連休型：単発の休み（その先は休みでない）の隣は、連休の相方にとっておく
  const singleOffAt = (j: number, away: number): boolean => offAt(j) && !offAt(j + away);
  const pairSlot =
    style.isClustered && (singleOffAt(idx - 1, -1) || singleOffAt(idx + 1, +1)) ? 1 : 0;

  return { budget, overRun: streak > limit ? 1 : 0, pairSlot, streak };
}

/** 崩れにくい順に並べるための比較（a の方が崩れにくければ負） */
export function compareRestPressure(a: RestPressure, b: RestPressure): number {
  return (
    a.budget - b.budget ||
    a.overRun - b.overRun ||
    a.pairSlot - b.pairSlot ||
    a.streak - b.streak
  );
}
