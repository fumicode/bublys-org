import { describe, it, expect } from "vitest";
import { convertImportData } from "./ShiftImportConverter.js";
import {
  GOVERNMENT_SYMBOL_MAPPING,
} from "./SymbolMapping.js";
import type { GovernmentShiftImportData } from "./GovernmentShiftParser.js";
import { WorkingDay } from "../schedule/WorkingDay.js";
import { FourWeekPeriod } from "../schedule/SchedulePeriod.js";

function buildSampleImportData(): GovernmentShiftImportData {
  const start = WorkingDay.of(2026, 10, 25);
  const period = new FourWeekPeriod({ start });
  const days = period.days();

  return {
    period,
    title: "令和8年10月25日～令和8年11月21日　市民課窓口班（審査担当）シフト",
    days,
    staffEntries: [
      {
        rowNumber: 1,
        subNumber: undefined,
        name: "W　Ｙ",
        cellsByDay: new Map([
          ["2026-10-25", "週"],  // 日曜 → 週休
          ["2026-10-31", "週"],  // 土曜 → 週休
          ["2026-11-01", "週"],  // 日曜 → 週休
          ["2026-11-03", "祝"],  // 文化の日
          // 他は空欄（通常勤務）
        ]),
      },
      {
        rowNumber: 8,
        subNumber: undefined,
        name: "Ｓ　Ｅ",
        cellsByDay: new Map([
          ["2026-10-25", "週"],
          ["2026-10-28", "年"],   // 年休
          ["2026-10-29", "年"],   // 年休
          ["2026-10-31", "週"],
          ["2026-11-01", "週"],
          ["2026-11-03", "祝"],
          ["2026-11-10", "B"],    // B勤務の希望
        ]),
      },
      {
        rowNumber: 17,
        subNumber: 5,
        name: "Ｍ　Ｙ",
        cellsByDay: new Map([
          ["2026-10-25", "週"],
          ["2026-10-29", "①ｏｒ②"],  // 曖昧な希望
          ["2026-10-31", "週"],
          ["2026-11-01", "週"],
          ["2026-11-03", "祝"],
          ["2026-11-05", "①ｏｒ②"],
          ["2026-11-12", "②"],        // 単一希望
        ]),
      },
    ],
  };
}

describe("convertImportData", () => {
  const data = buildSampleImportData();
  const result = convertImportData(
    data,
    GOVERNMENT_SYMBOL_MAPPING,
    (name, index) => `staff-${index}`,
  );

  it("スタッフ数を維持する", () => {
    expect(result.staffResults).toHaveLength(3);
  });

  it("タイトルと期間を引き継ぐ", () => {
    expect(result.title).toContain("市民課窓口班");
    expect(result.period).toBeDefined();
    expect(result.period!.kind).toBe("four-week");
  });

  describe("正規職員（W　Ｙ）", () => {
    const wy = () => result.staffResults[0];

    it("名前を引き継ぐ", () => {
      expect(wy().name).toBe("W　Ｙ");
    });

    it("週休は希望として入る", () => {
      const wish = wy().wish!;
      const day = WorkingDay.of(2026, 10, 25);
      expect(wish.preferenceFor(day, "day-off:週")).toBe("want");
    });

    it("祝日は希望として入る", () => {
      const wish = wy().wish!;
      const day = WorkingDay.of(2026, 11, 3);
      expect(wish.preferenceFor(day, "day-off:祝")).toBe("want");
    });

    it("確定休みはない（すべて希望として読み込む）", () => {
      expect(wy().confirmedDaysOff.size).toBe(0);
    });

    it("希望がある（週休3日＋祝日1日）", () => {
      expect(wy().wish).toBeDefined();
      expect(wy().wish!.filledDayCount).toBe(4);
    });

    it("未知の記号はない", () => {
      expect(wy().unknownSymbols.size).toBe(0);
    });
  });

  describe("年休あり（Ｓ　Ｅ）", () => {
    const se = () => result.staffResults[1];

    it("年休は希望として入る", () => {
      const wish = se().wish!;
      const day = WorkingDay.of(2026, 10, 28);
      expect(wish.preferenceFor(day, "day-off:年")).toBe("want");
    });

    it("B勤務も希望として入る", () => {
      const wish = se().wish!;
      const day = WorkingDay.of(2026, 11, 10);
      expect(wish.preferenceFor(day, "work:B勤務")).toBe("want");
    });

    it("7日分の希望がある", () => {
      expect(se().wish!.filledDayCount).toBe(7); // 週×3 + 祝×1 + 年×2 + B×1
    });
  });

  describe("曖昧な希望あり（Ｍ　Ｙ）", () => {
    const my = () => result.staffResults[2];

    it("①or② は ①と② 両方の want になる", () => {
      const wish = my().wish!;
      const day = WorkingDay.of(2026, 10, 29);
      expect(wish.preferenceFor(day, "work:①勤務")).toBe("want");
      expect(wish.preferenceFor(day, "work:②勤務")).toBe("want");
    });

    it("② 単独は ② だけの want", () => {
      const wish = my().wish!;
      const day = WorkingDay.of(2026, 11, 12);
      expect(wish.preferenceFor(day, "work:②勤務")).toBe("want");
      expect(wish.preferenceFor(day, "work:①勤務")).toBeUndefined();
    });

    it("会計年度任用のサブ番号を持つ", () => {
      expect(my().subNumber).toBe(5);
    });
  });
});
