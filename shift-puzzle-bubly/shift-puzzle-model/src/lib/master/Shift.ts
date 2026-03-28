/**
 * Shift — 第一級エンティティ（永続化する）
 *
 * 「いつ・何の役割を・何人で担当するか」を直接持つユーザー操作対象。
 * TimeSlot + TaskRequirement の組み合わせから独立した独自エンティティ。
 */

// ========== 型定義 ==========

/** 日種別（5日分） */
export type DayType = '準準備日' | '準備日' | '1日目' | '2日目' | '片付け日';

/** 天候条件 */
export type WeatherCondition = '晴れ' | '雨';

/** シフトの状態 */
export interface ShiftState {
  readonly id: string;
  readonly taskId: string;
  readonly dayType: DayType;
  readonly weatherCondition?: WeatherCondition;
  readonly startTime: string;      // "09:30"
  readonly endTime: string;        // "12:00"
  readonly requiredCount: number;
  readonly minCount: number;
  readonly maxCount: number;
  readonly label?: string;         // 表示ラベル（省略時は taskName を使う）
  // 表示用に非正規化されたタスク情報
  readonly taskName?: string;
  readonly responsibleDepartment?: string;
}

/** シフトビューモデル */
export interface ShiftView {
  readonly id: string;
  readonly taskId: string;
  readonly dayType: DayType;
  readonly startTime: string;
  readonly endTime: string;
  readonly startMinute: number;
  readonly durationMinutes: number;
  readonly taskName: string;
  readonly responsibleDepartment: string;
  readonly requiredCount: number;
  readonly minCount: number;
  readonly maxCount: number;
}

// ========== ヘルパー ==========

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// ========== Shift クラス ==========

export class Shift {
  constructor(readonly state: ShiftState) {}

  get id(): string { return this.state.id; }
  get taskId(): string { return this.state.taskId; }
  get dayType(): DayType { return this.state.dayType; }
  get weatherCondition(): WeatherCondition | undefined { return this.state.weatherCondition; }
  get startTime(): string { return this.state.startTime; }
  get endTime(): string { return this.state.endTime; }

  /** 開始時刻（分）。例: "09:00" → 540 */
  get startMinute(): number { return timeToMinutes(this.state.startTime); }

  /** 終了時刻（分）。例: "17:00" → 1020 */
  get endMinute(): number { return timeToMinutes(this.state.endTime); }

  /** 所要時間（分）。例: 9:00-12:00 → 180 */
  get durationMinutes(): number { return this.endMinute - this.startMinute; }

  get requiredCount(): number { return this.state.requiredCount; }
  get minCount(): number { return this.state.minCount; }
  get maxCount(): number { return this.state.maxCount; }

  /** 表示名（label > taskName > taskId の優先順） */
  get taskName(): string {
    return this.state.label ?? this.state.taskName ?? this.state.taskId;
  }

  get responsibleDepartment(): string {
    return this.state.responsibleDepartment ?? '';
  }

  /** Drag識別子 = shift.id（シンプル化） */
  get dragId(): string { return this.state.id; }

  /** ビューモデルに変換 */
  toView(): ShiftView {
    return {
      id: this.id,
      taskId: this.taskId,
      dayType: this.dayType,
      startTime: this.startTime,
      endTime: this.endTime,
      startMinute: this.startMinute,
      durationMinutes: this.durationMinutes,
      taskName: this.taskName,
      responsibleDepartment: this.responsibleDepartment,
      requiredCount: this.requiredCount,
      minCount: this.minCount,
      maxCount: this.maxCount,
    };
  }
}
