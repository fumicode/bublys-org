/**
 * RequiredStaffingConstraint — 必要人数制約
 *
 * 稼働日・勤務帯ごとに設定された必要人数（RequiredStaffing）を満たしているかを見る。
 * ShiftLeaderConstraint / MaxDayOffPerDayConstraint と同じ「日単位・即時」の判定
 * （まだ埋まっていなければその場で違反にする。月内でまだ達成可能かどうかの猶予は見ない）。
 *
 * 同じ日に複数の勤務帯が同時に不足していても、violation は日1件に集約する。
 * ConstraintViolation.key は type:staffId:day までしか含まないため、勤務帯ごとに
 * 別violationを積むと同じキーで衝突し computeConstraintDelta が片方を握りつぶしてしまう。
 */
import { MonthlyStaffSchedule } from "./MonthlyStaffSchedule.js";
import { ConstraintViolation } from "./ConstraintViolation.js";
import type { ScheduleConstraint } from "./ScheduleConstraint.js";

export const REQUIRED_STAFFING_CONSTRAINT = "required-staffing";

export class RequiredStaffingConstraint implements ScheduleConstraint {
  readonly type = REQUIRED_STAFFING_CONSTRAINT;
  readonly label = "必要人数";
  /** 対象日の必要人数と実際の出勤人数だけを見る（他日には影響しない） */
  readonly scope = "day" as const;

  /** @param shiftIdsOf 勤務帯名 → この勤務表で使う勤務帯ID群（同名複数IDを合算するため） */
  constructor(readonly shiftIdsOf: (shiftName: string) => string[]) {}

  describe(): string {
    return "各稼働日、勤務帯ごとに必要人数を満たす";
  }

  check(schedule: MonthlyStaffSchedule): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    for (const day of schedule.workingDays()) {
      const requiredOn = schedule.requiredStaffing.requiredOn(day);
      const counts = schedule.countWorkingByShift(day);
      const shortfalls: string[] = [];
      for (const [shiftName, required] of Object.entries(requiredOn)) {
        if (required <= 0) continue;
        const actual = this.shiftIdsOf(shiftName).reduce(
          (n, id) => n + (counts.get(id) ?? 0),
          0
        );
        if (actual < required) {
          shortfalls.push(`${shiftName}が不足（${actual}/${required}人）`);
        }
      }
      if (shortfalls.length > 0) {
        violations.push(
          new ConstraintViolation({
            constraintType: this.type,
            staffId: undefined, // 日単位（その日の必要人数が不足）
            days: [day],
            message: shortfalls.join("、"),
          })
        );
      }
    }
    return violations;
  }
}
