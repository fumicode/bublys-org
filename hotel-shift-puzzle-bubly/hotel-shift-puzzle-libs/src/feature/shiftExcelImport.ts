/**
 * シフト希望Excelインポートのオーケストレーション
 *
 * .xlsx ファイル → string[][] → GovernmentShiftParser → ShiftImportConverter → ドメインオブジェクト
 *
 * feature 層に置く。React / Redux への接続は呼び出し元（バブルルートやコンポーネント）が行う。
 */

import {
  parseGovernmentShift,
  convertImportData,
  GOVERNMENT_SYMBOL_MAPPING,
  type GovernmentShiftImportData,
  type ShiftImportResult,
  type SymbolMapping,
} from "@bublys-org/hotel-shift-puzzle-model";
import { readExcelToGrid } from "./excelIO.js";

export type ExcelImportResult = {
  parsed: GovernmentShiftImportData;
  converted: ShiftImportResult;
};

/**
 * .xlsx ファイルからシフト希望をインポートする。
 *
 * @param buffer .xlsx ファイルの ArrayBuffer
 * @param mapping 記号変換テーブル（省略時はGOVERNMENT_SYMBOL_MAPPING）
 * @param staffIdOf 名前→staffId の解決関数（feature層が、既存スタッフとの突合で提供）
 */
export function importShiftFromExcel(
  buffer: ArrayBuffer,
  staffIdOf: (name: string, index: number) => string,
  mapping: SymbolMapping = GOVERNMENT_SYMBOL_MAPPING,
): ExcelImportResult {
  const grid = readExcelToGrid(buffer);
  const parsed = parseGovernmentShift(grid);
  const converted = convertImportData(parsed, mapping, staffIdOf);

  return { parsed, converted };
}
