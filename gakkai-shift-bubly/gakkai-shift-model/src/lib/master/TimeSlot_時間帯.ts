/**
 * 時間帯ドメインモデル
 * StaffRequirement（必要人数）を集約として含む
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

/** 必要人数の状態（TimeSlot集約の一部） */
export interface StaffRequirementState {
  readonly roleId: string;
  readonly requiredCount: number;
  readonly minCount?: number;
  readonly maxCount?: number;
}

/** 時間帯の状態 */
export interface TimeSlotState {
  readonly id: string;           // 例: "2025-03-19_morning"
  readonly date: DateString_日付;
  readonly period: TimeSlotPeriod_時間帯区分;
  readonly startTime: string;    // "08:00"
  readonly endTime: string;      // "12:00"
  readonly label: string;        // "3/26 午前"
  readonly isOrientation: boolean; // 業務オリエンテーション枠かどうか
  readonly staffRequirements: ReadonlyArray<StaffRequirementState>;
}

// ========== 必要人数クラス ==========

export class StaffRequirement_必要人数 {
  constructor(
    readonly state: StaffRequirementState,
    readonly timeSlotId: string
  ) {}

  get id(): string {
    return `${this.timeSlotId}_${this.state.roleId}`;
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
}

// ========== 時間帯クラス ==========

export class TimeSlot_時間帯 {
  private readonly _requirements: ReadonlyArray<StaffRequirement_必要人数>;

  constructor(readonly state: TimeSlotState) {
    this._requirements = state.staffRequirements.map(
      (req) => new StaffRequirement_必要人数(req, state.id)
    );
  }

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

  /** この時間帯の必要人数設定一覧 */
  get staffRequirements(): ReadonlyArray<StaffRequirement_必要人数> {
    return this._requirements;
  }

