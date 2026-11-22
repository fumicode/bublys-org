import { describe, it, expect } from "vitest";
import {
  formatGovernmentShift,
  toWareki,
  type FormatInput,
  type StaffRow,
} from "./GovernmentShiftFormatter.js";
import { parseGovernmentShift } from "./GovernmentShiftParser.js";
import { convertImportData } from "./ShiftImportConverter.js";
import {
  GOVERNMENT_SYMBOL_MAPPING,
} from "./SymbolMapping.js";
import { WorkingDay } from "../schedule/WorkingDay.js";
import { FourWeekPeriod } from "../schedule/SchedulePeriod.js";
import { DAY_OFF, type ShiftValue } from "../schedule/ShiftAssignment.js";
import type { ShiftWishPreference } from "../schedule/StaffMonthlyShiftWish.js";

// ========== ヘルパー ==========

function buildSimpleInput(): FormatInput {
  const start = WorkingDay.of(2026, 10, 25);
  const period = new FourWeekPeriod({ start });
  const days = period.days();

  const staffRows: StaffRow[] = [
    { rowNumber: 1, subNumber: undefined, name: "W　Ｙ", staffId: "staff-0" },
    { rowNumber: 8, subNumber: undefined, name: "Ｓ　Ｅ", staffId: "staff-1" },
    { rowNumber: 17, subNumber: 5, name: "Ｍ　Ｙ", staffId: "staff-2" },
  ];

  const confirmedDaysOff = new Map<string, Map<string, string>>();
  confirmedDaysOff.set("staff-0", new Map([
    ["2026-10-25", "週"],
    ["2026-10-31", "週"],
    ["2026-11-01", "週"],
    ["2026-11-03", "祝"],
  ]));
  confirmedDaysOff.set("staff-1", new Map([
    ["2026-10-25", "週"],
    ["2026-10-31", "週"],
    ["2026-11-01", "週"],
    ["2026-11-03", "祝"],
  ]));
  confirmedDaysOff.set("staff-2", new Map([
    ["2026-10-25", "週"],
    ["2026-10-31", "週"],
    ["2026-11-01", "週"],
    ["2026-11-03", "祝"],
  ]));

  const wishes = new Map<string, Map<string, Record<string, ShiftWishPreference>>>();
  wishes.set("staff-1", new Map([
    ["2026-10-28", { "day-off:年": "want" }],
    ["2026-10-29", { "day-off:年": "want" }],
    ["2026-11-10", { "work:B勤務": "want" }],
  ]));
  wishes.set("staff-2", new Map([
    ["2026-10-29", { "work:①勤務": "want", "work:②勤務": "want" }],
    ["2026-11-05", { "work:①勤務": "want", "work:②勤務": "want" }],
    ["2026-11-12", { "work:②勤務": "want" }],
  ]));

  return {
    title: "令和8年10月25日～令和8年11月21日　市民課窓口班（審査担当）シフト",
    period,
    days,
    staffRows,
    shiftValueOf: () => null,
    wishesOf: (staffId, dayKey) => wishes.get(staffId)?.get(dayKey) ?? {},
    dayOffReasonOf: (staffId, dayKey) =>
      confirmedDaysOff.get(staffId)?.get(dayKey),
  };
}

// ========== テスト ==========

describe("toWareki", () => {
  it("西暦を令和に変換する", () => {
    expect(toWareki(WorkingDay.of(2026, 10, 25))).toBe("令和8年10月25日");
  });

  it("令和7年（2025年）", () => {
    expect(toWareki(WorkingDay.of(2025, 1, 1))).toBe("令和7年1月1日");
  });

  it("令和元年（2019年）", () => {
    expect(toWareki(WorkingDay.of(2019, 5, 1))).toBe("令和1年5月1日");
  });
});

