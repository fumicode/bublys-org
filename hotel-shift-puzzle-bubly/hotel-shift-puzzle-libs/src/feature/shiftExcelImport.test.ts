import { describe, it, expect } from "vitest";
import { importShiftFromExcel } from "./shiftExcelImport.js";
import { exportShiftToExcel } from "./shiftExcelExport.js";
import { writeGridToExcel } from "./excelIO.js";
import {
  GOVERNMENT_SYMBOL_MAPPING,
  GOV_LEAVE_KEYS,
  WorkingDay,
  type FormatInput,
  type StaffRow,
} from "@bublys-org/hotel-shift-puzzle-model";
import type { ConfirmedDayOffReason } from "@bublys-org/hotel-shift-puzzle-model";
import type { ShiftWishPreference } from "@bublys-org/hotel-shift-puzzle-model";

function buildSampleExcelGrid(): string[][] {
  const row0 = [
    "",
    "令和８年10月25日～令和８年11月21日　市民課窓口班（審査担当）シフト",
    "", "", "", "", "", "", "", "", "", "", "", "", "",
    "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
  ];
  const row1 = new Array(31).fill("");
  const row2 = ["", "六曜・特異日等", "", "", ...new Array(27).fill("")];
  const row3 = [
    "", "R", "8", "10-11月",
    "25", "26", "27", "28", "29", "30", "31",
    "1", "2", "3", "4", "5", "6", "7", "8",
    "9", "10", "11", "12", "13", "14", "15", "16",
    "17", "18", "19", "20", "21",
  ];
  const row4 = [
    "", "8", "", "",
    "日", "月", "火", "水", "木", "金", "土",
    "日", "月", "火", "水", "木", "金", "土", "日",
    "月", "火", "水", "木", "金", "土", "日", "月",
    "火", "水", "木", "金", "土",
  ];
  const staff1 = [
    "", "1", "", "W　Ｙ",
    "週", "", "", "", "", "", "週",
    "週", "", "祝", "", "", "", "週",
    "週", "", "", "", "", "", "週",
    "週", "", "", "", "", "", "週",
  ];
  const staff8 = [
    "", "8", "", "Ｓ　Ｅ",
    "週", "", "", "年", "年", "", "週",
    "週", "", "祝", "", "", "", "週",
    "週", "", "B", "", "", "", "週",
    "週", "", "", "", "", "", "週",
  ];
  const aggregate = ["", "集計", "", "Ａ", ...new Array(27).fill("0")];

  return [row0, row1, row2, row3, row4, staff1, staff8, aggregate];
}

describe("Excel インポート統合テスト", () => {
  it(".xlsx → パース → ドメインオブジェクト変換が一貫して動く", () => {
    const grid = buildSampleExcelGrid();
    const buffer = writeGridToExcel(grid);

    const { parsed, converted } = importShiftFromExcel(
      buffer,
      (_name, i) => `staff-${i}`,
    );

    // パース結果
    expect(parsed.days).toHaveLength(28);
    expect(parsed.staffEntries).toHaveLength(2);

    // コンバート結果
    expect(converted.staffResults).toHaveLength(2);

    // W　Ｙ: 週休あり、希望なし
    const wy = converted.staffResults[0];
    expect(wy.name).toBe("W　Ｙ");
    expect(wy.confirmedDaysOff.get("2026-10-25")).toBe("weekly");
    expect(wy.wish!.isEmpty).toBe(true);

    // Ｓ　Ｅ: 年休 + B勤務の希望
    const se = converted.staffResults[1];
    expect(se.name).toBe("Ｓ　Ｅ");
    const day1028 = WorkingDay.of(2026, 10, 28);
    expect(se.wish!.preferenceFor(day1028, GOV_LEAVE_KEYS.annualLeave)).toBe("want");
    const day1110 = WorkingDay.of(2026, 11, 10);
    expect(se.wish!.preferenceFor(day1110, "shift-B")).toBe("want");
  });
});

describe("Excel ラウンドトリップ（import → export → reimport）", () => {
  it("インポート → エクスポート → 再インポートでデータが保存される", () => {
    const grid = buildSampleExcelGrid();
    const buffer1 = writeGridToExcel(grid);

    // Step 1: インポート
    const { parsed, converted } = importShiftFromExcel(
      buffer1,
      (_name, i) => `staff-${i}`,
    );

    // Step 2: FormatInput を組み立てる
    const confirmedDaysOffMap = new Map<string, Map<string, ConfirmedDayOffReason>>();
    const wishesMap = new Map<string, Map<string, Record<string, ShiftWishPreference>>>();

    for (const sr of converted.staffResults) {
      const staffId = `staff-${converted.staffResults.indexOf(sr)}`;
      confirmedDaysOffMap.set(staffId, new Map(sr.confirmedDaysOff));
      if (sr.wish) {
        const dayWishes = new Map<string, Record<string, ShiftWishPreference>>();
        for (const day of parsed.days) {
          const w = sr.wish.wishesOn(day);
          if (Object.keys(w).length > 0) {
            dayWishes.set(day.key, w);
          }
        }
        wishesMap.set(staffId, dayWishes);
      }
    }

    const formatInput: FormatInput = {
      title: parsed.title,
      period: parsed.period!,
      days: parsed.days,
      staffRows: converted.staffResults.map((sr, i): StaffRow => ({
        rowNumber: sr.rowNumber,
        subNumber: sr.subNumber,
        name: sr.name,
        staffId: `staff-${i}`,
      })),
      shiftValueOf: () => null,
      wishesOf: (staffId, dayKey) => wishesMap.get(staffId)?.get(dayKey) ?? {},
      dayOffReasonOf: (staffId, dayKey) =>
        confirmedDaysOffMap.get(staffId)?.get(dayKey),
    };

    // Step 3: エクスポート
    const buffer2 = exportShiftToExcel(formatInput);

    // Step 4: 再インポート
    const { parsed: reparsed, converted: reconverted } = importShiftFromExcel(
      buffer2,
      (_name, i) => `staff-${i}`,
    );

    // 検証
    expect(reparsed.days).toHaveLength(28);
    expect(reparsed.staffEntries).toHaveLength(2);

    expect(reconverted.staffResults[0].name).toBe("W　Ｙ");
    expect(reconverted.staffResults[1].name).toBe("Ｓ　Ｅ");

    // 週休が保存されている
    expect(reconverted.staffResults[0].confirmedDaysOff.get("2026-10-25")).toBe("weekly");

    // 年休の希望が保存されている
    const day1028 = WorkingDay.of(2026, 10, 28);
    expect(
      reconverted.staffResults[1].wish!.preferenceFor(day1028, GOV_LEAVE_KEYS.annualLeave),
    ).toBe("want");
  });
});