  /** 特定の係の必要人数を取得 */
  getRequirementForRole(roleId: string): StaffRequirement_必要人数 | undefined {
    return this._requirements.find((req) => req.roleId === roleId);
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

  /** 2025年学会のデフォルト時間帯を生成（必要人数データ含む） */
  static createDefaultTimeSlots(): TimeSlot_時間帯[] {
    // 通常の時間帯用の必要人数（会期中）
    const standardRequirements: StaffRequirementState[] = [
      { roleId: 'headquarters', requiredCount: 2, minCount: 2, maxCount: 3 },
      { roleId: 'reception', requiredCount: 3, minCount: 2, maxCount: 4 },
      { roleId: 'badge_reissue', requiredCount: 2, minCount: 1, maxCount: 3 },
      { roleId: 'cloakroom', requiredCount: 3, minCount: 2, maxCount: 4 },
      { roleId: 'venue', requiredCount: 4, minCount: 3, maxCount: 5 },
      { roleId: 'venue_check', requiredCount: 2, minCount: 1, maxCount: 3 },
      { roleId: 'preview_room', requiredCount: 2, minCount: 1, maxCount: 2 },
      { roleId: 'mobile_support', requiredCount: 2, minCount: 1, maxCount: 3 },
      { roleId: 'exhibition', requiredCount: 2, minCount: 1, maxCount: 3 },
      { roleId: 'poster', requiredCount: 2, minCount: 1, maxCount: 3 },
    ];

    // 準備日用の必要人数
    const prepRequirements: StaffRequirementState[] = [
      { roleId: 'headquarters', requiredCount: 2, minCount: 1, maxCount: 2 },
      { roleId: 'setup', requiredCount: 6, minCount: 4, maxCount: 8 },
    ];

    // 夕刻用の必要人数（少なめ）
    const eveningRequirements: StaffRequirementState[] = [
      { roleId: 'headquarters', requiredCount: 2, minCount: 1, maxCount: 2 },
      { roleId: 'reception', requiredCount: 2, minCount: 1, maxCount: 2 },
      { roleId: 'venue', requiredCount: 2, minCount: 1, maxCount: 3 },
      { roleId: 'mobile_support', requiredCount: 1, minCount: 1, maxCount: 2 },
    ];

    // 懇親会用の必要人数
    const partyRequirements: StaffRequirementState[] = [
      { roleId: 'party_cloakroom', requiredCount: 3, minCount: 2, maxCount: 4 },
      { roleId: 'party_reception', requiredCount: 4, minCount: 3, maxCount: 5 },
    ];

    // 撤去日用の必要人数
    const teardownRequirements: StaffRequirementState[] = [
      { roleId: 'headquarters', requiredCount: 2, minCount: 1, maxCount: 2 },
      { roleId: 'setup', requiredCount: 8, minCount: 6, maxCount: 10 },
    ];

    const slots: TimeSlotState[] = [
      // 3/17（月）準備日
      {
        id: '2025-03-17_all_day',
        date: '2025-03-17',
        period: 'all_day',
        startTime: '08:00',
        endTime: '17:00',
        label: '3/17 終日（準備）',
        isOrientation: false,
        staffRequirements: prepRequirements,
      },
      // 3/18（火）準備日
      {
        id: '2025-03-18_morning',
        date: '2025-03-18',
        period: 'morning',
        startTime: '08:00',
        endTime: '13:00',
        label: '3/18 午前',
        isOrientation: false,
        staffRequirements: prepRequirements,
      },
      {
        id: '2025-03-18_afternoon',
        date: '2025-03-18',
        period: 'afternoon',
        startTime: '13:00',
        endTime: '17:00',
        label: '3/18 午後（オリエン）',
        isOrientation: true,
        staffRequirements: prepRequirements,
      },
      // 3/19（水）会期1日目
      {
        id: '2025-03-19_morning',
        date: '2025-03-19',
        period: 'morning',
        startTime: '08:00',
        endTime: '12:00',
        label: '3/19 午前',
        isOrientation: false,
        staffRequirements: standardRequirements,
      },
      {
        id: '2025-03-19_afternoon',
        date: '2025-03-19',
        period: 'afternoon',
        startTime: '12:00',
        endTime: '17:00',
        label: '3/19 午後',
        isOrientation: false,
        staffRequirements: standardRequirements,
      },
      {
        id: '2025-03-19_evening',
        date: '2025-03-19',
        period: 'evening',
        startTime: '17:00',
        endTime: '20:00',
        label: '3/19 夕刻',
        isOrientation: false,
        staffRequirements: eveningRequirements,
      },
      // 3/20（木）会期2日目
      {
        id: '2025-03-20_morning',
        date: '2025-03-20',
        period: 'morning',
        startTime: '08:00',
        endTime: '12:00',
        label: '3/20 午前',
        isOrientation: false,
        staffRequirements: standardRequirements,
      },
      {
        id: '2025-03-20_afternoon',
        date: '2025-03-20',
        period: 'afternoon',
        startTime: '12:00',
        endTime: '17:00',
        label: '3/20 午後',
        isOrientation: false,
        staffRequirements: standardRequirements,
      },
      {
        id: '2025-03-20_evening',
        date: '2025-03-20',
        period: 'evening',
        startTime: '17:00',
        endTime: '20:00',
        label: '3/20 夕刻',
        isOrientation: false,
        staffRequirements: eveningRequirements,
      },
      {
        id: '2025-03-20_party',
        date: '2025-03-20',
        period: 'party',
        startTime: '17:00',
        endTime: '20:30',
        label: '3/20 交流会',
        isOrientation: false,
        staffRequirements: partyRequirements,
      },
      // 3/21（金）会期3日目
      {
        id: '2025-03-21_morning',
        date: '2025-03-21',
        period: 'morning',
        startTime: '08:00',
        endTime: '12:00',
        label: '3/21 午前',
        isOrientation: false,
        staffRequirements: standardRequirements,
      },
      {
        id: '2025-03-21_afternoon',
        date: '2025-03-21',
        period: 'afternoon',
        startTime: '12:00',
        endTime: '17:00',
        label: '3/21 午後',
        isOrientation: false,
        staffRequirements: standardRequirements,
      },
      {
        id: '2025-03-21_evening',
        date: '2025-03-21',
        period: 'evening',
        startTime: '17:00',
        endTime: '20:00',
        label: '3/21 夕刻',
        isOrientation: false,
        staffRequirements: eveningRequirements,
      },
      // 3/22（土）会期4日目（最終日）
      {
        id: '2025-03-22_morning',
        date: '2025-03-22',
        period: 'morning',
        startTime: '08:00',
        endTime: '12:00',
        label: '3/22 午前',
        isOrientation: false,
        staffRequirements: standardRequirements,
      },
      {
        id: '2025-03-22_afternoon',
        date: '2025-03-22',
        period: 'afternoon',
        startTime: '12:00',
        endTime: '17:00',
        label: '3/22 午後（撤去）',
        isOrientation: false,
        staffRequirements: teardownRequirements,
      },
    ];

    return slots.map((state) => new TimeSlot_時間帯(state));
  }
}
