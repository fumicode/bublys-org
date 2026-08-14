/**
 * TimeSchedule — 時間スケジュールマスター
 *
 * ShiftState の時間情報（dayType, startTime, endTime, weatherCondition）を切り出したクラス。
 * 複数の Shift が同じ時間帯を共有できる。
 */

import { type DayType, type WeatherCondition } from './Shift.js';

// ========== 型定義 ==========

export interface TimeScheduleState {
  readonly id: string;
  readonly dayType: DayType;
  readonly weatherCondition?: WeatherCondition;
  /** 開始時刻 "09:00" 形式 */
  readonly startTime: string;
  /** 終了時刻 "17:00" 形式 */
  readonly endTime: string;
}

// ========== ヘルパー ==========

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// ========== TimeSchedule クラス ==========

export class TimeSchedule {
  constructor(readonly state: TimeScheduleState) {}

  get id(): string { return this.state.id; }
  get dayType(): DayType { return this.state.dayType; }
  get weatherCondition(): WeatherCondition | undefined { return this.state.weatherCondition; }
  get startTime(): string { return this.state.startTime; }
  get endTime(): string { return this.state.endTime; }

  /** 開始時刻（分）。例: "09:00" → 540 */
  get startMinute(): number { return timeToMinutes(this.state.startTime); }

  /** 終了時刻（分）。例: "17:00" → 1020 */
  get endMinute(): number { return timeToMinutes(this.state.endTime); }

  /** 所要時間（分）。例: 9:00-17:00 → 480 */
  get durationMinutes(): number { return this.endMinute - this.startMinute; }

  /** 15分解像度での総ブロック数 */
  get totalBlocks(): number { return Math.ceil(this.durationMinutes / 15); }
}
