import { describe, it, expect } from "vitest";
import { readExcelToGrid, writeGridToExcel, readExcelAllSheets } from "./excelIO.js";

describe("Excel ↔ string[][] ラウンドトリップ", () => {
  it("string[][] → xlsx → string[][] で内容が保存される", () => {
    const grid = [
      ["", "タイトル", "", ""],
      ["1", "2", "名前", "値A"],
      ["", "", "", ""],
    ];

    const buffer = writeGridToExcel(grid);
    const result = readExcelToGrid(buffer);

    expect(result).toHaveLength(3);
    expect(result[0][1]).toBe("タイトル");
    expect(result[1][0]).toBe("1");
    expect(result[1][1]).toBe("2");
    expect(result[1][2]).toBe("名前");
    expect(result[1][3]).toBe("値A");
  });

  it("日本語のシート名を設定できる", () => {
    const grid = [["A", "B"]];
    const buffer = writeGridToExcel(grid, { sheetName: "勤務表" });
    const sheets = readExcelAllSheets(buffer);
    expect(sheets).toHaveLength(1);
    expect(sheets[0].name).toBe("勤務表");
  });

  it("空のグリッドでもエラーにならない", () => {
    const buffer = writeGridToExcel([]);
    const result = readExcelToGrid(buffer);
    expect(result).toHaveLength(0);
  });

  it("列幅を設定できる", () => {
    const grid = [["A", "B", "C"]];
    const buffer = writeGridToExcel(grid, {
      columnWidths: [5, 10, 3],
    });
    // エラーなく書き出せることを確認
    const result = readExcelToGrid(buffer);
    expect(result[0]).toEqual(["A", "B", "C"]);
  });
});
