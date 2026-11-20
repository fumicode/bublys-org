/**
 * GovernmentShiftParser — 行政版シフトCSV/Excelの構造解析
 *
 * 「表計算ソフトの見た目をそのままCSV化した」行政版シフト表から、
 * スタッフ一覧・期間・各セルの記号を抽出する。
 *
 * 固定パース:
 *   - ヘッダーは先頭数行にタイトル・六曜・日付・曜日がある
 *   - スタッフ行はヘッダーの直後から始まり、「集計」行の前まで
 *   - 右端に凡例・集計列がある
 *
 * 純粋関数。React も Redux も import しない。
 */

import { WorkingDay } from "../schedule/WorkingDay.js";
import { FourWeekPeriod, type SchedulePeriod } from "../schedule/SchedulePeriod.js";

// ========== パース結果 ==========

export type StaffEntry = {
  /** 行番号（CSV/Excelの行。表示上の番号があればそれ、なければ通し番号） */
  rowNumber: number | undefined;
  /** グループ内番号（会計年度任用の場合。正規職員は undefined） */
  subNumber: number | undefined;
  /** スタッフ名（イニシャル。例: "W　Ｙ"） */
  name: string;
  /** 日ごとの記号（稼働日のキー → セルの生の文字列） */
  cellsByDay: ReadonlyMap<string, string>;
};

export type GovernmentShiftImportData = {
  /** 期間（SchedulePeriod）。タイトルから読み取れた場合 */
  period: SchedulePeriod | undefined;
  /** タイトル文字列（"令和８年10月25日～令和８年11月21日　市民課窓口班（審査担当）シフト"） */
  title: string;
  /** 日付の列（稼働日の配列、左から右の順） */
  days: WorkingDay[];
  /** スタッフ行のデータ */
  staffEntries: StaffEntry[];
};

// ========== 全角→半角変換 ==========

/** 全角数字（０-９）を半角に変換する */
function normalizeDigits(text: string): string {
  return text.replace(/[０-９]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30),
  );
}

// ========== 和暦パース ==========

/** "令和８年10月25日" → WorkingDay（全角数字にも対応） */
export function parseWareki(text: string): WorkingDay | undefined {
  const normalized = normalizeDigits(text);
  const match = normalized.match(/令和(\d+)年(\d+)月(\d+)日/);
  if (!match) return undefined;
  const reiwaYear = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const year = reiwaYear + 2018;
  return WorkingDay.of(year, month, day);
}

/** タイトルから期間（開始日〜終了日）を読む */
export function parsePeriodFromTitle(
  title: string,
): { start: WorkingDay; end: WorkingDay } | undefined {
  const normalized = normalizeDigits(title);
  const match = normalized.match(
    /令和(\d+)年(\d+)月(\d+)日[～〜]令和(\d+)年(\d+)月(\d+)日/,
  );
  if (!match) return undefined;
  const start = WorkingDay.of(
    Number(match[1]) + 2018,
    Number(match[2]),
    Number(match[3]),
  );
  const end = WorkingDay.of(
    Number(match[4]) + 2018,
    Number(match[5]),
    Number(match[6]),
  );
  return { start, end };
}

// ========== 行の種別判定 ==========

/** 日付行を探す: 数字（日）が並ぶ行 */
function isDayRow(row: string[]): boolean {
  let numericCount = 0;
  for (const cell of row) {
    if (/^\d{1,2}$/.test(cell.trim())) numericCount++;
  }
  return numericCount >= 14;
}

/** 曜日行を探す: 曜日が並ぶ行 */
function isWeekdayRow(row: string[]): boolean {
  const weekdays = new Set(["日", "月", "火", "水", "木", "金", "土"]);
  let count = 0;
  for (const cell of row) {
    if (weekdays.has(cell.trim())) count++;
  }
  return count >= 7;
}

/** 集計行の開始を検出する */
function isAggregateRow(row: string[]): boolean {
  return row.some((cell) => cell.trim() === "集計");
}

// ========== メインのパーサー ==========

/**
 * 2次元文字列配列（CSV/Excelから読んだもの）をパースして、
 * 行政版シフト表の構造化データを返す。
 */
