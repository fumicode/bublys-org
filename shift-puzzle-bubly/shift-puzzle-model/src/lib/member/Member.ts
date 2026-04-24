/**
 * 局員ドメインモデル
 */

import type { DayType } from '../master/Shift.js';

// ========== 型定義 ==========

/**
 * 時間帯（絶対分、半開区間 [startMinute, endMinute)）。15分刻みを想定。
 *
 * 注: Redux Toolkit (Immer) の WritableDraft との互換性のため readonly を付けない。
 * 変更は Member class の `withAvailability` 等を通してのみ行うこと。
 */
export interface TimeRange {
  startMinute: number;
  endMinute: number;
}

/** DayType → その日に参加可能な時間帯（複数可） */
export type AvailabilityByDayType = Partial<Record<DayType, TimeRange[]>>;

/** 局員の状態 */
export interface MemberState {
  readonly id: string;
  readonly name: string;
  readonly furigana?: string;
  readonly department: string;                     // 所属局
  readonly isNewMember: boolean;                   // 新入生かどうか
  /** DayType 毎の参加可能時間帯（15分刻み） */
  readonly availability: AvailabilityByDayType;
  readonly notes?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// ========== 類似Shift型（domain層を逆依存させないための最小構造） ==========

export interface ShiftLike {
  readonly dayType: DayType;
  readonly startMinute: number;
  readonly endMinute: number;
}

// ========== ドメインクラス ==========

export class Member {
  constructor(readonly state: MemberState) {}

  get id(): string { return this.state.id; }
  get name(): string { return this.state.name; }
  get furigana(): string | undefined { return this.state.furigana; }
  get department(): string { return this.state.department; }
  get isNewMember(): boolean { return this.state.isNewMember; }
  get availability(): AvailabilityByDayType { return this.state.availability; }
  get notes(): string | undefined { return this.state.notes; }

  /** 指定 DayType の参加可能時間帯 */
  getAvailableRanges(dayType: DayType): readonly TimeRange[] {
    return this.state.availability[dayType] ?? [];
  }

  /** 指定時刻(絶対分)に参加可能か */
  isAvailableAt(dayType: DayType, minute: number): boolean {
    return this.getAvailableRanges(dayType).some(
      (r) => r.startMinute <= minute && minute < r.endMinute,
    );
  }

  /** シフトの全時間帯を通して参加可能か（15分刻みで全ブロック available であれば true） */
  isAvailableForShift(shift: ShiftLike): boolean {
    const ranges = this.getAvailableRanges(shift.dayType);
    if (ranges.length === 0) return false;
    for (let m = shift.startMinute; m < shift.endMinute; m += 15) {
      if (!ranges.some((r) => r.startMinute <= m && m < r.endMinute)) return false;
    }
    return true;
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

  withAvailability(availability: AvailabilityByDayType): Member {
    return this.withUpdatedState({ availability });
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
      availability: {},
      createdAt: now,
      updatedAt: now,
    });
  }
}
