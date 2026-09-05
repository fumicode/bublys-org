/**
 * ShiftLeaderConstraint — 責任者ルールを「違反を出す制約」として扱うアダプタ
 *
 * 宣言的な ShiftLeaderRule（「担当勤務帯に最低 minCount 人」）を、他の制約（連勤上限など）と
 * 同じ ScheduleConstraint インターフェースに載せる。check は「担当勤務帯に minCount 未満の
 * 稼働日」を日単位の違反（staffId なし）として返す。これで責任者の未充足も、連勤違反などと
 * 同じ違反パイプラインで表に警告表示できる。
 *
 * 勤務帯の解決（shiftName → 勤務帯ID集合）は勤務表側の事情なので、呼び出し側が解決して渡す。
 */
import { MonthlyStaffSchedule } from "./MonthlyStaffSchedule.js";
import { ConstraintViolation } from "./ConstraintViolation.js";
import { ShiftLeaderRule } from "./ShiftLeaderRule.js";
import type { ScheduleConstraint } from "./ScheduleConstraint.js";

/** 制約種別の接頭辞。ロールキーを付けて "shift-leader:early" のように一意にする。 */
export const SHIFT_LEADER_CONSTRAINT = "shift-leader";

export class ShiftLeaderConstraint implements ScheduleConstraint {
  readonly type: string;
  readonly label: string;

  /**
   * @param rule     解決済みの責任者ルール（leaderStaffIds 入り）
   * @param shiftIds ルールの担当勤務帯（shiftName）に対応する勤務帯ID集合（呼び出し側で解決）
   */
  constructor(
    readonly rule: ShiftLeaderRule,
    readonly shiftIds: string[]
  ) {
    this.type = `${SHIFT_LEADER_CONSTRAINT}:${rule.key}`;
    this.label = rule.label;
  }

  /** 対象日の責任者ロースターだけを見る（他日には影響しない） */
  readonly scope = "day" as const;

  describe(): string {
    const who =
      this.rule.minCount <= 1 ? "誰か一人" : `最低${this.rule.minCount}人`;
    return `${this.rule.shiftName}に${who}（${this.rule.label}）`;
  }

  check(schedule: MonthlyStaffSchedule): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    for (const day of schedule.workingDays()) {
      const count = this.rule.countOnShift(schedule, day, this.shiftIds);
      if (count < this.rule.minCount) {
        violations.push(
          new ConstraintViolation({
            constraintType: this.type,
            // スタッフに紐づかない「その日に責任者が不在」＝日単位の違反
            staffId: undefined,
            days: [day],
            message:
              this.rule.minCount <= 1
                ? `${this.rule.label}が${this.rule.shiftName}に不在`
                : `${this.rule.label}が${this.rule.shiftName}に不足（${count}/${this.rule.minCount}人）`,
          })
        );
      }
    }
    return violations;
  }
}
