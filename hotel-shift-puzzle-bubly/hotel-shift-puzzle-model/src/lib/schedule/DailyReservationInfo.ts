/**
 * DailyReservationInfo — 勤務表ごとの「稼働日ごとの予約・稼働情報」
 *
 * 元 Excel の日付ヘッダより上のブロックに対応する。中 / 夕 / 泊 の3グループがあり、
 * それぞれ「宿泊人数」「部屋数」を持つ。さらに 婚礼（件数）と 備考（フリーテキスト）を持つ。
 * 勤務表に紐づく別集約（id は scheduleId を兼ねる）。ただしこれは「実際の予約」という外部の
 * 実データなので、勤務表のローカル世界線には相乗りさせない（登録側 hotelObjects の localScope で決める）。
 *
 * 【店ごとの付け替えについて】
 * 「稼働日ごとに何を記録するか」は店によって全く違う。ここでは汎用のフィールド束にはせず、
 * ホテルの元表（中・夕・泊の宿泊人数/部屋数・婚礼・備考）を素直に具体化している。別の店で
 * 違う項目が要るときは、この集約と対の UI をその店用の具体モジュールとして差し替える。
 *
 * 不変。更新メソッドは新しいインスタンスを返す。
 */
import { WorkingDay } from "./WorkingDay.js";

/** 中/夕/泊 の各グループが持つ値 */
export type GuestsRooms = {
  /** 宿泊人数 */
  guests?: number;
  /** 部屋数 */
  rooms?: number;
};

/** 宿泊人数・部屋数を持つグループ（中 / 夕 / 泊） */
export type ReservationGroup = "naka" | "yu" | "haku";
/** グループ内のフィールド */
export type GuestsRoomsField = "guests" | "rooms";

/** 稼働日1日ぶんの予約・稼働情報（未入力の項目は undefined） */
export type DailyReservationInfoEntry = {
  /** 中（役割不明。宿泊人数・部屋数を持つ） */
  naka?: GuestsRooms;
  /** 夕（役割不明。宿泊人数・部屋数を持つ） */
  yu?: GuestsRooms;
  /** 泊（宿泊人数・部屋数を持つ） */
  haku?: GuestsRooms;
  /** 婚礼（フリーテキスト。件名・時間など） */
  weddings?: string;
  /** 備考（フリーテキスト） */
  note?: string;
};

export type DailyReservationInfoState = {
  /** 紐づく勤務表ID（この集約のIDも兼ねる：1勤務表=1予約・稼働情報） */
  scheduleId: string;
  /** 稼働日キー("2026-06-01") → その日の情報 */
  byDay: Record<string, DailyReservationInfoEntry>;
};

/** シリアライズ用（state がそのまま plain） */
export type DailyReservationInfoPlain = DailyReservationInfoState;

const cloneGroup = (g: GuestsRooms | undefined): GuestsRooms | undefined =>
  g ? { ...g } : undefined;

const cloneEntry = (e: DailyReservationInfoEntry): DailyReservationInfoEntry => ({
  naka: cloneGroup(e.naka),
  yu: cloneGroup(e.yu),
  haku: cloneGroup(e.haku),
  weddings: e.weddings,
  note: e.note,
});

const cloneByDay = (
  byDay: Record<string, DailyReservationInfoEntry>
): Record<string, DailyReservationInfoEntry> => {
  const out: Record<string, DailyReservationInfoEntry> = {};
  for (const [dayKey, entry] of Object.entries(byDay)) out[dayKey] = cloneEntry(entry);
  return out;
};

/** 入力値を「0以上の整数」または undefined（未入力）に正規化する */
const normalize = (value: number | undefined): number | undefined => {
  if (value === undefined || Number.isNaN(value)) return undefined;
  return Math.max(0, Math.round(value));
};

const isEmptyGroup = (g: GuestsRooms | undefined): boolean =>
  !g || (g.guests === undefined && g.rooms === undefined);

/** その日のエントリが実質空か（全グループ空・婚礼なし・備考なし） */
const isEmptyEntry = (e: DailyReservationInfoEntry): boolean =>
  isEmptyGroup(e.naka) &&
  isEmptyGroup(e.yu) &&
  isEmptyGroup(e.haku) &&
  (e.weddings === undefined || e.weddings === "") &&
  (e.note === undefined || e.note === "");

export class DailyReservationInfo {
  constructor(readonly state: DailyReservationInfoState) {}

  /** 何も入力されていない情報を作る */
  static empty(scheduleId: string): DailyReservationInfo {
    return new DailyReservationInfo({ scheduleId, byDay: {} });
  }

  get id(): string {
    return this.state.scheduleId;
  }

  get scheduleId(): string {
    return this.state.scheduleId;
  }

  /** その稼働日の情報（未入力は空オブジェクト） */
  entryOn(day: WorkingDay): DailyReservationInfoEntry {
    return this.state.byDay[day.key] ?? {};
  }

  // ---- グループ（中/夕/泊）の宿泊人数・部屋数 ----
  /** その稼働日・グループ・フィールドの値（未入力は undefined） */
  numberOn(
    day: WorkingDay,
    group: ReservationGroup,
    field: GuestsRoomsField
  ): number | undefined {
    return this.state.byDay[day.key]?.[group]?.[field];
  }

  /** その稼働日・グループ・フィールドを設定した新インスタンスを返す。不変。undefined で未入力に戻す。 */
  setNumber(
    day: WorkingDay,
    group: ReservationGroup,
    field: GuestsRoomsField,
    value: number | undefined
  ): DailyReservationInfo {
    const byDay = cloneByDay(this.state.byDay);
    const entry = { ...(byDay[day.key] ?? {}) };
    const g: GuestsRooms = { ...(entry[group] ?? {}) };
    const v = normalize(value);
    if (v === undefined) delete g[field];
    else g[field] = v;
    if (isEmptyGroup(g)) delete entry[group];
    else entry[group] = g;
    if (isEmptyEntry(entry)) delete byDay[day.key];
    else byDay[day.key] = entry;
    return new DailyReservationInfo({ ...this.state, byDay });
  }

  // ---- 婚礼（フリーテキスト） ----
  weddingsOn(day: WorkingDay): string | undefined {
    return this.state.byDay[day.key]?.weddings;
  }

  setWeddings(day: WorkingDay, value: string | undefined): DailyReservationInfo {
    const byDay = cloneByDay(this.state.byDay);
    const entry = { ...(byDay[day.key] ?? {}) };
    const text = value?.trim() ? value : undefined;
    if (text === undefined) delete entry.weddings;
    else entry.weddings = text;
    if (isEmptyEntry(entry)) delete byDay[day.key];
    else byDay[day.key] = entry;
    return new DailyReservationInfo({ ...this.state, byDay });
  }

  // ---- 備考（フリーテキスト） ----
  noteOn(day: WorkingDay): string | undefined {
    return this.state.byDay[day.key]?.note;
  }

  setNote(day: WorkingDay, value: string | undefined): DailyReservationInfo {
    const byDay = cloneByDay(this.state.byDay);
    const entry = { ...(byDay[day.key] ?? {}) };
    const text = value?.trim() ? value : undefined;
    if (text === undefined) delete entry.note;
    else entry.note = text;
    if (isEmptyEntry(entry)) delete byDay[day.key];
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
