/**
 * シフト配置ドメインモデル
 */

// ========== 型定義 ==========

/** シフト配置の状態 */
export interface ShiftAssignmentState {
  readonly id: string;
  readonly staffId: string;
  readonly timeSlotId: string;
  readonly roleId: string;
  readonly isAutoAssigned: boolean;
  readonly notes?: string;
}

// ========== ドメインクラス ==========

export class ShiftAssignment {
  constructor(readonly state: ShiftAssignmentState) {}

  get id(): string {
    return this.state.id;
  }

  get staffId(): string {
    return this.state.staffId;
  }

  get timeSlotId(): string {
    return this.state.timeSlotId;
  }

  get roleId(): string {
    return this.state.roleId;
  }

  get isAutoAssigned(): boolean {
    return this.state.isAutoAssigned;
  }

  get notes(): string | undefined {
    return this.state.notes;
  }

  /** 手動配置に変更（自動配置を上書き） */
  markAsManuallyAssigned(): ShiftAssignment {
    return new ShiftAssignment({ ...this.state, isAutoAssigned: false });
  }

  /** 備考を追加 */
  withNotes(notes: string): ShiftAssignment {
    return new ShiftAssignment({ ...this.state, notes });
  }

  /** 新しい配置を作成 */
  static create(
    staffId: string,
    timeSlotId: string,
    roleId: string,
    isAutoAssigned = true
  ): ShiftAssignment {
    return new ShiftAssignment({
      id: crypto.randomUUID(),
      staffId,
      timeSlotId,
      roleId,
      isAutoAssigned,
    });
  }
}
