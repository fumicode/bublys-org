/**
 * MinMonthlyDayOffConstraint — 月の最低休日数制約
 *
 * 「各スタッフは月に最低 N 日は休む」という制約。休みが N 日未満のスタッフごとに違反を1件返す。
 * 特定の稼働日ではなく「その月ぜんたい」の話なので、違反はスタッフ単位（days は空）で表す。
 */
import { MonthlyStaffSchedule } from "./MonthlyStaffSchedule.js";
import { ConstraintViolation } from "./ConstraintViolation.js";
import type { ScheduleConstraint } from "./ScheduleConstraint.js";

export const MIN_MONTHLY_DAY_OFF_CONSTRAINT = "min-monthly-day-off";

export class MinMonthlyDayOffConstraint implements ScheduleConstraint {
  readonly type = MIN_MONTHLY_DAY_OFF_CONSTRAINT;
  readonly label = "休日";

  /** @param minDays 月の最低休日数（既定 8） */
  constructor(readonly minDays: number = 8) {}

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
      if (off < this.minDays) {
        violations.push(
          new ConstraintViolation({
            constraintType: this.type,
            staffId,
            days: [], // 月単位（特定日ではない）
            message: `休みが月${off}日（最低${this.minDays}日必要）`,
          })
        );
      }
    }
    return violations;
  }
}
