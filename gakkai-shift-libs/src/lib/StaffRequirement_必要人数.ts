/**
 * 必要人数ドメインモデル
 */

// ========== 型定義 ==========

/** 必要人数の状態 */
export interface StaffRequirementState {
  readonly id: string;
  readonly timeSlotId: string;
  readonly roleId: string;
  readonly requiredCount: number;
  readonly minCount?: number;
  readonly maxCount?: number;
}

// ========== ドメインクラス ==========

export class StaffRequirement_必要人数 {
  constructor(readonly state: StaffRequirementState) {}

  get id(): string {
    return this.state.id;
  }

  get timeSlotId(): string {
    return this.state.timeSlotId;
  }

  get roleId(): string {
    return this.state.roleId;
  }

  get requiredCount(): number {
    return this.state.requiredCount;
  }

  get minCount(): number {
    return this.state.minCount ?? this.state.requiredCount;
  }

  get maxCount(): number {
    return this.state.maxCount ?? this.state.requiredCount;
  }

  /** 必要人数を変更 */
  withRequiredCount(count: number): StaffRequirement_必要人数 {
    return new StaffRequirement_必要人数({ ...this.state, requiredCount: count });
  }

  /** 最小・最大人数の範囲を設定 */
  withCountRange(minCount: number, maxCount: number): StaffRequirement_必要人数 {
    return new StaffRequirement_必要人数({ ...this.state, minCount, maxCount });
  }

  // 汎用updateは提供しない（意味のあるメソッドのみ公開）

  /** 新しい必要人数設定を作成 */
  static create(
    timeSlotId: string,
    roleId: string,
    requiredCount: number
  ): StaffRequirement_必要人数 {
    return new StaffRequirement_必要人数({
      id: `${timeSlotId}_${roleId}`,
      timeSlotId,
      roleId,
      requiredCount,
    });
  }
}
