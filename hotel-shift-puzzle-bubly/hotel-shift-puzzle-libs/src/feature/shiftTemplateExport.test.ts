import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import {
  exportShiftFromTemplate,
  buildTemplateWorkbook,
  type TemplateExportOptions,
} from "./shiftTemplateExport.js";
import {
  GOVERNMENT_SYMBOL_MAPPING,
  type FormatInput,
  type StaffRow,
  CalendarMonthPeriod,
  type WorkingDay,
} from "@bublys-org/hotel-shift-puzzle-model";

function buildTestInput(): FormatInput {
  const period = CalendarMonthPeriod.of(2026, 11);
  const days = period.days().slice(0, 28);

  const staffRows: StaffRow[] = [
    { rowNumber: 1, subNumber: undefined, name: "田中太郎", staffId: "s1" },
    { rowNumber: 2, subNumber: undefined, name: "鈴木花子", staffId: "s2" },
    { rowNumber: 3, subNumber: 1, name: "佐藤次郎", staffId: "s3" },
  ];

  const assignments: Record<
    string,
    Record<string, { shift: string | "day-off" | null; reason?: string }>
  > = {
    s1: {
      "2026-11-01": { shift: "day-off", reason: "週" },
      "2026-11-02": { shift: "shift-a" },
      "2026-11-03": { shift: "day-off", reason: "祝" },
    },
    s2: {
      "2026-11-01": { shift: "shift-b" },
      "2026-11-02": { shift: "day-off", reason: "年" },
      "2026-11-03": { shift: "shift-a" },
    },
    s3: {
      "2026-11-01": { shift: "shift-a" },
      "2026-11-02": { shift: "shift-a" },
      "2026-11-03": { shift: "day-off", reason: "週" },
    },
  };

  const shiftNames: Record<string, string> = {
    "shift-a": "A勤務",
    "shift-b": "B勤務",
  };

  return {
    title: "2026年11月　シフト",
    period,
    days,
    staffRows,
    shiftValueOf: (staffId, dayKey) => {
      const a = assignments[staffId]?.[dayKey];
      return a?.shift ?? null;
    },
    dayOffReasonOf: (staffId, dayKey) => {
      const a = assignments[staffId]?.[dayKey];
      return a?.reason;
    },
    shiftNameOf: (shiftId) => shiftNames[shiftId],
  };
}

function testOptions(): TemplateExportOptions {
  const rokuyoData: Record<string, string> = {
    "2026-11-01": "大安",
    "2026-11-02": "赤口",
    "2026-11-03": "友引",
  };
  return {
    rokuyoOf: (day: WorkingDay) => {
      const label =
        rokuyoData[
          `${day.year}-${String(day.month).padStart(2, "0")}-${String(day.day).padStart(2, "0")}`
        ];
      return label ? { label } : undefined;
    },
    holidayCount: 8,
  };
}

function getSheet(
  input: FormatInput,
  options?: TemplateExportOptions,
): XLSX.WorkSheet {
  const wb = buildTemplateWorkbook(input, options);
  return wb.Sheets[wb.SheetNames[0]];
}

function readSheet(buffer: ArrayBuffer): XLSX.WorkSheet {
  const wb = XLSX.read(buffer, { type: "array" });
  return wb.Sheets[wb.SheetNames[0]];
}

function cellVal(sheet: XLSX.WorkSheet, row: number, col: number): string {
  const addr = XLSX.utils.encode_cell({ r: row, c: col });
  const cell = sheet[addr];
  return cell ? String(cell.v ?? "") : "";
}

function cellFormula(
  sheet: XLSX.WorkSheet,
  row: number,
  col: number,
): string | undefined {
  const addr = XLSX.utils.encode_cell({ r: row, c: col });
  return sheet[addr]?.f;
}

