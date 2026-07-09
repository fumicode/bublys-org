/**
 * MaxDayOffPerDayConstraint — 1日に休んでよい人数の上限制約
 *
 * 「同じ日に休めるのは最大 N 人まで」という制約。上限を超えた稼働日ごとに違反を1件返す。
 * スタッフではなくその日（列）の話なので、違反は日単位（staffId なし）で表す。
 */
import { MonthlyStaffSchedule } from "./MonthlyStaffSchedule.js";
import { ConstraintViolation } from "./ConstraintViolation.js";
import type { ScheduleConstraint } from "./ScheduleConstraint.js";

export const MAX_DAY_OFF_PER_DAY_CONSTRAINT = "max-day-off-per-day";

export class MaxDayOffPerDayConstraint implements ScheduleConstraint {
  readonly type = MAX_DAY_OFF_PER_DAY_CONSTRAINT;
  readonly label = "休み上限";

  /** @param maxPerDay 1日に休んでよい人数の上限（既定 8） */
  constructor(readonly maxPerDay: number = 8) {}

  describe(): string {
    return `1日に休めるのは${this.maxPerDay}人まで`;
  }

  check(schedule: MonthlyStaffSchedule): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    for (const day of schedule.workingDays()) {
      const n = schedule.countDayOffOn(day);
      if (n > this.maxPerDay) {
        violations.push(
          new ConstraintViolation({
            constraintType: this.type,
            staffId: undefined, // 日単位（その日に休みが多すぎる）
            days: [day],
            message: `休みが${n}人（上限${this.maxPerDay}人）`,
          })
        );
      }
    }
    return violations;
  }
}
