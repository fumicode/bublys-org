/**
 * ShiftPreference — 局員が提出するシフト希望データ
 *
 * 将来の「シフト希望回収バブル」で収集されるデータを格納する。
 * DayType を主キーとし、各日程に参加可能な時間帯（TimeRange[]）を持つ。
 * entries が空の場合は「未提出」状態。
 */

import { type DayType } from '../master/Shift.js';
import { type TimeRange } from '../member/Member.js';

// ========== 型定義 ==========

/** 1日程分の希望エントリー */
export interface ShiftPreferenceEntryState {
  dayType: DayType;
  /** 実施日 'YYYY-MM-DD'（任意） */
  date?: string;
  /** 参加可能時間帯。空配列 = 終日参加可能 */
  availableRanges: TimeRange[];
}

export interface ShiftPreferenceState {
  readonly id: string;
  readonly memberId: string;
  readonly entries: readonly ShiftPreferenceEntryState[];
  readonly submittedAt: string;
  readonly updatedAt: string;
}

// ========== ドメインクラス ==========

export class ShiftPreference {
  constructor(readonly state: ShiftPreferenceState) {}

  get id(): string { return this.state.id; }
  get memberId(): string { return this.state.memberId; }
  get entries(): readonly ShiftPreferenceEntryState[] { return this.state.entries; }
  get submittedAt(): string { return this.state.submittedAt; }
  get updatedAt(): string { return this.state.updatedAt; }

  getEntryByDayType(dayType: DayType): ShiftPreferenceEntryState | undefined {
    return this.state.entries.find((e) => e.dayType === dayType);
  }

  /**
   * 指定 dayType / 時刻に参加可能か。
   * - エントリー自体がない日程は false（未提出扱い）
   * - availableRanges が空の日程は終日参加可能（true）
   */
  isAvailableAt(dayType: DayType, minute: number): boolean {
    const entry = this.getEntryByDayType(dayType);
    if (!entry) return false;
    if (entry.availableRanges.length === 0) return true;
    return entry.availableRanges.some((r) => r.startMinute <= minute && minute < r.endMinute);
  }

  withEntries(entries: ShiftPreferenceEntryState[]): ShiftPreference {
    return new ShiftPreference({
      ...this.state,
      entries,
      updatedAt: new Date().toISOString(),
    });
  }

  static create(memberId: string, entries: ShiftPreferenceEntryState[] = []): ShiftPreference {
    const now = new Date().toISOString();
    return new ShiftPreference({
      id: crypto.randomUUID(),
      memberId,
      entries,
      submittedAt: now,
      updatedAt: now,
    });
  }
}
