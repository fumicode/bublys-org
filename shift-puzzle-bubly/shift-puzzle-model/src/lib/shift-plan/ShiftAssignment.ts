/**
 * シフト配置ドメインモデル
 */

// ========== 型定義 ==========

/** シフト配置の状態 */
export interface ShiftAssignmentState {
  readonly id: string;
  readonly shiftId: string;
  readonly staffId: string;
  readonly assignedStartMinute: number;
  readonly assignedEndMinute: number;
  readonly isAutoAssigned: boolean;
  readonly notes?: string;
}

// ========== ドメインクラス ==========

export class ShiftAssignment {
  constructor(readonly state: ShiftAssignmentState) {}

  get id(): string {
    return this.state.id;
  }

  get shiftId(): string {
    return this.state.shiftId;
  }

  get staffId(): string {
    return this.state.staffId;
  }

  get assignedStartMinute(): number {
    return this.state.assignedStartMinute;
  }

  get assignedEndMinute(): number {
    return this.state.assignedEndMinute;
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
    shiftId: string,
    staffId: string,
    assignedStartMinute: number,
    assignedEndMinute: number,
    isAutoAssigned = false,
  ): ShiftAssignment {
    return new ShiftAssignment({
      id: crypto.randomUUID(),
      shiftId,
      staffId,
      assignedStartMinute,
      assignedEndMinute,
      isAutoAssigned,
    });
  }
}
