/**
 * 配置ドメインモデル
 * gakkai-shiftのShiftAssignment_シフト配置を汎用化:
 *   - reason: AssignmentReason を必須フィールドとして追加（型レベルで省略不可）
 *   - locked: 確定済みフラグを追加
 */

import { AssignmentReason, AssignmentReasonState } from './AssignmentReason.js';

// ========== 型定義 ==========

/** 配置の状態 */
export interface AssignmentState {
  readonly id: string;
  readonly memberId: string;
  readonly roleId: string;
  readonly timeSlotId: string;
  readonly shiftPlanId: string;
  readonly reason: AssignmentReasonState;  // 必須（省略不可）
  readonly locked: boolean;                // 確定済みフラグ（誤変更防止）
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Redux/JSON用のシリアライズ型 */
export type AssignmentJSON = {
  id: string;
  memberId: string;
  roleId: string;
  timeSlotId: string;
  shiftPlanId: string;
  reason: AssignmentReasonState;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
};

// ========== ドメインクラス ==========

export class Assignment {
  constructor(readonly state: AssignmentState) {}

  get id(): string {
    return this.state.id;
  }

  get memberId(): string {
    return this.state.memberId;
  }

  get roleId(): string {
    return this.state.roleId;
  }

  get timeSlotId(): string {
    return this.state.timeSlotId;
  }

  get shiftPlanId(): string {
    return this.state.shiftPlanId;
  }

  get reason(): AssignmentReason {
    return new AssignmentReason(this.state.reason);
  }

  get locked(): boolean {
    return this.state.locked;
  }

  /** 配置をロック（確定済みに変更） */
  lock(): Assignment {
    return this.withUpdatedState({ locked: true });
  }

  /** 配置のロックを解除 */
  unlock(): Assignment {
    return this.withUpdatedState({ locked: false });
  }

  /** 配置理由を更新 */
  withReason(reason: AssignmentReason): Assignment {
    return this.withUpdatedState({ reason: reason.state });
  }

  /** ロックされていれば変更を拒否するヘルパー */
  guardLocked(): void {
    if (this.state.locked) {
      throw new Error(`配置 ${this.state.id} はロックされているため変更できません`);
    }
  }

  /** 内部用：状態更新ヘルパー */
  protected withUpdatedState(partial: Partial<AssignmentState>): Assignment {
    return new Assignment({
      ...this.state,
      ...partial,
      updatedAt: new Date().toISOString(),
    });
  }

  // ========== シリアライズ ==========

  toJSON(): AssignmentJSON {
    return {
      id: this.state.id,
      memberId: this.state.memberId,
      roleId: this.state.roleId,
      timeSlotId: this.state.timeSlotId,
      shiftPlanId: this.state.shiftPlanId,
      reason: { ...this.state.reason },
      locked: this.state.locked,
      createdAt: this.state.createdAt,
      updatedAt: this.state.updatedAt,
    };
  }

  static fromJSON(json: AssignmentJSON): Assignment {
    return new Assignment(json);
  }

  /** 新しい配置を作成（reasonは必須） */
  static create(
    data: Pick<AssignmentState, 'memberId' | 'roleId' | 'timeSlotId' | 'shiftPlanId' | 'reason'>
  ): Assignment {
    const now = new Date().toISOString();
    return new Assignment({
      id: crypto.randomUUID(),
      memberId: data.memberId,
      roleId: data.roleId,
      timeSlotId: data.timeSlotId,
      shiftPlanId: data.shiftPlanId,
      reason: data.reason,
      locked: false,
      createdAt: now,
      updatedAt: now,
    });
  }
}
