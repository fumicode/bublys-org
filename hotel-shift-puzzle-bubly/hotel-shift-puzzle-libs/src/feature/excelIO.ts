/**
 * Excel ↔ string[][] 変換ユーティリティ
 *
 * SheetJS (xlsx) を使って .xlsx ファイルと2次元文字列配列を相互変換する。
 * GovernmentShiftParser / GovernmentShiftFormatter と組み合わせて使う。
 */

import * as XLSX from "xlsx";

// ========== 読み込み（.xlsx → string[][]） ==========

/**
 * .xlsx ファイル（ArrayBuffer）を読み、最初のシートを string[][] として返す。
 * 全セルを文字列として読む（数値も日付も文字列に変換）。
 */
export function readExcelToGrid(buffer: ArrayBuffer): string[][] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  return sheetToGrid(sheet);
}

/**
 * .xlsx ファイルの全シートを { name, grid }[] として返す。
 */
export function readExcelAllSheets(
  buffer: ArrayBuffer,
): { name: string; grid: string[][] }[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  return workbook.SheetNames.map((name) => ({
    name,
    grid: sheetToGrid(workbook.Sheets[name]!),
  }));
}

function sheetToGrid(sheet: XLSX.WorkSheet): string[][] {
  const ref = sheet["!ref"];
  if (!ref) return [];

  const range = XLSX.utils.decode_range(ref);
  const grid: string[][] = [];

  for (let r = range.s.r; r <= range.e.r; r++) {
    const row: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[addr];
      row.push(cell ? String(cell.v ?? "") : "");
    }
    grid.push(row);
  }

  return grid;
}

// ========== 書き出し（string[][] → .xlsx） ==========

export type CellStyle = {
  bold?: boolean;
  backgroundColor?: string;
  textColor?: string;
};

export type ExcelWriteOptions = {
  sheetName?: string;
  columnWidths?: number[];
  cellStyles?: Map<string, CellStyle>;
};

/**
 * string[][] を .xlsx ファイル（ArrayBuffer）に変換する。
 */
export function writeGridToExcel(
  grid: string[][],
  options: ExcelWriteOptions = {},
): ArrayBuffer {
  const { sheetName = "シフト" } = options;

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(grid);

  if (options.columnWidths) {
    sheet["!cols"] = options.columnWidths.map((w) => ({ wch: w }));
  }

  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);

  const buf = XLSX.write(workbook, {
    type: "array",
    bookType: "xlsx",
  });

  return buf;
}

/**
 * ブラウザでダウンロードを開始する。
 */
export function downloadExcel(buffer: ArrayBuffer, filename: string): void {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