describe("formatGovernmentShift", () => {
  const input = buildSimpleInput();
  const grid = formatGovernmentShift(input, GOVERNMENT_SYMBOL_MAPPING);

  describe("ヘッダー行", () => {
    it("行0: タイトル行", () => {
      expect(grid[0][1]).toContain("令和8年10月25日");
      expect(grid[0][1]).toContain("市民課窓口班");
    });

    it("行1: 空行", () => {
      expect(grid[1].every((c) => c === "")).toBe(true);
    });

    it("行2: 六曜行（プレースホルダ）", () => {
      expect(grid[2][1]).toBe("六曜・特異日等");
    });

    it("行3: 日付行", () => {
      expect(grid[3][1]).toBe("R");
      // 日付が並ぶ
      expect(grid[3][4]).toBe("25");
      expect(grid[3][10]).toBe("31");
      expect(grid[3][11]).toBe("1");
      expect(grid[3][31]).toBe("21");
    });

    it("行3: 月ラベル", () => {
      expect(grid[3][3]).toBe("10-11月");
    });

    it("行4: 曜日行", () => {
      expect(grid[4][4]).toBe("日");  // 10/25は日曜
      expect(grid[4][5]).toBe("月");
      expect(grid[4][10]).toBe("土");
    });
  });

  describe("スタッフ行", () => {
    it("スタッフ名とヘッダー列", () => {
      expect(grid[5][1]).toBe("1");
      expect(grid[5][3]).toBe("W　Ｙ");

      expect(grid[6][1]).toBe("8");
      expect(grid[6][3]).toBe("Ｓ　Ｅ");

      expect(grid[7][1]).toBe("17");
      expect(grid[7][2]).toBe("5");
      expect(grid[7][3]).toBe("Ｍ　Ｙ");
    });

    it("週休のセル", () => {
      // W　Ｙ: 10/25（日）は週休
      expect(grid[5][4]).toBe("週");
      // 10/31（土）は週休
      expect(grid[5][10]).toBe("週");
    });

    it("祝日のセル", () => {
      // W　Ｙ: 11/3（火）は祝日
      expect(grid[5][13]).toBe("祝");
    });

    it("年休の希望", () => {
      // Ｓ　Ｅ: 10/28, 10/29 は年休
      expect(grid[6][7]).toBe("年");
      expect(grid[6][8]).toBe("年");
    });

    it("B勤務の希望", () => {
      // Ｓ　Ｅ: 11/10 は B勤務
      expect(grid[6][20]).toBe("B");
    });

    it("単一の希望（②）", () => {
      // Ｍ　Ｙ: 11/12 は ②
      expect(grid[7][22]).toBe("②");
    });

    it("空欄のセル", () => {
      // W　Ｙ: 10/26（月）は空欄
      expect(grid[5][5]).toBe("");
    });
  });

  describe("集計行", () => {
    it("集計行がある", () => {
      const lastRow = grid[grid.length - 1];
      expect(lastRow[1]).toBe("集計");
    });
  });
});

describe("formatGovernmentShift: 確定した勤務割当", () => {
  it("DAY_OFF + 理由 → 記号を出す", () => {
    const start = WorkingDay.of(2026, 10, 25);
    const period = new FourWeekPeriod({ start });
    const days = [start]; // 1日だけ

    const input: FormatInput = {
      title: "テスト",
      period,
      days,
      staffRows: [{ rowNumber: 1, subNumber: undefined, name: "T　E", staffId: "s1" }],
      shiftValueOf: () => DAY_OFF,
      wishesOf: () => ({}),
      dayOffReasonOf: () => "週",
    };

    const grid = formatGovernmentShift(input, GOVERNMENT_SYMBOL_MAPPING);
    // スタッフ行は行5
    expect(grid[5][4]).toBe("週");
  });

  it("勤務帯ID → 記号を逆引きする", () => {
    const start = WorkingDay.of(2026, 10, 25);
    const period = new FourWeekPeriod({ start });
    const days = [start];

    const input: FormatInput = {
      title: "テスト",
      period,
      days,
      staffRows: [{ rowNumber: 1, subNumber: undefined, name: "T　E", staffId: "s1" }],
      shiftValueOf: () => "shift-B",
      shiftNameOf: (id: string) => id === "shift-B" ? "B勤務" : undefined,
      wishesOf: () => ({}),
      dayOffReasonOf: () => undefined,
    };

    const grid = formatGovernmentShift(input, GOVERNMENT_SYMBOL_MAPPING);
    expect(grid[5][4]).toBe("B");
  });
});

