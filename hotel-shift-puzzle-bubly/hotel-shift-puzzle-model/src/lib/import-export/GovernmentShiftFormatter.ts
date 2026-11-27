/**
 * GovernmentShiftFormatter — 行政版シフト表のエクスポート
 *
 * ドメインオブジェクト（勤務割当・シフト希望・確定休み）を、
 * 元のCSV/Excelと同じ体裁の2次元文字列配列に変換する。
 *
 * GovernmentShiftParser の逆。純粋関数。React も Redux も import しない。
 */

import { WorkingDay } from "../schedule/WorkingDay.js";
import { DAY_OFF, type ShiftValue } from "../schedule/ShiftAssignment.js";
import type { ShiftWishPreference } from "../schedule/StaffMonthlyShiftWish.js";
import type { SchedulePeriod } from "../schedule/SchedulePeriod.js";
import type { SymbolMapping } from "./SymbolMapping.js";

// ========== 和暦生成 ==========

/** WorkingDay → "令和○年○月○日" */
export function toWareki(day: WorkingDay): string {
  const reiwaYear = day.year - 2018;
  return `令和${reiwaYear}年${day.month}月${day.day}日`;
}

// ========== 曜日 ==========

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

// ========== 入力型 ==========

export type StaffRow = {
  rowNumber: number | undefined;
  subNumber: number | undefined;
  name: string;
  staffId: string;
};

export type FormatInput = {
  title: string;
  period: SchedulePeriod;
  days: WorkingDay[];
  staffRows: StaffRow[];
  /** セルの勤務割当を返す（feature層が注入） */
  shiftValueOf: (staffId: string, dayKey: string) => ShiftValue;
  /** その日のシフト希望を返す（feature層が注入）。エクスポートでは使わない（インポートのラウンドトリップテスト用） */
  wishesOf?: (staffId: string, dayKey: string) => Record<string, ShiftWishPreference>;
  /** 確定休みの短縮名（"週" / "祝" / "休" 等）を返す（feature層が注入） */
  dayOffReasonOf: (staffId: string, dayKey: string) => string | undefined;
  /** 勤務帯ID → 勤務帯名（エクスポート時の逆引きに使う。省略時は shiftId をそのまま返す） */
  shiftNameOf?: (shiftId: string) => string | undefined;
};

// ========== フォーマッタ ==========

/**
 * ドメインオブジェクトを2次元文字列配列に変換する。
 * 生成する配列の体裁は GovernmentShiftParser がパースするCSVと同じ。
 */
export function formatGovernmentShift(
  input: FormatInput,
  mapping: SymbolMapping,
): string[][] {
  const { days } = input;
  const grid: string[][] = [];

  // 行0: タイトル行
  grid.push(buildTitleRow(input.title, days.length));

  // 行1: 空行
  grid.push(buildEmptyRow(days.length));

  // 行2: 六曜行（プレースホルダ）
  grid.push(buildRokuyoRow(days.length));

  // 行3: 日付行
  grid.push(buildDayRow(input.period, days));

  // 行4: 曜日行
  grid.push(buildWeekdayRow(input.period, days));

  // 行5〜N: スタッフ行
  for (const staff of input.staffRows) {
    grid.push(buildStaffRow(staff, days, input, mapping));
  }

  // 行N+1〜: 集計行
  grid.push(...buildAggregateRows(input, days, mapping));

  return grid;
}

// ========== ヘッダー行 ==========

/** ヘッダー列の数（番号, サブ番号, 空, 名前 = 4列） */
const HEADER_COLS = 4;

function rowWidth(dayCount: number): number {
  return HEADER_COLS + dayCount;
}

function buildTitleRow(title: string, dayCount: number): string[] {
  const row = new Array(rowWidth(dayCount)).fill("");
  row[1] = title;
  return row;
}

function buildEmptyRow(dayCount: number): string[] {
  return new Array(rowWidth(dayCount)).fill("");
}

