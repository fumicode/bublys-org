/**
 * シフト案ドメインモデル
 * 全配置を取りまとめて、シフト全体の評価を行う
 */

import { ShiftAssignment_シフト配置, ShiftAssignmentState } from './ShiftAssignment_シフト配置.js';
import { StaffRequirement_必要人数 } from '../master/StaffRequirement_必要人数.js';
import { SlotRoleEvaluation_配置枠評価 } from './SlotRoleEvaluation_配置枠評価.js';

// ========== 型定義 ==========

/** 制約違反の種類 */
export type ConstraintViolationType = 'duplicate_staff_in_timeslot';

/** 制約違反 */
export interface ConstraintViolation {
  readonly type: ConstraintViolationType;
  readonly staffId: string;
  readonly timeSlotId: string;
  readonly assignmentIds: ReadonlyArray<string>;
  readonly message: string;
}

/** シフト案の状態 */
export interface ShiftPlanState {
  readonly id: string;
  readonly name: string;
  readonly assignments: ReadonlyArray<ShiftAssignmentState>;
  /** 制約違反（オプショナル: 既存データとの互換性のため） */
  readonly constraintViolations?: ReadonlyArray<ConstraintViolation>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** シフト案の評価結果 */
export interface ShiftPlanEvaluation {
  readonly totalAssignmentCount: number;
  readonly totalFulfillmentRate: number;
  readonly shortageCount: number;
  readonly excessCount: number;
  readonly slotRoleEvaluations: ReadonlyArray<SlotRoleEvaluation_配置枠評価>;
}

// ========== ドメインクラス ==========

export class ShiftPlan_シフト案 {
  constructor(readonly state: ShiftPlanState) {}

  get id(): string {
    return this.state.id;
  }

  get name(): string {
    return this.state.name;
  }

  get assignments(): ReadonlyArray<ShiftAssignment_シフト配置> {
    return this.state.assignments.map((s) => new ShiftAssignment_シフト配置(s));
  }

  get constraintViolations(): ReadonlyArray<ConstraintViolation> {
    // 既存データとの互換性: constraintViolationsがなければ計算
    return this.state.constraintViolations ?? ShiftPlan_シフト案.computeConstraintViolations(this.state.assignments);
  }

  /** 特定スタッフの配置を取得 */
  getAssignmentsByStaff(staffId: string): ShiftAssignment_シフト配置[] {
    return this.assignments.filter((a) => a.staffId === staffId);
  }

  /** 特定時間帯の配置を取得 */
  getAssignmentsByTimeSlot(timeSlotId: string): ShiftAssignment_シフト配置[] {
    return this.assignments.filter((a) => a.timeSlotId === timeSlotId);
  }

  /** 特定係の配置を取得 */
  getAssignmentsByRole(roleId: string): ShiftAssignment_シフト配置[] {
    return this.assignments.filter((a) => a.roleId === roleId);
  }

  /** 特定の時間帯×係の配置を取得 */
  getAssignmentsForSlotRole(timeSlotId: string, roleId: string): ShiftAssignment_シフト配置[] {
    return this.assignments.filter(
      (a) => a.timeSlotId === timeSlotId && a.roleId === roleId
    );
  }

  /** シフト案を評価（必要人数と照合） */
  evaluate(requirements: StaffRequirement_必要人数[]): ShiftPlanEvaluation {
    const slotRoleEvaluations: SlotRoleEvaluation_配置枠評価[] = [];

    for (const req of requirements) {
      const assignedStaffIds = this.getAssignmentsForSlotRole(
        req.timeSlotId,
        req.roleId
      ).map((a) => a.staffId);

      const evaluation = SlotRoleEvaluation_配置枠評価.evaluate(req, assignedStaffIds);
      slotRoleEvaluations.push(evaluation);
    }

    const totalAssignmentCount = this.state.assignments.length;
    const shortageCount = slotRoleEvaluations.filter((e) => e.hasShortage).length;
    const excessCount = slotRoleEvaluations.filter((e) => e.hasExcess).length;

    const totalFulfillmentRate =
      slotRoleEvaluations.length > 0
        ? slotRoleEvaluations.reduce((sum, e) => sum + e.fulfillmentRate, 0) /
          slotRoleEvaluations.length
        : 100;

    return {
      totalAssignmentCount,
      totalFulfillmentRate,
      shortageCount,
      excessCount,
      slotRoleEvaluations,
    };
  }