describe("ラウンドトリップ（パース → フォーマット → 再パース）", () => {
  function buildSampleGrid(): string[][] {
    const row0 = [
      "", "令和８年10月25日～令和８年11月21日　市民課窓口班（審査担当）シフト",
      "", "", "", "", "", "", "", "", "", "", "", "", "",
      "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
    ];
    const row1 = new Array(31).fill("");
    const row2 = ["", "六曜・特異日等", "", "", ...new Array(27).fill("")];
    const row3 = ["", "R", "8", "10-11月",
      "25", "26", "27", "28", "29", "30", "31",
      "1", "2", "3", "4", "5", "6", "7", "8",
      "9", "10", "11", "12", "13", "14", "15", "16",
      "17", "18", "19", "20", "21",
    ];
    const row4 = ["", "8", "", "",
      "日", "月", "火", "水", "木", "金", "土",
      "日", "月", "火", "水", "木", "金", "土", "日",
      "月", "火", "水", "木", "金", "土", "日", "月",
      "火", "水", "木", "金", "土",
    ];
    const staff1 = ["", "1", "", "W　Ｙ",
      "週", "", "", "", "", "", "週",
      "週", "", "祝", "", "", "", "週",
      "週", "", "", "", "", "", "週",
      "週", "", "", "", "", "", "週",
    ];
    const staff8 = ["", "8", "", "Ｓ　Ｅ",
      "週", "", "", "年", "年", "", "週",
      "週", "", "祝", "", "", "", "週",
      "週", "", "", "B", "", "", "週",
      "週", "", "", "", "", "", "週",
    ];
    const aggregate = ["", "集計", "", "Ａ", ...new Array(27).fill("0")];

    return [row0, row1, row2, row3, row4, staff1, staff8, aggregate];
  }

  it("パースしてフォーマットし、再パースしても同じデータが得られる", () => {
    const originalGrid = buildSampleGrid();
    const mapping = GOVERNMENT_SYMBOL_MAPPING;

    // ステップ1: パース
    const parsed = parseGovernmentShift(originalGrid);
    expect(parsed.staffEntries).toHaveLength(2);

    // ステップ2: コンバート
    const converted = convertImportData(parsed, mapping, (_name, i) => `staff-${i}`);

    // ステップ3: FormatInput を組み立てる（コンバート結果から）
    const wishesMap = new Map<string, Map<string, Record<string, ShiftWishPreference>>>();

    for (const sr of converted.staffResults) {
      const staffId = `staff-${converted.staffResults.indexOf(sr)}`;
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
      staffRows: converted.staffResults.map((sr, i) => ({
        rowNumber: sr.rowNumber,
        subNumber: sr.subNumber,
        name: sr.name,
        staffId: `staff-${i}`,
      })),
      shiftValueOf: () => null,
      wishesOf: (staffId, dayKey) => wishesMap.get(staffId)?.get(dayKey) ?? {},
      dayOffReasonOf: () => undefined,
    };

    // ステップ4: フォーマット
    const exportedGrid = formatGovernmentShift(formatInput, mapping);

    // ステップ5: 再パース
    const reparsed = parseGovernmentShift(exportedGrid);

    // 検証: 期間
    expect(reparsed.period).toBeDefined();
    expect(reparsed.period!.kind).toBe("four-week");
    expect(reparsed.period!.start.key).toBe("2026-10-25");

    // 検証: 日数
    expect(reparsed.days).toHaveLength(28);

    // 検証: スタッフ数
    expect(reparsed.staffEntries).toHaveLength(2);

    // 検証: スタッフ名
    expect(reparsed.staffEntries[0].name).toBe("W　Ｙ");
    expect(reparsed.staffEntries[1].name).toBe("Ｓ　Ｅ");

    // 検証: W　Ｙのセル値が一致
    const wy = reparsed.staffEntries[0];
    expect(wy.cellsByDay.get("2026-10-25")).toBe("週");
    expect(wy.cellsByDay.get("2026-10-31")).toBe("週");
    expect(wy.cellsByDay.get("2026-11-03")).toBe("祝");
    expect(wy.cellsByDay.has("2026-10-26")).toBe(false); // 空欄

    // 検証: Ｓ　Ｅのセル値が一致
    const se = reparsed.staffEntries[1];
    expect(se.cellsByDay.get("2026-10-25")).toBe("週");
    expect(se.cellsByDay.get("2026-10-28")).toBe("年");
    expect(se.cellsByDay.get("2026-10-29")).toBe("年");
    expect(se.cellsByDay.get("2026-11-11")).toBe("B");
  });
});
