/**
 * 配置結果ドメインモデル
 */

import { StaffRequirement_必要人数 } from './StaffRequirement_必要人数.js';

// ========== 型定義 ==========

/** 時間帯×係ごとの配置結果 */
export interface SlotRoleResultState {
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

export class SlotRoleResult_配置結果 {
  constructor(readonly state: SlotRoleResultState) {}

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

  // SlotRoleResultは計算結果のため、更新メソッドは提供しない

  /** 配置状況から結果を計算 */
  static calculate(
    requirement: StaffRequirement_必要人数,
    assignedStaffIds: string[]
  ): SlotRoleResult_配置結果 {
    const assignedCount = assignedStaffIds.length;
    const requiredCount = requirement.requiredCount;
    const fulfillmentRate =
      requiredCount > 0 ? (assignedCount / requiredCount) * 100 : 100;

    return new SlotRoleResult_配置結果({
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
