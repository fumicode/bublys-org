/**
 * DailyReservationInfo — 勤務表ごとの「稼働日ごとの予約状況」
 *
 * ある勤務表（シフト表）について、稼働日ごとに「宿泊人数」「部屋数」を持つ。
 * 勤務表に紐づく別集約（id は scheduleId を兼ねる）。ただし予約状況は「実際の予約」という
 * 外部の実データであり、シフト作成の試行錯誤とは別物なので、勤務表のローカル世界線には
 * 相乗りさせない（時間移動で予約状況が変わったり戻ったりしない）。世界線の束ねは
 * オブジェクト登録側（hotelObjects の localScope）で決める。
 *
 * 【店ごとの付け替えについて】
 * 「稼働日ごとに何を記録するか」は店によって全く違う。ここでは "汎用の数値フィールド束" のような
 * 制約付きの汎用は作らず、ホテルの要件（宿泊人数・部屋数）を素直に具体化している。
 * 別の店で違う項目が要るときは、この集約と対の UI（ReservationInfoRows / ScheduleReservationInfoView）を
 * その店用の具体モジュールとして差し替える。＝付け替えの境界は「モジュール」で、ランタイム設定ではない。
 *
 * 不変。更新メソッドは新しいインスタンスを返す。
 */
import { WorkingDay } from "./WorkingDay.js";

/** 稼働日1日ぶんの予約状況（未入力の項目は undefined） */
export type DailyReservationInfoEntry = {
  /** 宿泊人数 */
  guests?: number;
  /** 部屋数 */
  rooms?: number;
};

export type DailyReservationInfoState = {
  /** 紐づく勤務表ID（この集約のIDも兼ねる：1勤務表=1予約状況） */
  scheduleId: string;
  /** 稼働日キー("2026-06-01") → その日の予約状況 */
  byDay: Record<string, DailyReservationInfoEntry>;
};

/** シリアライズ用（state がそのまま plain） */
export type DailyReservationInfoPlain = DailyReservationInfoState;

const cloneByDay = (
  byDay: Record<string, DailyReservationInfoEntry>
): Record<string, DailyReservationInfoEntry> => {
  const out: Record<string, DailyReservationInfoEntry> = {};
  for (const [dayKey, entry] of Object.entries(byDay)) out[dayKey] = { ...entry };
  return out;
};

/** 入力値を「0以上の整数」または undefined（未入力）に正規化する */
const normalize = (value: number | undefined): number | undefined => {
  if (value === undefined || Number.isNaN(value)) return undefined;
  const n = Math.max(0, Math.round(value));
  return n;
};

export class DailyReservationInfo {
  constructor(readonly state: DailyReservationInfoState) {}

  /** 何も入力されていない予約状況を作る */
  static empty(scheduleId: string): DailyReservationInfo {
    return new DailyReservationInfo({ scheduleId, byDay: {} });
  }

  get id(): string {
    return this.state.scheduleId;
  }

  get scheduleId(): string {
    return this.state.scheduleId;
  }

  /** その稼働日の予約状況（未入力は空オブジェクト） */
  entryOn(day: WorkingDay): DailyReservationInfoEntry {
    return this.state.byDay[day.key] ?? {};
  }

  /** その稼働日の宿泊人数（未入力は undefined） */
  guestsOn(day: WorkingDay): number | undefined {
    return this.state.byDay[day.key]?.guests;
  }

  /** その稼働日の部屋数（未入力は undefined） */
  roomsOn(day: WorkingDay): number | undefined {
    return this.state.byDay[day.key]?.rooms;
  }

  /** その稼働日の宿泊人数を設定した新インスタンスを返す。不変。undefined で未入力に戻す。 */
  setGuests(day: WorkingDay, value: number | undefined): DailyReservationInfo {
    return this.setField(day, "guests", value);
  }

  /** その稼働日の部屋数を設定した新インスタンスを返す。不変。undefined で未入力に戻す。 */
  setRooms(day: WorkingDay, value: number | undefined): DailyReservationInfo {
    return this.setField(day, "rooms", value);
  }

  private setField(
    day: WorkingDay,
    field: keyof DailyReservationInfoEntry,
    value: number | undefined
  ): DailyReservationInfo {
    const byDay = cloneByDay(this.state.byDay);
    const entry = { ...(byDay[day.key] ?? {}) };
    const v = normalize(value);
    if (v === undefined) delete entry[field];
    else entry[field] = v;
    // 両項目とも未入力になったら、その日ごと取り除いて疎に保つ
    if (entry.guests === undefined && entry.rooms === undefined) delete byDay[day.key];
    else byDay[day.key] = entry;
    return new DailyReservationInfo({ ...this.state, byDay });
  }

  toPlain(): DailyReservationInfoPlain {
    return { scheduleId: this.state.scheduleId, byDay: cloneByDay(this.state.byDay) };
  }

  static fromPlain(plain: DailyReservationInfoPlain | undefined): DailyReservationInfo {
    if (!plain) return DailyReservationInfo.empty("");
    return new DailyReservationInfo({
      scheduleId: plain.scheduleId,
      byDay: cloneByDay(plain.byDay ?? {}),
    });
  }
}