  /** 総合スコアを計算（高いほど良い） */
  calculateOverallScore(requirements: StaffRequirement_必要人数[]): number {
    const evaluation = this.evaluate(requirements);

    // 充足率をベースに、不足・過剰でペナルティ
    let score = evaluation.totalFulfillmentRate;
    score -= evaluation.shortageCount * 5; // 不足1件につき-5点
    score -= evaluation.excessCount * 2; // 過剰1件につき-2点

    return Math.max(0, score);
  }

  // ========== 制約違反 ==========

  /** 制約違反を取得 */
  detectConstraintViolations(): ReadonlyArray<ConstraintViolation> {
    return this.constraintViolations;
  }

  /** 制約違反があるかどうか */
  hasConstraintViolations(): boolean {
    return this.constraintViolations.length > 0;
  }

  /** 特定の配置が制約違反に含まれているか */
  isAssignmentInViolation(assignmentId: string): boolean {
    return this.constraintViolations.some((v) => v.assignmentIds.includes(assignmentId));
  }

  /** 特定のスタッフ×時間帯の組み合わせが制約違反か */
  isStaffTimeSlotInViolation(staffId: string, timeSlotId: string): boolean {
    return this.constraintViolations.some(
      (v) => v.staffId === staffId && v.timeSlotId === timeSlotId
    );
  }

  /** 配置リストから制約違反を計算 */
  static computeConstraintViolations(
    assignments: ReadonlyArray<ShiftAssignmentState>
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    // 同一時間帯に同じスタッフが複数配置されている場合を検出
    const groupedByTimeSlotAndStaff = new Map<string, ShiftAssignmentState[]>();

    for (const assignment of assignments) {
      const key = `${assignment.timeSlotId}:${assignment.staffId}`;
      const existing = groupedByTimeSlotAndStaff.get(key) ?? [];
      existing.push(assignment);
      groupedByTimeSlotAndStaff.set(key, existing);
    }

    // 2件以上あるものを違反として報告
    for (const [key, grouped] of groupedByTimeSlotAndStaff) {
      if (grouped.length > 1) {
        const [timeSlotId, staffId] = key.split(':');
        violations.push({
          type: 'duplicate_staff_in_timeslot',
          staffId,
          timeSlotId,
          assignmentIds: grouped.map((a) => a.id),
          message: `同一時間帯に同じスタッフが${grouped.length}件配置されています`,
        });
      }
    }

    return violations;
  }

  // ========== 状態変更メソッド ==========

  /** 配置を追加 */
  addAssignment(assignment: ShiftAssignment_シフト配置): ShiftPlan_シフト案 {
    return this.withUpdatedState({
      assignments: [...this.state.assignments, assignment.state],
    });
  }

  /** 配置を削除 */
  removeAssignment(assignmentId: string): ShiftPlan_シフト案 {
    return this.withUpdatedState({
      assignments: this.state.assignments.filter((a) => a.id !== assignmentId),
    });
  }

  /** 名前を変更 */
  withName(name: string): ShiftPlan_シフト案 {
    return this.withUpdatedState({ name });
  }

  /** 内部用：状態更新ヘルパー */
  protected withUpdatedState(partial: Partial<ShiftPlanState>): ShiftPlan_シフト案 {
    const newAssignments = partial.assignments ?? this.state.assignments;
    const constraintViolations = partial.assignments
      ? ShiftPlan_シフト案.computeConstraintViolations(newAssignments)
      : this.state.constraintViolations;

    return new ShiftPlan_シフト案({
      ...this.state,
      ...partial,
      constraintViolations,
      updatedAt: new Date().toISOString(),
    });
  }

  // ========== 静的メソッド ==========

  /** 新しいシフト案を作成 */
  static create(name: string): ShiftPlan_シフト案 {
    const now = new Date().toISOString();
    return new ShiftPlan_シフト案({
      id: crypto.randomUUID(),
      name,
      assignments: [],
      constraintViolations: [],
      createdAt: now,
      updatedAt: now,
    });
  }
}
