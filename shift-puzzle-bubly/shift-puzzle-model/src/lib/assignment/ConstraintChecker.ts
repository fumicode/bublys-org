/**
 * 制約チェッカードメインモデル
 * gakkai-shiftのcomputeConstraintViolationsを拡張・一元管理:
 *   - 同一メンバーの時間帯重複
 *   - スキル不足（役割が要求するスキルを持たない）
 *   - 参加可能時間外の配置
 *   - 役割の必要人数不足
 */

import { AssignmentState } from './Assignment.js';
import { MemberState } from '../member/Member.js';
import { RoleState } from '../role/Role.js';
import { TimeSlotState } from '../time/TimeSlot.js';

// ========== 型定義 ==========

/** 制約違反の種類 */
export type ConstraintViolationType =
  | 'duplicate_member_in_timeslot'  // 同一メンバーの時間帯重複
  | 'skill_mismatch'                // スキル不足
  | 'outside_availability'          // 参加可能時間外
  | 'role_understaffed';            // 役割の必要人数不足

/** 制約違反 */
export interface ConstraintViolation {
  readonly type: ConstraintViolationType;
  readonly assignmentId?: string;
  readonly memberId?: string;
  readonly roleId?: string;
  readonly timeSlotId?: string;
  readonly message: string;
}

/** 役割充足状況 */
export interface RoleFulfillment {
  readonly roleId: string;
  readonly timeSlotId: string;
  readonly required: number;
  readonly assigned: number;
  readonly isFulfilled: boolean;
  readonly isOverFilled: boolean;
}

// ========== ドメインクラス ==========

export class ConstraintChecker {
  constructor(
    private readonly assignments: ReadonlyArray<AssignmentState>,
    private readonly members: ReadonlyMap<string, MemberState>,
    private readonly roles: ReadonlyMap<string, RoleState>,
    private readonly timeSlots: ReadonlyMap<string, TimeSlotState>
  ) {}

  /** 全制約違反を検出 */
  computeViolations(): ConstraintViolation[] {
    return [
      ...this.checkDuplicateMemberInTimeslot(),
      ...this.checkSkillMismatch(),
      ...this.checkOutsideAvailability(),
    ];
  }

  /** 役割充足状況を計算 */
  computeRoleFulfillments(): RoleFulfillment[] {
    const fulfillments: RoleFulfillment[] = [];

    // timeSlotId × roleId の組み合わせで集計
    const countMap = new Map<string, number>();
    for (const assignment of this.assignments) {
      const key = `${assignment.timeSlotId}:${assignment.roleId}`;
      countMap.set(key, (countMap.get(key) ?? 0) + 1);
    }

    // 全ロール × 全タイムスロットを確認
    for (const [timeSlotId] of this.timeSlots) {
      for (const [roleId, role] of this.roles) {
        const key = `${timeSlotId}:${roleId}`;
        const assigned = countMap.get(key) ?? 0;
        const required = role.minRequired;
        const maxRequired = role.maxRequired;

        if (required > 0) {
          fulfillments.push({
            roleId,
            timeSlotId,
            required,
            assigned,
            isFulfilled: assigned >= required,
            isOverFilled: maxRequired !== null && assigned > maxRequired,
          });
        }
      }
    }

    return fulfillments;
  }

  /** 特定配置が違反に含まれるかどうか */
  isAssignmentInViolation(assignmentId: string): boolean {
    return this.computeViolations().some((v) => v.assignmentId === assignmentId);
  }

  // ========== 個別チェック ==========

  /** 同一メンバーが同一時間帯に複数配置されているか */
  private checkDuplicateMemberInTimeslot(): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    const grouped = new Map<string, AssignmentState[]>();

    for (const assignment of this.assignments) {
      const key = `${assignment.timeSlotId}:${assignment.memberId}`;
      const existing = grouped.get(key) ?? [];
      existing.push(assignment);
      grouped.set(key, existing);
    }

    for (const [key, group] of grouped) {
      if (group.length > 1) {
        const [timeSlotId, memberId] = key.split(':');
        violations.push({
          type: 'duplicate_member_in_timeslot',
          memberId,
          timeSlotId,
          assignmentId: group[0].id,
          message: `同一時間帯に同じメンバーが${group.length}件配置されています`,
        });
      }
    }

    return violations;
  }

  /** スキル不足の配置があるか */
  private checkSkillMismatch(): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    for (const assignment of this.assignments) {
      const member = this.members.get(assignment.memberId);
      const role = this.roles.get(assignment.roleId);
      if (!member || !role) continue;

      const missingSkills = role.requiredSkillIds.filter(
        (skillId) => !member.skills.includes(skillId)
      );

      if (missingSkills.length > 0) {
        violations.push({
          type: 'skill_mismatch',
          assignmentId: assignment.id,
          memberId: assignment.memberId,
          roleId: assignment.roleId,
          timeSlotId: assignment.timeSlotId,
          message: `${member.name} は役割「${role.name}」に必要なスキルを持っていません`,
        });
      }
    }

    return violations;
  }

  /** 参加可能時間外の配置があるか */
  private checkOutsideAvailability(): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    for (const assignment of this.assignments) {
      const member = this.members.get(assignment.memberId);
      if (!member) continue;

      if (!member.availableSlotIds.includes(assignment.timeSlotId)) {
        violations.push({
          type: 'outside_availability',
          assignmentId: assignment.id,
          memberId: assignment.memberId,
          timeSlotId: assignment.timeSlotId,
          message: `${member.name} は参加不可能な時間帯に配置されています`,
        });
      }
    }

    return violations;
  }

  // ========== 静的ファクトリ ==========

  static create(
    assignments: ReadonlyArray<AssignmentState>,
    members: ReadonlyArray<MemberState>,
    roles: ReadonlyArray<RoleState>,
    timeSlots: ReadonlyArray<TimeSlotState>
  ): ConstraintChecker {
    return new ConstraintChecker(
      assignments,
      new Map(members.map((m) => [m.id, m])),
      new Map(roles.map((r) => [r.id, r])),
      new Map(timeSlots.map((t) => [t.id, t]))
    );
  }
}