describe("テンプレートExcelエクスポート（B案）", () => {
  it("エクスポートした .xlsx がエラーなく生成される", () => {
    const input = buildTestInput();
    const buffer = exportShiftFromTemplate(input);
    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  it("タイトルが正しく書かれる（B1）", () => {
    const input = buildTestInput();
    const sheet = readSheet(exportShiftFromTemplate(input));
    expect(cellVal(sheet, 0, 1)).toBe("2026年11月　シフト");
  });

  it("日付・曜日ヘッダーが正しく書かれる", () => {
    const input = buildTestInput();
    const sheet = readSheet(exportShiftFromTemplate(input));

    // B4 = "R", D4 = 月（C4 = 令和年数はテンプレートが持つので触らない）
    expect(cellVal(sheet, 3, 1)).toBe("R");
    // 11月1日 = E4 (col 4)
    expect(cellVal(sheet, 3, 4)).toBe("1");
    // 曜日: 2026-11-01 は日曜日
    expect(cellVal(sheet, 4, 4)).toBe("日");
  });

  it("六曜が短縮形で埋まる", () => {
    const input = buildTestInput();
    const opts = testOptions();
    const sheet = getSheet(input, opts);

    // 11/1 = 大安 → "大"
    expect(cellVal(sheet, 2, 4)).toBe("大");
    // 11/2 = 赤口 → "赤"
    expect(cellVal(sheet, 2, 5)).toBe("赤");
    // 11/3 = 友引 → "友"
    expect(cellVal(sheet, 2, 6)).toBe("友");
  });

  it("月間休暇日数が AI4 に配置される", () => {
    const input = buildTestInput();
    const opts = testOptions();
    const sheet = getSheet(input, opts);

    // AI4 (row 3, col 34)
    expect(cellVal(sheet, 3, 34)).toBe("8");
  });

  it("スタッフ名とセルデータが正しく埋まる", () => {
    const input = buildTestInput();
    const sheet = readSheet(exportShiftFromTemplate(input));

    // 名前 (D列 = col 3)
    expect(cellVal(sheet, 5, 3)).toBe("田中太郎");
    expect(cellVal(sheet, 6, 3)).toBe("鈴木花子");
    expect(cellVal(sheet, 7, 3)).toBe("佐藤次郎");

    // 番号 (B列 = col 1)
    expect(cellVal(sheet, 5, 1)).toBe("1");
    // サブ番号 (C列 = col 2)
    expect(cellVal(sheet, 7, 2)).toBe("1");

    // 田中太郎 11/1 = 週 (E6 = row 5, col 4)
    expect(cellVal(sheet, 5, 4)).toBe("週");
    // 田中太郎 11/2 = A
    expect(cellVal(sheet, 5, 5)).toBe("A");
    // 田中太郎 11/3 = 祝
    expect(cellVal(sheet, 5, 6)).toBe("祝");
    // 鈴木花子 11/1 = B
    expect(cellVal(sheet, 6, 4)).toBe("B");
    // 鈴木花子 11/2 = 年
    expect(cellVal(sheet, 6, 5)).toBe("年");
  });

  it("テンプレートのCOUNTIF数式が保持される（右側集計）", () => {
    const input = buildTestInput();
    const sheet = getSheet(input);

    // AG6 (row 5, col 32): COUNTIF for A shift
    const ag6 = cellFormula(sheet, 5, 32);
    expect(ag6).toBeDefined();
    expect(ag6).toContain("COUNTIF");
    expect(ag6).toContain('"A"');

    // AP6 (row 5, col 41): 勤務日数 = SUM
    const ap6 = cellFormula(sheet, 5, 41);
    expect(ap6).toBeDefined();
    expect(ap6).toContain("SUM");
  });

  it("休暇チェック数式がテンプレートから保持される", () => {
    const input = buildTestInput();
    const sheet = getSheet(input);

    // AV6 (row 5, col 47): 休暇ﾁｪｯｸ
    const av6 = cellFormula(sheet, 5, 47);
    expect(av6).toBeDefined();
    expect(av6).toContain("IF");
    expect(av6).toContain("$AI$4");
    expect(av6).toContain("○");
  });

  it("下部の集計行の数式が保持される", () => {
    const input = buildTestInput();
    const sheet = getSheet(input);

    // row 24 (D列) = Ａ（正規職員のAシフト集計ラベル）
    expect(cellVal(sheet, 24, 3)).toBe("Ａ");

    // E25 (row 24, col 4): COUNTIF for A shift
    const e25 = cellFormula(sheet, 24, 4);
    expect(e25).toBeDefined();
    expect(e25).toContain("COUNTIF");

    // 出勤人数 row (row 30, Excel 31)
    expect(cellVal(sheet, 30, 3)).toBe("出勤人数");
    const e31 = cellFormula(sheet, 30, 4);
    expect(e31).toBeDefined();
    expect(e31).toContain("SUM");

    // 下限人数 row (row 33) は数式なし
    expect(cellVal(sheet, 33, 3)).toBe("下限人数");
    expect(cellFormula(sheet, 33, 4)).toBeUndefined();
  });

  it("実勤務人数 = 出勤人数 - 年休等の数式が保持される", () => {
    const input = buildTestInput();
    const sheet = getSheet(input);

    // 実勤務人数 (row 32, Excel 33)
    expect(cellVal(sheet, 32, 3)).toBe("実勤務人数");
    const f = cellFormula(sheet, 32, 4);
    expect(f).toBeDefined();
    // 出勤人数セル - 年休等セルの引き算
    expect(f).toMatch(/^[A-Z]+\d+-[A-Z]+\d+$/);
  });

  it("テンプレートの凡例がそのまま保持される", () => {
    const input = buildTestInput();
    const sheet = getSheet(input);

    // テンプレートの凡例ヘッダー AW5 (row 4, col 48)
    expect(cellVal(sheet, 4, 48)).toBe("時間帯");
    // 正規職員の凡例: Ａ (row 5)
    expect(cellVal(sheet, 5, 48)).toBe("Ａ");
    // 会計年度任用の凡例ヘッダー AW18 (row 17)
    expect(cellVal(sheet, 17, 48)).toBe("時間帯");
    // 会計年度任用の凡例: ① (row 18)
    expect(cellVal(sheet, 18, 48)).toBe("①");
  });

  it("セル結合が保持される", () => {
    const input = buildTestInput();
    const sheet = getSheet(input);
    const merges = sheet["!merges"];
    expect(merges).toBeDefined();
    expect(merges!.length).toBeGreaterThanOrEqual(20);
  });

  it("空セル（未定）は空欄のまま", () => {
    const input = buildTestInput();
    const sheet = readSheet(exportShiftFromTemplate(input));

    // 田中太郎の11/4以降は未割り当て → E9 (row 5, col 7)
    expect(cellVal(sheet, 5, 7)).toBe("");
  });

  it("連絡事項ラベルがテンプレートから保持される", () => {
    const input = buildTestInput();
    const sheet = getSheet(input);

    // AG24 (row 23 + 1 = 24, col 32) in template
    // テンプレートでは AG25 (row 24, col 32) に "【連絡事項】" がある
    expect(cellVal(sheet, 24, 32)).toBe("【連絡事項】");
  });

  it("スタッフ行が足りない場合はテンプレートの残り行が空になる", () => {
    const input = buildTestInput();
    const sheet = readSheet(exportShiftFromTemplate(input));

    // テストは3人のみ。4人目（row 8 = row index 8）は空
    expect(cellVal(sheet, 8, 3)).toBe("");
    // 19人目（row 23）も空
    expect(cellVal(sheet, 23, 3)).toBe("");
  });

  it("templateData で差し替えたテンプレートを使える", () => {
    const input = buildTestInput();
    // バンドル版と同じテンプレートを templateData として渡す
    const bundled = exportShiftFromTemplate(input);
    // 差し替え用として同じテンプレートを再利用（構造が同じことを確認）
    const sheet2 = readSheet(
      exportShiftFromTemplate(input, { templateData: bundled }),
    );
    expect(cellVal(sheet2, 0, 1)).toBe("2026年11月　シフト");
    expect(cellVal(sheet2, 5, 3)).toBe("田中太郎");
  });
});
