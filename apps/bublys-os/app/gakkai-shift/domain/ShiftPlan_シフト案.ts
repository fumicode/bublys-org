/**
 * シフト案ドメインモデル
 * 全配置を取りまとめて、シフト全体の評価を行う
 */

import { ShiftAssignment_シフト配置, ShiftAssignmentState } from './ShiftAssignment_シフト配置';
import { StaffRequirement_必要人数 } from './StaffRequirement_必要人数';
import { SlotRoleResult_配置結果 } from './SlotRoleResult_配置結果';

// ========== 型定義 ==========

/** シフト案の状態 */
export interface ShiftPlanState {
  readonly id: string;
  readonly name: string;
  readonly assignments: ReadonlyArray<ShiftAssignmentState>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** シフト案の評価結果 */
export interface ShiftPlanEvaluation {
  readonly totalAssignmentCount: number;
  readonly totalFulfillmentRate: number;
  readonly shortageCount: number;
  readonly excessCount: number;
  readonly slotRoleResults: ReadonlyArray<SlotRoleResult_配置結果>;
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
    const slotRoleResults: SlotRoleResult_配置結果[] = [];

    for (const req of requirements) {
      const assignedStaffIds = this.getAssignmentsForSlotRole(
        req.timeSlotId,
        req.roleId
      ).map((a) => a.staffId);

      const result = SlotRoleResult_配置結果.calculate(req, assignedStaffIds);
      slotRoleResults.push(result);
    }

    const totalAssignmentCount = this.state.assignments.length;
    const shortageCount = slotRoleResults.filter((r) => r.hasShortage).length;
    const excessCount = slotRoleResults.filter((r) => r.hasExcess).length;

    const totalFulfillmentRate =
      slotRoleResults.length > 0
        ? slotRoleResults.reduce((sum, r) => sum + r.fulfillmentRate, 0) /
          slotRoleResults.length
        : 100;

    return {
      totalAssignmentCount,
      totalFulfillmentRate,
      shortageCount,
      excessCount,
      slotRoleResults,
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
    return new ShiftPlan_シフト案({
      ...this.state,
      ...partial,
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
      createdAt: now,
      updatedAt: now,
    });
  }
}
