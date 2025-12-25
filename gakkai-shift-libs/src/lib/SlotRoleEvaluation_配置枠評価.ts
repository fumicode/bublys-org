/**
 * 配置枠評価ドメインモデル
 * 時間帯×係（配置枠）レベルでの人員充足状況を評価する
 */

import { StaffRequirement_必要人数 } from './StaffRequirement_必要人数.js';

// ========== 型定義 ==========

/** 配置枠評価の状態 */
export interface SlotRoleEvaluationState {
  readonly timeSlotId: string;
  readonly roleId: string;
  readonly requiredCount: number;
  readonly assignedCount: number;
  readonly assignedStaffIds: ReadonlyArray<string>;
  readonly fulfillmentRate: number;
  readonly hasShortage: boolean;
  readonly hasExcess: boolean;
}

// ========== ドメインクラス ==========

export class SlotRoleEvaluation_配置枠評価 {
  constructor(readonly state: SlotRoleEvaluationState) {}

  get timeSlotId(): string {
    return this.state.timeSlotId;
  }

  get roleId(): string {
    return this.state.roleId;
  }

  get requiredCount(): number {
    return this.state.requiredCount;
  }

  get assignedCount(): number {
    return this.state.assignedCount;
  }

  get assignedStaffIds(): ReadonlyArray<string> {
    return this.state.assignedStaffIds;
  }

  get fulfillmentRate(): number {
    return this.state.fulfillmentRate;
  }

  get hasShortage(): boolean {
    return this.state.hasShortage;
  }

  get hasExcess(): boolean {
    return this.state.hasExcess;
  }

  // SlotRoleEvaluationは計算結果のため、更新メソッドは提供しない

  /** 配置状況から評価を行う */
  static evaluate(
    requirement: StaffRequirement_必要人数,
    assignedStaffIds: string[]
  ): SlotRoleEvaluation_配置枠評価 {
    const assignedCount = assignedStaffIds.length;
    const requiredCount = requirement.requiredCount;
    const fulfillmentRate =
      requiredCount > 0 ? (assignedCount / requiredCount) * 100 : 100;

    return new SlotRoleEvaluation_配置枠評価({
      timeSlotId: requirement.timeSlotId,
      roleId: requirement.roleId,
      requiredCount,
      assignedCount,
      assignedStaffIds,
      fulfillmentRate,
      hasShortage: assignedCount < requirement.minCount,
      hasExcess: assignedCount > requirement.maxCount,
    });
  }
}
