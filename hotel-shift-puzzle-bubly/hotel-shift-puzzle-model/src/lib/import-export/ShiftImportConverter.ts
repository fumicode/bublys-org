/**
 * ShiftImportConverter — パース結果をドメインオブジェクトに変換する
 *
 * GovernmentShiftParser が返す構造化データ（GovernmentShiftImportData）を、
 * シフトントンのドメインオブジェクト群に変換する。
 *
 * 生成するもの:
 *   - StaffMonthlyShiftWish[]: 各スタッフの希望（年休・勤務帯の希望）
 *   - 確定休みの割当情報: 休暇・週休・祝日を DAY_OFF として埋めるためのデータ
 *   - スタッフ名の一覧: WorkingStaffGroup を作るための素材
 *
 * このモジュールは MonthlyStaffSchedule や WorkingStaffGroup を直接作らない。
 * それらの生成は feature 層が担う（ID の採番やスコープの管理が必要なため）。
 * ここでは feature 層に渡す「素材」を用意する。
 *
 * 純粋関数。React も Redux も import しない。
 */

import { WorkingDay } from "../schedule/WorkingDay.js";
import {
  StaffMonthlyShiftWish,
  type ShiftWishPreference,
} from "../schedule/StaffMonthlyShiftWish.js";
import type { SchedulePeriod } from "../schedule/SchedulePeriod.js";
import type {
  GovernmentShiftImportData,
  StaffEntry,
} from "./GovernmentShiftParser.js";
import type {
  SymbolMapping,
  ConfirmedDayOffReason,
} from "./SymbolMapping.js";

// ========== 変換結果 ==========

/** スタッフ1人ぶんの変換結果 */
export type StaffImportResult = {
  /** スタッフ名 */
  name: string;
  /** 行番号（表示用） */
  rowNumber: number | undefined;
  /** グループ内番号（会計年度任用の番号） */
  subNumber: number | undefined;
  /** シフト希望（期が確定していれば生成される） */
  wish: StaffMonthlyShiftWish | undefined;
  /** 確定休みの一覧（日 → 理由）。feature 層が ShiftAssignment に変換する */
  confirmedDaysOff: ReadonlyMap<string, ConfirmedDayOffReason>;
  /** 解釈できなかった記号（日 → 記号。ログや警告表示用） */
  unknownSymbols: ReadonlyMap<string, string>;
};

/** インポート全体の変換結果 */
export type ShiftImportResult = {
  /** タイトル */
  title: string;
  /** 期間 */
  period: SchedulePeriod | undefined;
  /** 稼働日の一覧 */
  days: WorkingDay[];
  /** スタッフごとの変換結果 */
  staffResults: StaffImportResult[];
};

// ========== 変換関数 ==========

/**
 * パース結果をドメインの素材に変換する。
 *
 * @param data - GovernmentShiftParser の出力
 * @param mapping - 記号の変換テーブル（形態が持つ）
 * @param staffIdOf - スタッフ名 → staffId の対応（feature 層が既存のスタッフとの突合に使う）
 */
export function convertImportData(
  data: GovernmentShiftImportData,
  mapping: SymbolMapping,
  staffIdOf: (name: string, index: number) => string,
): ShiftImportResult {
  const staffResults = data.staffEntries.map((entry, index) =>
    convertStaffEntry(entry, data, mapping, staffIdOf(entry.name, index)),
  );

  return {
    title: data.title,
    period: data.period,
    days: data.days,
    staffResults,
  };
}

function convertStaffEntry(
  entry: StaffEntry,
  data: GovernmentShiftImportData,
  mapping: SymbolMapping,
  staffId: string,
): StaffImportResult {
  const confirmedDaysOff = new Map<string, ConfirmedDayOffReason>();
  const unknownSymbols = new Map<string, string>();
  const byDay: Record<string, Record<string, ShiftWishPreference>> = {};

  for (const day of data.days) {
    const symbol = entry.cellsByDay.get(day.key);
    if (!symbol || mapping.isEmpty(symbol)) continue;

    const interpretation = mapping.interpret(symbol);
    if (!interpretation) {
      unknownSymbols.set(day.key, symbol);
      continue;
    }

    switch (interpretation.kind) {
      case "confirmed-day-off":
        confirmedDaysOff.set(day.key, interpretation.reason);
        break;
      case "wish": {
        const dayMap: Record<string, ShiftWishPreference> = {};
        for (const opt of interpretation.options) {
          dayMap[opt.optionKey] = opt.preference;
        }
        byDay[day.key] = dayMap;
        break;
      }
    }
  }

  let wish: StaffMonthlyShiftWish | undefined;
  if (data.period) {
    wish = new StaffMonthlyShiftWish({
      staffId,
      period: data.period,
      byDay,
      submittedAt: null,
    });
  }

  return {
    name: entry.name,
    rowNumber: entry.rowNumber,
    subNumber: entry.subNumber,
    wish,
    confirmedDaysOff,
    unknownSymbols,
  };
}
