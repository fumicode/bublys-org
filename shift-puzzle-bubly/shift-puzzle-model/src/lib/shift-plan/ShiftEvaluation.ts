/**
 * シフト評価ドメインモデル
 * Shift レベルでの人員充足状況を 15 分スロット単位で評価する
 */

import { Shift } from '../master/Shift.js';
import { ShiftAssignment } from './ShiftAssignment.js';

// ========== 型定義 ==========

/** 15 分スロットの充足情報 */
export interface SlotCoverage {
  readonly minute: number;
  readonly count: number;
}

/** シフト評価の状態 */
export interface ShiftEvaluationState {
  readonly shiftId: string;
  readonly requiredCount: number;
  readonly minCount: number;
  readonly maxCount: number;
  readonly assignedCount: number;
  readonly assignedMemberIds: readonly string[];
  readonly slotCoverages: readonly SlotCoverage[];
  /** 全 15 分スロットのうち minCount 以上を満たすスロットの割合 (0–100) */
  readonly fulfillmentRate: number;
  readonly hasShortage: boolean;
  readonly hasExcess: boolean;
}

// ========== ドメインクラス ==========

export class ShiftEvaluation {
  constructor(readonly state: ShiftEvaluationState) {}

  get shiftId(): string { return this.state.shiftId; }
  get requiredCount(): number { return this.state.requiredCount; }
  get minCount(): number { return this.state.minCount; }
  get maxCount(): number { return this.state.maxCount; }
  get assignedCount(): number { return this.state.assignedCount; }
  get assignedMemberIds(): readonly string[] { return this.state.assignedMemberIds; }
  get slotCoverages(): readonly SlotCoverage[] { return this.state.slotCoverages; }
  get fulfillmentRate(): number { return this.state.fulfillmentRate; }
  get hasShortage(): boolean { return this.state.hasShortage; }
  get hasExcess(): boolean { return this.state.hasExcess; }

  /** シフトと配置リストから評価を計算する */
  static evaluate(shift: Shift, assignments: readonly ShiftAssignment[]): ShiftEvaluation {
    const shiftAssignments = assignments.filter((a) => a.shiftId === shift.id);
    const assignedMemberIds = shiftAssignments.map((a) => a.staffId);
    const assignedCount = shiftAssignments.length;

    // 15 分スロットごとの充足人数
    const slotCoverages: SlotCoverage[] = [];
    for (let m = shift.startMinute; m < shift.endMinute; m += 15) {
      const count = shiftAssignments.filter(
        (a) => a.assignedStartMinute <= m && a.assignedEndMinute > m,
      ).length;
      slotCoverages.push({ minute: m, count });
    }

    // 充足率 = minCount 以上のスロット / 全スロット * 100
    const totalSlots = slotCoverages.length;
    const coveredSlots = slotCoverages.filter((s) => s.count >= shift.minCount).length;
    const fulfillmentRate = totalSlots > 0 ? (coveredSlots / totalSlots) * 100 : 100;

    return new ShiftEvaluation({
      shiftId: shift.id,
      requiredCount: shift.requiredCount,
      minCount: shift.minCount,
      maxCount: shift.maxCount,
      assignedCount,
      assignedMemberIds,
      slotCoverages,
      fulfillmentRate,
      hasShortage: assignedCount < shift.minCount,
      hasExcess: assignedCount > shift.maxCount,
    });
  }
}