export function parseGovernmentShift(
  grid: string[][],
): GovernmentShiftImportData {
  if (grid.length === 0) {
    return { period: undefined, title: "", days: [], staffEntries: [] };
  }

  // --- タイトルを探す ---
  let title = "";
  let periodRange: { start: WorkingDay; end: WorkingDay } | undefined;
  for (const row of grid.slice(0, 5)) {
    const joined = row.join("");
    const range = parsePeriodFromTitle(joined);
    if (range) {
      periodRange = range;
      title = joined.trim();
      break;
    }
  }

  // --- 日付行・曜日行を探す ---
  let dayRowIndex = -1;
  let weekdayRowIndex = -1;

  for (let i = 0; i < Math.min(grid.length, 10); i++) {
    if (dayRowIndex === -1 && isDayRow(grid[i])) {
      dayRowIndex = i;
    }
    if (weekdayRowIndex === -1 && isWeekdayRow(grid[i])) {
      weekdayRowIndex = i;
    }
  }

  if (dayRowIndex === -1) {
    return { period: undefined, title, days: [], staffEntries: [] };
  }

  // --- 日付列のマッピング（列インデックス → WorkingDay） ---
  const dayRow = grid[dayRowIndex];
  const columnDays = buildColumnDays(dayRow, periodRange);

  // 有効な日付列のインデックス範囲
  const dayColumns: { colIndex: number; day: WorkingDay }[] = [];
  for (let col = 0; col < columnDays.length; col++) {
    if (columnDays[col]) {
      dayColumns.push({ colIndex: col, day: columnDays[col]! });
    }
  }

  const days = dayColumns.map((dc) => dc.day);

  // --- 期間を推定 ---
  let period: SchedulePeriod | undefined;
  if (days.length > 0) {
    const start = days[0];
    const end = days[days.length - 1];
    const span = end.daysSince(start) + 1;
    if (span === 28) {
      period = new FourWeekPeriod({ start });
    }
  }

  // --- スタッフ行の範囲を決める ---
  const staffStartRow = Math.max(dayRowIndex, weekdayRowIndex) + 1;
  let staffEndRow = grid.length;
  for (let i = staffStartRow; i < grid.length; i++) {
    if (isAggregateRow(grid[i])) {
      staffEndRow = i;
      break;
    }
  }

  // --- スタッフ行をパース ---
  const staffEntries: StaffEntry[] = [];
  for (let i = staffStartRow; i < staffEndRow; i++) {
    const row = grid[i];
    const entry = parseStaffRow(row, dayColumns);
    if (entry) {
      staffEntries.push(entry);
    }
  }

  return { period, title, days, staffEntries };
}

// ========== 内部ヘルパー ==========

/**
 * 日付行の数字と期間情報から、各列がどの日を表すかを決める。
 * 月をまたぐ場合（25,26,...,30,1,2,...,21）を扱うため、
 * 期間の開始日と照らし合わせる。
 */
function buildColumnDays(
  dayRow: string[],
  periodRange: { start: WorkingDay; end: WorkingDay } | undefined,
): (WorkingDay | undefined)[] {
  const result: (WorkingDay | undefined)[] = new Array(dayRow.length).fill(undefined);

  if (!periodRange) return result;

  const { start, end } = periodRange;
  const totalDays = end.daysSince(start) + 1;

  // 日付行から数字を拾い、期間の日と照合する
  let dayIndex = 0;
  for (let col = 0; col < dayRow.length && dayIndex < totalDays; col++) {
    const cellText = dayRow[col].trim();
    const dayNum = /^\d{1,2}$/.test(cellText) ? Number(cellText) : undefined;
    if (dayNum === undefined) continue;

    const expectedDay = start.addDays(dayIndex);
    if (expectedDay.day === dayNum) {
      result[col] = expectedDay;
      dayIndex++;
    }
  }

  return result;
}

/**
 * スタッフ行をパースする。
 * 名前列の位置は固定（CSV上で3列目付近）。
 */
function parseStaffRow(
  row: string[],
  dayColumns: { colIndex: number; day: WorkingDay }[],
): StaffEntry | undefined {
  // スタッフ名を探す: 日本語のイニシャル（全角英字＋全角スペース＋全角英字のパターン）
  // 名前列は先頭付近（0〜4列目）にある
  let name = "";
  let nameColIndex = -1;
  for (let col = 0; col < Math.min(row.length, 5); col++) {
    const cell = row[col].trim();
    if (isStaffName(cell)) {
      name = cell;
      nameColIndex = col;
      break;
    }
  }

  if (!name) return undefined;

  // 行番号とサブ番号（会計年度任用の番号）
  let rowNumber: number | undefined;
  let subNumber: number | undefined;
  for (let col = 0; col < nameColIndex; col++) {
    const num = Number(row[col].trim());
    if (!Number.isNaN(num) && num > 0) {
      if (rowNumber === undefined) {
        rowNumber = num;
      } else {
        subNumber = num;
      }
    }
  }

  // 日ごとのセル値を集める
  const cellsByDay = new Map<string, string>();
  for (const { colIndex, day } of dayColumns) {
    if (colIndex < row.length) {
      const value = row[colIndex].trim();
      if (value !== "") {
        cellsByDay.set(day.key, value);
      }
    }
  }

  return { rowNumber, subNumber, name, cellsByDay };
}

/** スタッフ名らしいか（全角英字を含む、かつ数字だけではない） */
function isStaffName(text: string): boolean {
  if (!text || text.length < 2) return false;
  // 全角英字（Ａ-Ｚ, ａ-ｚ）を含む
  if (/[Ａ-Ｚａ-ｚ]/.test(text)) return true;
  // 半角英字2文字以上（W Yのようなイニシャル）
  if (/[A-Z].*[A-Z]/i.test(text)) return true;
  return false;
}
