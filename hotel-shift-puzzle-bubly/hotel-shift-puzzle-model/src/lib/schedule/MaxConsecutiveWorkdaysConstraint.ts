/**
 * MaxConsecutiveWorkdaysConstraint — 連勤上限制約
 *
 * 「あるスタッフが連続して出勤していいのは N 日まで」という制約。
 * N 日を超える連勤（= N+1 連勤以上）があれば、その連勤の塊全体を違反範囲とする
 * ConstraintViolation を1件返す。
 *
 * 連勤の定義:
 *   - 勤務表の稼働日（1日〜末日）を暦順にたどり、「出勤（いずれかの勤務帯）」が
 *     続いている区間を1つの連勤とみなす。
 *   - 休み・未定はいずれも連勤を区切る（出勤していない日でリセット）。
 */
import { MonthlyStaffSchedule } from "./MonthlyStaffSchedule.js";
import { ConstraintViolation } from "./ConstraintViolation.js";
import { WorkingDay } from "./WorkingDay.js";
import type { ScheduleConstraint } from "./ScheduleConstraint.js";

export const MAX_CONSECUTIVE_WORKDAYS = "max-consecutive-workdays";

export class MaxConsecutiveWorkdaysConstraint implements ScheduleConstraint {
  readonly type = MAX_CONSECUTIVE_WORKDAYS;

  /** @param maxConsecutive 許容する連勤日数の上限（既定 5） */
  constructor(readonly maxConsecutive: number = 5) {}

  check(schedule: MonthlyStaffSchedule): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    const days = schedule.workingDays();
    const staffIds = [...new Set(schedule.assignments.map((a) => a.staffId))];

    for (const staffId of staffIds) {
      let run: WorkingDay[] = [];
      const flush = () => {
        if (run.length > this.maxConsecutive) {
          violations.push(this.toViolation(staffId, run));
        }
        run = [];
      };
      for (const day of days) {
        if (schedule.isWorking(staffId, day)) {
          run.push(day);
        } else {
          flush();
        }
      }
      flush();
    }

    return violations;
  }

  private toViolation(staffId: string, run: WorkingDay[]): ConstraintViolation {
    return new ConstraintViolation({
      constraintType: this.type,
      staffId,
      days: run,
      message: `${run.length}連勤（上限${this.maxConsecutive}連勤）`,
    });
  }
}
