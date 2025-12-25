/**
 * 時間帯ドメインモデル
 */

// ========== 型定義 ==========

/** 日付文字列 (YYYY-MM-DD形式) */
export type DateString_日付 = string;

/** 時間帯区分 */
export type TimeSlotPeriod_時間帯区分 =
  | 'all_day'     // 終日
  | 'morning'     // 午前
  | 'afternoon'   // 午後
  | 'evening'     // 夕刻
  | 'party';      // 懇親会

/** 時間帯の状態 */
export interface TimeSlotState {
  readonly id: string;           // 例: "2025-03-26_morning"
  readonly date: DateString_日付;
  readonly period: TimeSlotPeriod_時間帯区分;
  readonly startTime: string;    // "08:00"
  readonly endTime: string;      // "12:00"
  readonly label: string;        // "3/26 午前"
  readonly isOrientation: boolean; // 業務オリエンテーション枠かどうか
}

// ========== ドメインクラス ==========

export class TimeSlot_時間帯 {
  constructor(readonly state: TimeSlotState) {}

  get id(): string {
    return this.state.id;
  }

  get date(): DateString_日付 {
    return this.state.date;
  }

  get period(): TimeSlotPeriod_時間帯区分 {
    return this.state.period;
  }

  get label(): string {
    return this.state.label;
  }

  get isOrientation(): boolean {
    return this.state.isOrientation;
  }

  /** 同じ日付かどうか */
  isSameDate(other: TimeSlot_時間帯): boolean {
    return this.state.date === other.state.date;
  }

  /** この時間帯と重複するかどうか */
  overlaps(other: TimeSlot_時間帯): boolean {
    return this.state.id === other.state.id;
  }

  /** 時間帯の長さ（時間単位） */
  getDurationHours(): number {
    const [startH, startM] = this.state.startTime.split(':').map(Number);
    const [endH, endM] = this.state.endTime.split(':').map(Number);
    return (endH * 60 + endM - startH * 60 - startM) / 60;
  }

  // TimeSlotはマスターデータのため、更新メソッドは提供しない

  /** 時間帯区分の日本語ラベルを取得 */
  static getPeriodLabel(period: TimeSlotPeriod_時間帯区分): string {
    const labels: Record<TimeSlotPeriod_時間帯区分, string> = {
      all_day: '終日',
      morning: '午前',
      afternoon: '午後',
      evening: '夕刻',
      party: '懇親会',
    };
    return labels[period];
  }

  /** IDから時間帯を生成するヘルパー */
  static createId(date: DateString_日付, period: TimeSlotPeriod_時間帯区分): string {
    return `${date}_${period}`;
  }

  /** 2025年学会のデフォルト時間帯を生成 */
  static createDefaultTimeSlots(): TimeSlot_時間帯[] {
    const slots: TimeSlotState[] = [
      // 3/24（月）準備日
      {
        id: '2025-03-24_all_day',
        date: '2025-03-24',
        period: 'all_day',
        startTime: '08:00',
        endTime: '17:00',
        label: '3/24 終日（準備）',
        isOrientation: false,
      },
      // 3/25（火）準備日
      {
        id: '2025-03-25_morning',
        date: '2025-03-25',
        period: 'morning',
        startTime: '08:00',
        endTime: '13:00',
        label: '3/25 午前',
        isOrientation: false,
      },
      {
        id: '2025-03-25_afternoon',
        date: '2025-03-25',
        period: 'afternoon',
        startTime: '13:00',
        endTime: '17:00',
        label: '3/25 午後（オリエン）',
        isOrientation: true,
      },
      // 3/26（水）会期1日目
      {
        id: '2025-03-26_morning',
        date: '2025-03-26',
        period: 'morning',
        startTime: '08:00',
        endTime: '12:00',
        label: '3/26 午前',
        isOrientation: false,
      },
      {
        id: '2025-03-26_afternoon',
        date: '2025-03-26',
        period: 'afternoon',
        startTime: '12:00',
        endTime: '17:00',
        label: '3/26 午後',
        isOrientation: false,
      },
      {
        id: '2025-03-26_evening',
        date: '2025-03-26',
        period: 'evening',
        startTime: '17:00',
        endTime: '20:00',
        label: '3/26 夕刻',
        isOrientation: false,
      },
      // 3/27（木）会期2日目
      {
        id: '2025-03-27_morning',
        date: '2025-03-27',
        period: 'morning',
        startTime: '08:00',
        endTime: '12:00',
        label: '3/27 午前',
        isOrientation: false,
      },
      {
        id: '2025-03-27_afternoon',
        date: '2025-03-27',
        period: 'afternoon',
        startTime: '12:00',
        endTime: '17:00',
        label: '3/27 午後',
        isOrientation: false,
      },
      {
        id: '2025-03-27_evening',
        date: '2025-03-27',
        period: 'evening',
        startTime: '17:00',
        endTime: '20:00',
        label: '3/27 夕刻',
        isOrientation: false,
      },
      {
        id: '2025-03-27_party',
        date: '2025-03-27',
        period: 'party',
        startTime: '17:00',
        endTime: '20:30',
        label: '3/27 懇親会',
        isOrientation: false,
      },
      // 3/28（金）会期3日目
      {
        id: '2025-03-28_morning',
        date: '2025-03-28',
        period: 'morning',
        startTime: '08:00',
        endTime: '12:00',
        label: '3/28 午前',
        isOrientation: false,
      },
      {
        id: '2025-03-28_afternoon',
        date: '2025-03-28',
        period: 'afternoon',
        startTime: '12:00',
        endTime: '17:00',
        label: '3/28 午後',
        isOrientation: false,
      },
      {
        id: '2025-03-28_evening',
        date: '2025-03-28',
        period: 'evening',
        startTime: '17:00',
        endTime: '20:00',
        label: '3/28 夕刻',
        isOrientation: false,
      },
      // 3/29（土）会期4日目（最終日）
      {
        id: '2025-03-29_morning',
        date: '2025-03-29',
        period: 'morning',
        startTime: '08:00',
        endTime: '12:00',
        label: '3/29 午前',
        isOrientation: false,
      },
      {
        id: '2025-03-29_afternoon',
        date: '2025-03-29',
        period: 'afternoon',
        startTime: '12:00',
        endTime: '17:00',
        label: '3/29 午後（撤去）',
        isOrientation: false,
      },
    ];

    return slots.map((state) => new TimeSlot_時間帯(state));
  }
}
