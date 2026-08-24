/**
 * MinMonthlyDayOffConstraint — 月の最低休日数制約
 *
 * 「各スタッフは月に最低 N 日は休む」という制約。
 * 特定の稼働日ではなく「その月ぜんたい」の話なので、違反はスタッフ単位（days は空）で表す。
 *
 * 判定は「今すでに N 日に届いているか」ではなく「残りの未定日を全部休みにしても
 * もう届かない（＝達成不可能）か」で行う。月の途中はまだ休みを入れる余地があるので、
 * 単に「今はまだ N 日未満」というだけでは違反にしない（伝播・候補絞り込みが、月初のように
 * ほぼ未定な状態を毎回「矛盾」と誤検知しないようにするため）。
 */
import { MonthlyStaffSchedule } from "./MonthlyStaffSchedule.js";
import { ConstraintViolation } from "./ConstraintViolation.js";
import type { ScheduleConstraint } from "./ScheduleConstraint.js";

export const MIN_MONTHLY_DAY_OFF_CONSTRAINT = "min-monthly-day-off";

export class MinMonthlyDayOffConstraint implements ScheduleConstraint {
  readonly type = MIN_MONTHLY_DAY_OFF_CONSTRAINT;
  readonly label = "休日";
  /** 対象スタッフの月間休み日数だけを見る（他スタッフには影響しない） */
  readonly scope = "staff" as const;

  /** @param minDays 月の最低休日数（既定 8） */
  constructor(readonly minDays = 8) {}

  describe(): string {
    return `月に${this.minDays}日以上休む`;
  }

  check(schedule: MonthlyStaffSchedule): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    const days = schedule.workingDays();
    const staffIds = [...new Set(schedule.assignments.map((a) => a.staffId))];
    for (const staffId of staffIds) {
      const off = days.filter(
        (d) => schedule.statusOf(staffId, d).kind === "day-off"
      ).length;
      const undecided = days.filter(
        (d) => schedule.statusOf(staffId, d).kind === "undecided"
      ).length;
      // 残りの未定日を全部休みにしても最低日数に届かないときだけ違反にする（達成不可能判定）。
      if (off + undecided < this.minDays) {
        violations.push(
          new ConstraintViolation({
            constraintType: this.type,
            staffId,
            days: [], // 月単位（特定日ではない）
            message: `休みが月${off}日（最低${this.minDays}日必要、残り${undecided}日では届きません）`,
          })
        );
      }
    }
    return violations;
  }
}
