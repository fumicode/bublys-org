/**
 * タイムラインスケール ドメインモデル
 *
 * TimeSlot群のstartTime/endTime/dateデータを利用し、
 * ピクセル座標と時刻の相互変換を行う不変値オブジェクト。
 */

import { TimeSlot_時間帯 } from "../master/TimeSlot_時間帯.js";

// ========== 型定義 ==========

export interface TimelineScaleState {
  /** 日付ごとの開始・終了時刻（分単位） */
  readonly days: ReadonlyArray<{
    readonly date: string;
    readonly startMinutes: number;
    readonly endMinutes: number;
  }>;
  /** 1時間あたりのピクセル数 */
  readonly pixelsPerHour: number;
  /** 日付間のギャップ（ピクセル） */
  readonly dayGap: number;
}

export interface BarRect {
  readonly x: number;
  readonly width: number;
}

export interface DayBoundary {
  readonly date: string;
  readonly x: number;
  readonly width: number;
}

// ========== クラス ==========

export class TimelineScale_タイムラインスケール {
  constructor(readonly state: TimelineScaleState) {}

  get pixelsPerHour(): number {
    return this.state.pixelsPerHour;
  }

  get totalWidth(): number {
    const { days, pixelsPerHour, dayGap } = this.state;
    if (days.length === 0) return 0;
    let total = 0;
    for (const day of days) {
      const durationMinutes = day.endMinutes - day.startMinutes;
      total += (durationMinutes / 60) * pixelsPerHour;
    }
    total += (days.length - 1) * dayGap;
    return total;
  }

  /**
   * 時刻→ピクセル変換
   * @param date "YYYY-MM-DD"
   * @param time "HH:MM"
   */
  timeToPixel(date: string, time: string): number {
    const { days, pixelsPerHour, dayGap } = this.state;
    const targetMinutes = parseTime(time);

    let offset = 0;
    for (const day of days) {
      if (day.date === date) {
        const minutesFromStart = targetMinutes - day.startMinutes;
        return offset + (minutesFromStart / 60) * pixelsPerHour;
      }
      const dayWidth = ((day.endMinutes - day.startMinutes) / 60) * pixelsPerHour;
      offset += dayWidth + dayGap;
    }

    // 日付が見つからない場合は末尾を返す
    return offset;
  }

  /**
   * ピクセル→時刻変換
   */
  pixelToTime(px: number): { date: string; time: string } {
    const { days, pixelsPerHour, dayGap } = this.state;
    const clampedPx = Math.max(0, px);

    let offset = 0;
    for (const day of days) {
      const dayWidth = ((day.endMinutes - day.startMinutes) / 60) * pixelsPerHour;
      if (clampedPx < offset + dayWidth + dayGap / 2 || day === days[days.length - 1]) {
        const pxInDay = Math.max(0, Math.min(clampedPx - offset, dayWidth));
        const minutesFromStart = (pxInDay / pixelsPerHour) * 60;
        const totalMinutes = day.startMinutes + minutesFromStart;
        return {
          date: day.date,
          time: formatMinutes(totalMinutes),
        };
      }
      offset += dayWidth + dayGap;
    }

    // fallback（空のdays）
    return { date: "", time: "00:00" };
  }

  /**
   * TimeSlotのバー矩形を取得
   */
  getBarRect(timeSlot: TimeSlot_時間帯): BarRect {
    const x = this.timeToPixel(timeSlot.date, timeSlot.state.startTime);
    const xEnd = this.timeToPixel(timeSlot.date, timeSlot.state.endTime);
    return { x, width: xEnd - x };
  }

  /**
   * 日付境界線の位置を取得
   */
  getDayBoundaries(): DayBoundary[] {
    const { days, pixelsPerHour, dayGap } = this.state;
    const boundaries: DayBoundary[] = [];
    let offset = 0;

    for (const day of days) {
      const dayWidth = ((day.endMinutes - day.startMinutes) / 60) * pixelsPerHour;
      boundaries.push({
        date: day.date,
        x: offset,
        width: dayWidth,
      });
      offset += dayWidth + dayGap;
    }

    return boundaries;
  }

  /**
   * 指定ピクセル位置に最も近いTimeSlotを特定
   */
  findClosestTimeSlot(px: number, timeSlots: readonly TimeSlot_時間帯[]): TimeSlot_時間帯 | undefined {
    const { date, time } = this.pixelToTime(px);
    const targetMinutes = parseTime(time);

    // 同じ日付のTimeSlotを候補として取得
    const sameDaySlots = timeSlots.filter((ts) => ts.date === date);
    if (sameDaySlots.length === 0) return undefined;

    // 時刻が範囲内に収まるTimeSlotを探す
    for (const slot of sameDaySlots) {
      const slotStart = parseTime(slot.state.startTime);
      const slotEnd = parseTime(slot.state.endTime);
      if (targetMinutes >= slotStart && targetMinutes < slotEnd) {
        return slot;
      }
    }

    // 範囲外の場合は最も近いものを返す
    let closest: TimeSlot_時間帯 | undefined;
    let minDistance = Infinity;
    for (const slot of sameDaySlots) {
      const slotStart = parseTime(slot.state.startTime);
      const slotEnd = parseTime(slot.state.endTime);
      const slotMid = (slotStart + slotEnd) / 2;
      const distance = Math.abs(targetMinutes - slotMid);
      if (distance < minDistance) {
        minDistance = distance;
        closest = slot;
      }
    }
    return closest;
  }

  /**
   * TimeSlot群からTimelineScaleを自動生成
   */
  static fromTimeSlots(
    timeSlots: readonly TimeSlot_時間帯[],
    pixelsPerHour = 40,
    dayGap = 16,
  ): TimelineScale_タイムラインスケール {
    // 日付ごとにグループ化
    const byDate = new Map<string, { startMinutes: number; endMinutes: number }>();

    for (const slot of timeSlots) {
      const start = parseTime(slot.state.startTime);
      const end = parseTime(slot.state.endTime);
      const existing = byDate.get(slot.date);
      if (existing) {
        existing.startMinutes = Math.min(existing.startMinutes, start);
        existing.endMinutes = Math.max(existing.endMinutes, end);
      } else {
        byDate.set(slot.date, { startMinutes: start, endMinutes: end });
      }
    }

    // 日付順にソート
    const days = [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, range]) => ({
        date,
        startMinutes: range.startMinutes,
        endMinutes: range.endMinutes,
      }));

    return new TimelineScale_タイムラインスケール({
      days,
      pixelsPerHour,
      dayGap,
    });
  }
}

// ========== ヘルパー ==========

/** "HH:MM" → 分 */
function parseTime(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** 分 → "HH:MM" */
function formatMinutes(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(totalMinutes, 24 * 60 - 1));
  const h = Math.floor(clamped / 60);
  const m = Math.floor(clamped % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
