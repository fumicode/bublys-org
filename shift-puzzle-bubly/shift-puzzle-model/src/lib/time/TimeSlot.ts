/**
 * 時間帯ドメインモデル
 * gakkai-shiftのTimeSlot_時間帯を汎用化:
 *   - 粒度設定可能（5分〜1時間）
 *   - dayIndex で複数日に対応
 *   - startMinute: 0:00からの経過分数（連続時間軸のベース）
 */

// ========== 型定義 ==========

/** 時間帯の状態 */
export interface TimeSlotState {
  readonly id: string;
  readonly dayIndex: number;         // 0始まり（0 = イベント初日）
  readonly startMinute: number;      // 0:00からの経過分数（例: 9:30 = 570）
  readonly durationMinutes: number;  // スロット長（粒度に依存: 5〜60）
  readonly eventId: string;
}

/** Redux/JSON用のシリアライズ型 */
export type TimeSlotJSON = {
  id: string;
  dayIndex: number;
  startMinute: number;
  durationMinutes: number;
  eventId: string;
};

// ========== ドメインクラス ==========

export class TimeSlot {
  constructor(readonly state: TimeSlotState) {}

  get id(): string {
    return this.state.id;
  }

  get dayIndex(): number {
    return this.state.dayIndex;
  }

  get startMinute(): number {
    return this.state.startMinute;
  }

  get durationMinutes(): number {
    return this.state.durationMinutes;
  }

  get eventId(): string {
    return this.state.eventId;
  }

  /** 終了時刻（0:00からの経過分数） */
  get endMinute(): number {
    return this.state.startMinute + this.state.durationMinutes;
  }

  /** 開始時刻（時） */
  get startHour(): number {
    return Math.floor(this.state.startMinute / 60);
  }

  /** 開始時刻（分） */
  get startMinuteOfHour(): number {
    return this.state.startMinute % 60;
  }

  /** "HH:mm" 形式の開始時刻ラベル */
  get startTimeLabel(): string {
    const h = this.startHour.toString().padStart(2, '0');
    const m = this.startMinuteOfHour.toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  /** "HH:mm" 形式の終了時刻ラベル */
  get endTimeLabel(): string {
    const endMinute = this.endMinute;
    const h = Math.floor(endMinute / 60).toString().padStart(2, '0');
    const m = (endMinute % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  /** 別の時間帯と時間が重複するかどうか（同じdayIndexの場合のみ） */
  overlaps(other: TimeSlot): boolean {
    if (this.state.dayIndex !== other.state.dayIndex) return false;
    return this.state.startMinute < other.endMinute &&
           other.state.startMinute < this.endMinute;
  }

  /** ガントチャートのY座標を計算（hourPxベース） */
  toYPosition(hourPx: number): number {
    return this.state.startMinute * (hourPx / 60);
  }

  /** ガントチャートの高さを計算（hourPxベース） */
  toHeight(hourPx: number): number {
    return this.state.durationMinutes * (hourPx / 60);
  }

  toJSON(): TimeSlotJSON {
    return {
      id: this.state.id,
      dayIndex: this.state.dayIndex,
      startMinute: this.state.startMinute,
      durationMinutes: this.state.durationMinutes,
      eventId: this.state.eventId,
    };
  }

  static fromJSON(json: TimeSlotJSON): TimeSlot {
    return new TimeSlot(json);
  }

  /** 新しい時間帯を作成 */
  static create(
    data: Pick<TimeSlotState, 'dayIndex' | 'startMinute' | 'durationMinutes' | 'eventId'>
  ): TimeSlot {
    return new TimeSlot({
      id: crypto.randomUUID(),
      ...data,
    });
  }

  /** イベントの全時間帯スロットを一括生成 */
  static generateSlots(options: {
    eventId: string;
    dayCount: number;
    startMinute: number;   // 開始時刻（0:00からの経過分数）
    endMinute: number;     // 終了時刻（0:00からの経過分数）
    slotDuration: number;  // スロット長（分）
  }): TimeSlot[] {
    const slots: TimeSlot[] = [];
    for (let day = 0; day < options.dayCount; day++) {
      let current = options.startMinute;
      while (current + options.slotDuration <= options.endMinute) {
        slots.push(
          TimeSlot.create({
            eventId: options.eventId,
            dayIndex: day,
            startMinute: current,
            durationMinutes: options.slotDuration,
          })
        );
        current += options.slotDuration;
      }
    }
    return slots;
  }
}
