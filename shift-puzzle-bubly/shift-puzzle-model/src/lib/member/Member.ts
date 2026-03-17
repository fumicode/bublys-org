/**
 * 局員ドメインモデル
 */

// ========== 型定義 ==========

/** 局員の状態 */
export interface MemberState {
  readonly id: string;
  readonly name: string;
  readonly furigana?: string;
  readonly department: string;                       // 所属局
  readonly isNewMember: boolean;                     // 新入生かどうか
  readonly availableTimeSlots: readonly string[];    // 参加可能時間帯IDリスト
  readonly notes?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// ========== ドメインクラス ==========

export class Member {
  constructor(readonly state: MemberState) {}

  get id(): string {
    return this.state.id;
  }

  get name(): string {
    return this.state.name;
  }

  get furigana(): string | undefined {
    return this.state.furigana;
  }

  get department(): string {
    return this.state.department;
  }

  get isNewMember(): boolean {
    return this.state.isNewMember;
  }

  get availableTimeSlots(): readonly string[] {
    return this.state.availableTimeSlots;
  }

  get notes(): string | undefined {
    return this.state.notes;
  }

  /** 指定時間帯に参加可能かどうか */
  isAvailableAt(timeSlotId: string): boolean {
    return this.state.availableTimeSlots.includes(timeSlotId);
  }

  // ========== 状態変更メソッド ==========

  withDepartment(department: string): Member {
    return this.withUpdatedState({ department });
  }

  withIsNewMember(isNewMember: boolean): Member {
    return this.withUpdatedState({ isNewMember });
  }

  withNotes(notes: string): Member {
    return this.withUpdatedState({ notes });
  }

  protected withUpdatedState(partial: Partial<MemberState>): Member {
    return new Member({
      ...this.state,
      ...partial,
      updatedAt: new Date().toISOString(),
    });
  }

  // ========== 静的メソッド ==========

  static create(name: string, department: string, isNewMember: boolean): Member {
    const now = new Date().toISOString();
    return new Member({
      id: crypto.randomUUID(),
      name,
      department,
      isNewMember,
      availableTimeSlots: [],
      createdAt: now,
      updatedAt: now,
    });
  }
}
