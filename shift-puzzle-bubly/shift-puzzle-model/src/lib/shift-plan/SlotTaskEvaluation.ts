/**
 * 配置枠評価ドメインモデル
 * 時間帯×タスク（配置枠）レベルでの人員充足状況を評価する
 */

import { TaskRequirement } from '../master/TimeSlot.js';

// ========== 型定義 ==========

/** 配置枠評価の状態 */
export interface SlotTaskEvaluationState {
  readonly timeSlotId: string;
  readonly taskId: string;
  readonly requiredCount: number;
  readonly assignedCount: number;
  readonly assignedMemberIds: readonly string[];
  readonly fulfillmentRate: number;
  readonly hasShortage: boolean;
  readonly hasExcess: boolean;
}

// ========== ドメインクラス ==========

export class SlotTaskEvaluation {
  constructor(readonly state: SlotTaskEvaluationState) {}

  get timeSlotId(): string {
    return this.state.timeSlotId;
  }

  get taskId(): string {
    return this.state.taskId;
  }

  get requiredCount(): number {
    return this.state.requiredCount;
  }

  get assignedCount(): number {
    return this.state.assignedCount;
  }

  get assignedMemberIds(): readonly string[] {
    return this.state.assignedMemberIds;
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

  // SlotTaskEvaluationは計算結果のため、更新メソッドは提供しない

  /** 配置状況から評価を行う */
  static evaluate(
    requirement: TaskRequirement,
    assignedMemberIds: string[]
  ): SlotTaskEvaluation {
    const assignedCount = assignedMemberIds.length;
    const requiredCount = requirement.requiredCount;
    const fulfillmentRate =
      requiredCount > 0 ? (assignedCount / requiredCount) * 100 : 100;

    return new SlotTaskEvaluation({
      timeSlotId: requirement.timeSlotId,
      taskId: requirement.taskId,
      requiredCount,
      assignedCount,
      assignedMemberIds,
      fulfillmentRate,
      hasShortage: assignedCount < requirement.minCount,
      hasExcess: assignedCount > requirement.maxCount,
    });
  }
}
