/**
 * シフト表Excelエクスポートのオーケストレーション
 *
 * ドメインオブジェクト → GovernmentShiftFormatter → string[][] → .xlsx
 *
 * feature 層に置く。
 */

import {
  formatGovernmentShift,
  GOVERNMENT_SYMBOL_MAPPING,
  type FormatInput,
  type SymbolMapping,
} from "@bublys-org/hotel-shift-puzzle-model";
import { writeGridToExcel, downloadExcel } from "./excelIO.js";

export type ExcelExportOptions = {
  mapping?: SymbolMapping;
  filename?: string;
};

/**
 * FormatInput からExcelファイル（ArrayBuffer）を生成する。
 */
export function exportShiftToExcel(
  input: FormatInput,
  options: ExcelExportOptions = {},
): ArrayBuffer {
  const { mapping = GOVERNMENT_SYMBOL_MAPPING } = options;
  const grid = formatGovernmentShift(input, mapping);

  const columnWidths = buildColumnWidths(input.days.length);
  return writeGridToExcel(grid, {
    sheetName: "シフト",
    columnWidths,
  });
}

/**
 * FormatInput からExcelを生成し、ブラウザでダウンロードする。
 */
export function downloadShiftExcel(
  input: FormatInput,
  options: ExcelExportOptions = {},
): void {
  const buffer = exportShiftToExcel(input, options);
  const filename =
    options.filename ?? buildDefaultFilename(input.title);
  downloadExcel(buffer, filename);
}

function buildColumnWidths(dayCount: number): number[] {
  return [
    3,  // 列0: 空
    4,  // 列1: 番号
    3,  // 列2: サブ番号
    10, // 列3: 名前
    ...new Array(dayCount).fill(4), // 日ごとのセル
  ];
}

function buildDefaultFilename(title: string): string {
  const safe = title
    .replace(/[\\/:*?"<>|]/g, "_")
    .slice(0, 60);
  return `${safe}.xlsx`;
}