function buildRokuyoRow(dayCount: number): string[] {
  const row = new Array(rowWidth(dayCount)).fill("");
  row[1] = "六曜・特異日等";
  return row;
}

function buildDayRow(period: SchedulePeriod, days: WorkingDay[]): string[] {
  const row = new Array(rowWidth(days.length)).fill("");
  row[1] = "R";
  const reiwaYear = String(days[0].year - 2018);
  row[2] = reiwaYear;

  // 月ラベル: "10-11月" のように月の範囲を書く
  const startMonth = days[0].month;
  const endMonth = days[days.length - 1].month;
  row[3] = startMonth === endMonth
    ? `${startMonth}月`
    : `${startMonth}-${endMonth}月`;

  for (let i = 0; i < days.length; i++) {
    row[HEADER_COLS + i] = String(days[i].day);
  }
  return row;
}

function buildWeekdayRow(_period: SchedulePeriod, days: WorkingDay[]): string[] {
  const row = new Array(rowWidth(days.length)).fill("");
  row[1] = String(days[0].year - 2018);
  for (let i = 0; i < days.length; i++) {
    row[HEADER_COLS + i] = WEEKDAY_LABELS[days[i].weekday];
  }
  return row;
}

// ========== スタッフ行 ==========

function buildStaffRow(
  staff: StaffRow,
  days: WorkingDay[],
  input: FormatInput,
  mapping: SymbolMapping,
): string[] {
  const row = new Array(rowWidth(days.length)).fill("");

  // ヘッダー列
  if (staff.rowNumber !== undefined) row[1] = String(staff.rowNumber);
  if (staff.subNumber !== undefined) row[2] = String(staff.subNumber);
  row[3] = staff.name;

  // セル値
  for (let i = 0; i < days.length; i++) {
    row[HEADER_COLS + i] = cellValueFor(
      staff.staffId,
      days[i].key,
      input,
      mapping,
    );
  }

  return row;
}

/**
 * 1セルの出力値を決める。
 * エクスポートは確定した勤務表の出力なので、希望は出さない。
 * 優先順: 確定した勤務割当 > 確定休み > 空欄
 */
function cellValueFor(
  staffId: string,
  dayKey: string,
  input: FormatInput,
  mapping: SymbolMapping,
): string {
  const shiftValue = input.shiftValueOf(staffId, dayKey);

  // 確定した割当がある場合
  if (shiftValue === DAY_OFF) {
    const reason = input.dayOffReasonOf(staffId, dayKey);
    if (reason) {
      return mapping.symbolForWish(`day-off:${reason}`) ?? reason;
    }
    return "";
  }

  if (shiftValue !== null) {
    // 勤務帯ID → option key ("work:<name>") → 記号の逆引き
    const shiftName = input.shiftNameOf?.(shiftValue);
    const optionKey = shiftName ? `work:${shiftName}` : undefined;
    return (optionKey && mapping.symbolForWish(optionKey)) ?? shiftValue;
  }

  // 未定の場合、確定休みを見る
  const dayOffReason = input.dayOffReasonOf(staffId, dayKey);
  if (dayOffReason) {
    return mapping.symbolForWish(`day-off:${dayOffReason}`) ?? dayOffReason;
  }

  return "";
}

// ========== 集計行 ==========

function buildAggregateRows(
  input: FormatInput,
  days: WorkingDay[],
  mapping: SymbolMapping,
): string[][] {
  const rows: string[][] = [];

  // 日ごとの出勤人数
  const countRow = new Array(rowWidth(days.length)).fill("");
  countRow[1] = "集計";
  countRow[3] = "出勤";

  for (let i = 0; i < days.length; i++) {
    let workingCount = 0;
    for (const staff of input.staffRows) {
      const val = input.shiftValueOf(staff.staffId, days[i].key);
      if (val !== null && val !== DAY_OFF) {
        workingCount++;
      }
    }
    countRow[HEADER_COLS + i] = String(workingCount);
  }
  rows.push(countRow);

  return rows;
}
