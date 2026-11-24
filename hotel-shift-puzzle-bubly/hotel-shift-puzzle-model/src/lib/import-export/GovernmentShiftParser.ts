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

/** 凡例の1セクション（正規職員 or 会計年度任用） */
export type LegendSection = {
  /** 凡例のシンボル（"Ａ", "Ｂ", "①" など。全角のまま） */
  symbols: string[];
  /** 各シンボルの説明（"8：00～16：45" など）。symbols と同じ長さ */
  descriptions: string[];
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
  /** 凡例（正規職員 / 会計年度任用）。テンプレートに凡例があれば2セクション */
  legendSections: LegendSection[];
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
    return { period: undefined, title: "", days: [], staffEntries: [], legendSections: [] };
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
    return { period: undefined, title, days: [], staffEntries: [], legendSections: [] };
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

  // --- 凡例をパース ---
  const legendSections = parseLegendSections(grid);

  return { period, title, days, staffEntries, legendSections };
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

/** 名前列（D列 = index 3） */
const NAME_COL = 3;

/**
 * スタッフ行をパースする。
 * 行の構造で判定: 2列目（B列）に番号があり、4列目（D列）に名前がある。
 */
function parseStaffRow(
  row: string[],
  dayColumns: { colIndex: number; day: WorkingDay }[],
): StaffEntry | undefined {
  if (row.length <= NAME_COL) return undefined;

  const name = row[NAME_COL].trim();
  if (!name) return undefined;

  // 2列目（B列）に番号がなければスタッフ行ではない
  const col1 = row[1]?.trim() ?? "";
  const firstNum = /^\d+$/.test(col1) ? Number(col1) : undefined;
  if (firstNum === undefined) return undefined;

  // 行番号とサブ番号（会計年度任用の番号）
  const rowNumber = firstNum;
  const col2 = row[2]?.trim() ?? "";
  const subNumber = /^\d+$/.test(col2) ? Number(col2) : undefined;

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

// ========== 凡例パース ==========

/** AW列（col 48）の凡例ヘッダー */
const LEGEND_HEADER = "時間帯";
const LEGEND_SYMBOL_COL = 48;
const LEGEND_DESC_COL = 49;

/**
 * テンプレートの凡例セクションを読み取る。
 * "時間帯" ヘッダーの直下からシンボルが並ぶ行を集める。
 * 2セクション: 正規職員（上）→ 会計年度任用（下）
 */
function parseLegendSections(grid: string[][]): LegendSection[] {
  const sections: LegendSection[] = [];
  let row = 0;

  while (row < grid.length) {
    const cell = grid[row]?.[LEGEND_SYMBOL_COL]?.trim() ?? "";
    if (cell === LEGEND_HEADER) {
      row++;
      const symbols: string[] = [];
      const descriptions: string[] = [];
      while (row < grid.length) {
        const sym = grid[row]?.[LEGEND_SYMBOL_COL]?.trim() ?? "";
        if (!sym || sym === LEGEND_HEADER) break;
        symbols.push(sym);
        const desc = grid[row]?.[LEGEND_DESC_COL]?.trim() ?? "";
        descriptions.push(desc);
        row++;
      }
      if (symbols.length > 0) {
        sections.push({ symbols, descriptions });
      }
    } else {
      row++;
    }
  }

  return sections;
}
