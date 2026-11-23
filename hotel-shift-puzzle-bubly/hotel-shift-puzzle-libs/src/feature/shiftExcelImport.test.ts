import { describe, it, expect } from "vitest";
import { importShiftFromExcel } from "./shiftExcelImport.js";
import { exportShiftToExcel } from "./shiftExcelExport.js";
import { writeGridToExcel } from "./excelIO.js";
import {
  GOVERNMENT_SYMBOL_MAPPING,
  WorkingDay,
  type FormatInput,
  type StaffRow,
} from "@bublys-org/hotel-shift-puzzle-model";


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

    // W　Ｙ: 週休・祝日も希望として入る
    const wy = converted.staffResults[0];
    expect(wy.name).toBe("W　Ｙ");
    expect(wy.confirmedDaysOff.size).toBe(0);
    const day1025 = WorkingDay.of(2026, 10, 25);
    expect(wy.wish!.preferenceFor(day1025, "day-off:週")).toBe("want");

    // Ｓ　Ｅ: 年休 + B勤務の希望
    const se = converted.staffResults[1];
    expect(se.name).toBe("Ｓ　Ｅ");
    const day1028 = WorkingDay.of(2026, 10, 28);
    expect(se.wish!.preferenceFor(day1028, "day-off:年")).toBe("want");
    const day1110 = WorkingDay.of(2026, 11, 10);
    expect(se.wish!.preferenceFor(day1110, "work:B勤務")).toBe("want");
  });
});

describe("Excel ラウンドトリップ（確定値 export → reimport）", () => {
  it("確定した値をエクスポートし、再インポートで同じ値が希望として読み込まれる", () => {
    const grid = buildSampleExcelGrid();
    const buffer1 = writeGridToExcel(grid);

    // Step 1: インポートしてスタッフ構造を得る
    const { parsed } = importShiftFromExcel(
      buffer1,
      (_name, i) => `staff-${i}`,
    );

    // Step 2: 確定した値として FormatInput を組み立てる
    // 元のExcelと同じセル値を「確定した割当」として渡す
    const shiftMap = new Map<string, Map<string, string>>();
    const reasonMap = new Map<string, Map<string, string>>();
    const shiftNames = new Map<string, string>([["shift-B", "B勤務"]]);

    for (const entry of parsed.staffEntries) {
      const staffId = `staff-${parsed.staffEntries.indexOf(entry)}`;
      const shifts = new Map<string, string>();
      const reasons = new Map<string, string>();
      for (const [dayKey, symbol] of entry.cellsByDay) {
        const interp = GOVERNMENT_SYMBOL_MAPPING.interpret(symbol);
        if (!interp || interp.kind === "empty") continue;
        if (interp.kind === "wish" && interp.options.length === 1) {
          const opt = interp.options[0].optionKey;
          if (opt.startsWith("day-off:")) {
            shifts.set(dayKey, "day-off");
            reasons.set(dayKey, opt.slice("day-off:".length));
          } else if (opt.startsWith("work:")) {
            const shiftId = `shift-${symbol}`;
            shiftNames.set(shiftId, opt.slice("work:".length));
            shifts.set(dayKey, shiftId);
          }
        }
      }
      shiftMap.set(staffId, shifts);
      reasonMap.set(staffId, reasons);
    }

    const formatInput: FormatInput = {
      title: parsed.title,
      period: parsed.period!,
      days: parsed.days,
      staffRows: parsed.staffEntries.map((sr, i): StaffRow => ({
        rowNumber: sr.rowNumber,
        subNumber: sr.subNumber,
        name: sr.name,
        staffId: `staff-${i}`,
      })),
      shiftValueOf: (staffId, dayKey) =>
        shiftMap.get(staffId)?.get(dayKey) ?? null,
      dayOffReasonOf: (staffId, dayKey) =>
        reasonMap.get(staffId)?.get(dayKey),
      shiftNameOf: (id: string) => shiftNames.get(id),
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

    // 週休が希望として再インポートされる
    const day1025 = WorkingDay.of(2026, 10, 25);
    expect(
      reconverted.staffResults[0].wish!.preferenceFor(day1025, "day-off:週"),
    ).toBe("want");

    // 年休が希望として再インポートされる
    const day1028 = WorkingDay.of(2026, 10, 28);
    expect(
      reconverted.staffResults[1].wish!.preferenceFor(day1028, "day-off:年"),
    ).toBe("want");
  });
});
