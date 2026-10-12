/**
 * AllowedShiftConstraint — 可能勤務帯（その人が入れる勤務帯）の外に入れたら違反にする
 *
 * ルールは1つ：**入れない勤務帯は、入れたら違反になる値**。
 * 値の範囲として候補から外すのではなく、選べるようにしたうえで違反として見せる
 * （可能勤務帯の外にも入れることがある、という現場の運用に合わせる）。
 *
 * 制約リストに入っているだけで、赤線・違反バブル・候補集合（入れると新しい違反が出る値として
 * 落ちる）・自動シフト（canPlace）・詰みの修復案（代償として出る）が揃って見る。
 *
 * 可能勤務帯は勤務スタッフ群のメンバーが持つ。絞っていない人と、群に居ない人は判定しない
 * （`WorkingStaffGroup.isAllowed` は群に居ない人に false を返すので、ここでは使わない）。
 */
import { MonthlyStaffSchedule } from "./MonthlyStaffSchedule.js";
import { ConstraintViolation } from "./ConstraintViolation.js";
import type { ScheduleConstraint } from "./ScheduleConstraint.js";
import type { WorkingStaffGroup } from "../staff/WorkingStaffGroup.js";

export const ALLOWED_SHIFT_CONSTRAINT = "allowed-shift";

export class AllowedShiftConstraint implements ScheduleConstraint {
  readonly type = ALLOWED_SHIFT_CONSTRAINT;
  readonly label = "可能勤務帯";
  /** 対象セル（そのスタッフ・その日）だけを見る（他のどのセルにも影響しない） */
  readonly scope = "cell" as const;

  /**
   * @param staffGroup 可能勤務帯を持つ勤務スタッフ群
   * @param shiftNameById 勤務帯ID → 勤務帯名（違反の文に使う。無ければIDのまま出す）
   */
  constructor(
    private readonly staffGroup: WorkingStaffGroup,
    private readonly shiftNameById: Map<string, string> = new Map()
  ) {}

  describe(): string {
    return "入れない勤務帯には入れない";
  }

  check(schedule: MonthlyStaffSchedule): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    for (const assignment of schedule.assignments) {
      const shiftId = assignment.shiftId;
      if (shiftId === undefined) continue; // 休み・未定は判定しない
      const allowed = this.staffGroup.allowedShiftIdsOf(assignment.staffId);
      if (!allowed || allowed.includes(shiftId)) continue;
      const shiftName = this.shiftNameById.get(shiftId) ?? shiftId;
      violations.push(
        new ConstraintViolation({
          constraintType: this.type,
          staffId: assignment.staffId,
          days: [assignment.day],
          message: `${shiftName}は入れない勤務帯です`,
        })
      );
    }
    return violations;
  }
}
