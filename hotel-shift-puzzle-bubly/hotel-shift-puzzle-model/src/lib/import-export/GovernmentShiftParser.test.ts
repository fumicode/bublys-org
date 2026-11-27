import { describe, it, expect } from "vitest";
import {
  parseGovernmentShift,
  parseWareki,
  parsePeriodFromTitle,
} from "./GovernmentShiftParser.js";
import { WorkingDay } from "../schedule/WorkingDay.js";

// ========== ヘルパー ==========

/**
 * 添付CSVの先頭部分を再現した2次元配列（簡略版）。
 * 実際のCSVと同じ構造だが、集計列（右端）は省略。
 */
function buildSampleGrid(): string[][] {
  // 行0: タイトル行
  const row0 = [
    "",
    "令和８年10月25日～令和８年11月21日　市民課窓口班（審査担当）シフト",
    "", "", "", "", "", "", "", "", "", "", "", "", "",
    "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
  ];
  // 行1: 空行
  const row1 = new Array(31).fill("");
  // 行2: 六曜行
  const row2 = ["", "六曜・特異日等", "", "", "大", "一", "", "友", "", "", "大",
    "", "", "友", "一", "", "大", "一", "一", "", "大", "", "", "友",
    "", "", "大", "", "", "友\n一", "一"];
  // 行3: 日付行（R, 8, 10-11月, 25, 26, 27, ...）
  const row3 = ["", "R", "", "10-11月",
    "25", "26", "27", "28", "29", "30", "31",
    "1", "2", "3", "4", "5", "6", "7", "8",
    "9", "10", "11", "12", "13", "14", "15", "16",
    "17", "18", "19", "20", "21",
  ];
  // 行4: 曜日行
  const row4 = ["", "8", "", "",
    "日", "月", "火", "水", "木", "金", "土",
    "日", "月", "火", "水", "木", "金", "土", "日",
    "月", "火", "水", "木", "金", "土", "日", "月",
    "火", "水", "木", "金", "土",
  ];
  // 行5〜: スタッフ行
  // スタッフ1: W Ｙ（正規職員）
  const staff1 = ["", "1", "", "W　Ｙ",
    "週", "", "", "", "", "", "週",
    "週", "", "祝", "", "", "", "週",
    "週", "", "", "", "", "", "週",
    "週", "", "", "", "", "", "週",
  ];
  // スタッフ8: Ｓ　Ｅ（年休あり）
  const staff8 = ["", "8", "", "Ｓ　Ｅ",
    "週", "", "", "年", "年", "", "週",
    "週", "", "祝", "", "", "", "週",
    "週", "", "", "B", "", "", "週",
    "週", "", "", "", "", "", "週",
  ];
  // スタッフ15（会計年度任用）: Ｓ　Ｍ
  const staff15 = ["", "15", "3", "Ｓ　Ｍ",
    "週", "", "", "", "", "", "週",
    "週", "PM年", "祝", "", "", "", "週",
    "週", "", "", "", "①", "年", "週",
    "週", "PM年", "", "", "", "", "週",
  ];
  // スタッフ17: Ｍ　Ｙ（曖昧希望あり）
  const staff17 = ["", "17", "5", "Ｍ　Ｙ",
    "週", "", "", "", "①ｏｒ②", "", "週",
    "週", "", "祝", "", "①ｏｒ②", "", "週",
    "週", "", "", "", "②", "", "週",
    "週", "", "", "", "①ｏｒ②", "", "週",
  ];
  // 集計行
  const aggregate = ["", "集計", "", "Ａ",
    "0", "0", "0", "0", "0", "0", "0",
    "0", "0", "0", "0", "0", "0", "0", "0",
    "0", "0", "0", "0", "0", "0", "0", "0",
    "0", "0", "0", "0", "0",
  ];

  return [row0, row1, row2, row3, row4, staff1, staff8, staff15, staff17, aggregate];
}

// ========== テスト ==========

describe("parseWareki", () => {
  it("令和8年を西暦に変換", () => {
    const day = parseWareki("令和８年10月25日");
    expect(day).toBeDefined();
    expect(day!.year).toBe(2026);
    expect(day!.month).toBe(10);
    expect(day!.day).toBe(25);
  });

  it("半角数字でもパースできる", () => {
    const day = parseWareki("令和8年11月21日");
    expect(day).toBeDefined();
    expect(day!.year).toBe(2026);
    expect(day!.month).toBe(11);
    expect(day!.day).toBe(21);
  });

  it("不正な文字列は undefined", () => {
    expect(parseWareki("2026年10月25日")).toBeUndefined();
    expect(parseWareki("")).toBeUndefined();
  });
});

describe("parsePeriodFromTitle", () => {
  it("タイトルから期間を読む", () => {
    const result = parsePeriodFromTitle(
      "令和８年10月25日～令和８年11月21日　市民課窓口班（審査担当）シフト",
    );
    expect(result).toBeDefined();
    expect(result!.start.key).toBe("2026-10-25");
    expect(result!.end.key).toBe("2026-11-21");
  });

  it("全角チルダでもパースできる", () => {
    const result = parsePeriodFromTitle(
      "令和８年10月25日〜令和８年11月21日　市民課窓口班（審査担当）シフト",
    );
    expect(result).toBeDefined();
  });
});

describe("parseGovernmentShift", () => {
  it("空のグリッドを受け入れる", () => {
    const result = parseGovernmentShift([]);
    expect(result.staffEntries).toHaveLength(0);
    expect(result.days).toHaveLength(0);
  });

  describe("サンプルグリッドのパース", () => {
    const grid = buildSampleGrid();
    const result = parseGovernmentShift(grid);

    it("タイトルを読み取る", () => {
      expect(result.title).toContain("令和８年10月25日");
      expect(result.title).toContain("市民課窓口班");
    });

    it("期間は28日の4週の期", () => {
      expect(result.period).toBeDefined();
      expect(result.period!.kind).toBe("four-week");
      expect(result.period!.start.key).toBe("2026-10-25");
      expect(result.period!.length).toBe(28);
    });

    it("28日分の稼働日を読み取る", () => {
      expect(result.days).toHaveLength(28);
      expect(result.days[0].key).toBe("2026-10-25");
      expect(result.days[27].key).toBe("2026-11-21");
    });

    it("月またぎを正しく扱う（10/31 → 11/1）", () => {
      const oct31 = result.days.find((d) => d.month === 10 && d.day === 31);
      const nov1 = result.days.find((d) => d.month === 11 && d.day === 1);
      expect(oct31).toBeDefined();
      expect(nov1).toBeDefined();
      const oct31Index = result.days.indexOf(oct31!);
      const nov1Index = result.days.indexOf(nov1!);
      expect(nov1Index).toBe(oct31Index + 1);
    });

    it("4人のスタッフを読み取る", () => {
      expect(result.staffEntries).toHaveLength(4);
    });

    it("正規職員の名前とセルを読む（W　Ｙ）", () => {
      const wy = result.staffEntries[0];
      expect(wy.name).toBe("W　Ｙ");
      expect(wy.subNumber).toBeUndefined();
      // 10/25（日）は週休
      expect(wy.cellsByDay.get("2026-10-25")).toBe("週");
      // 10/26（月）は空欄 → マップに入らない
      expect(wy.cellsByDay.has("2026-10-26")).toBe(false);
    });

    it("年休のセルを読む（Ｓ　Ｅ）", () => {
      const se = result.staffEntries[1];
      expect(se.name).toBe("Ｓ　Ｅ");
      // 10/28（水）は年休
      expect(se.cellsByDay.get("2026-10-28")).toBe("年");
      // 10/29（木）は年休
      expect(se.cellsByDay.get("2026-10-29")).toBe("年");
    });

    it("会計年度任用のサブ番号を読む（Ｓ　Ｍ）", () => {
      const sm = result.staffEntries[2];
      expect(sm.name).toBe("Ｓ　Ｍ");
      expect(sm.rowNumber).toBe(15);
      expect(sm.subNumber).toBe(3);
      // PM年休
      expect(sm.cellsByDay.get("2026-11-02")).toBe("PM年");
      // ①の希望
      expect(sm.cellsByDay.get("2026-11-12")).toBe("①");
    });

    it("曖昧な希望を読む（Ｍ　Ｙ）", () => {
      const my = result.staffEntries[3];
      expect(my.name).toBe("Ｍ　Ｙ");
      // ①or②
      expect(my.cellsByDay.get("2026-10-29")).toBe("①ｏｒ②");
    });

    it("祝日のセルを読む", () => {
      // 11/3（火）は祝日（文化の日）
      const wy = result.staffEntries[0];
      expect(wy.cellsByDay.get("2026-11-03")).toBe("祝");
    });
  });

  describe("日本語のスタッフ名を読む", () => {
    function buildGridWithJapaneseName(name: string): string[][] {
      const row0 = [
        "",
        "令和８年10月25日～令和８年11月21日　市民課窓口班（審査担当）シフト",
        "", "", "", "", "", "", "", "", "", "", "", "", "",
        "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
      ];
      const row1 = new Array(31).fill("");
      const row3 = ["", "R", "", "10-11月",
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
      const staff = ["", "1", "", name,
        "週", "", "", "", "", "", "週",
        "週", "", "祝", "", "", "", "週",
        "週", "", "", "", "", "", "週",
        "週", "", "", "", "", "", "週",
      ];
      const aggregate = ["", "集計", "", "Ａ",
        ...new Array(28).fill("0"),
      ];
      return [row0, row1, row3, row4, staff, aggregate];
    }

    it("漢字の名前を読み取る（田中太郎）", () => {
      const result = parseGovernmentShift(buildGridWithJapaneseName("田中太郎"));
      expect(result.staffEntries).toHaveLength(1);
      expect(result.staffEntries[0].name).toBe("田中太郎");
    });

    it("漢字の姓名をスペース区切りで読む（山田 花子）", () => {
      const result = parseGovernmentShift(buildGridWithJapaneseName("山田 花子"));
      expect(result.staffEntries).toHaveLength(1);
      expect(result.staffEntries[0].name).toBe("山田 花子");
    });

    it("カタカナの名前を読む（タナカ タロウ）", () => {
      const result = parseGovernmentShift(buildGridWithJapaneseName("タナカ タロウ"));
      expect(result.staffEntries).toHaveLength(1);
      expect(result.staffEntries[0].name).toBe("タナカ タロウ");
    });

    it("1文字の名前も読み取れる（構造ベースの判定）", () => {
      const result = parseGovernmentShift(buildGridWithJapaneseName("泉"));
      expect(result.staffEntries).toHaveLength(1);
      expect(result.staffEntries[0].name).toBe("泉");
    });
  });

  describe("月間休暇日数の読み取り", () => {
    it("AI4セルの数値を読み取る", () => {
      const grid = buildSampleGrid();
      // col 34 (AI) の日付行（row 3）に月間休暇日数を設定
      while (grid[3].length <= 34) grid[3].push("");
      grid[3][34] = "8";
      const result = parseGovernmentShift(grid);
      expect(result.holidayCount).toBe(8);
    });

    it("AI4セルが空なら undefined", () => {
      const grid = buildSampleGrid();
      const result = parseGovernmentShift(grid);
      expect(result.holidayCount).toBeUndefined();
    });
  });

  describe("凡例の読み取り", () => {
    it("AW/AX列の「時間帯」ヘッダー下からシンボルを読み取る", () => {
      const grid = buildSampleGrid();
      // col 48 (AW), col 49 (AX) に凡例を追加
      // 正規職員セクション（row 4-9）
      while (grid[4].length <= 49) grid[4].push("");
      grid[4][48] = "時間帯";
      while (grid[5].length <= 49) grid[5].push("");
      grid[5][48] = "Ａ"; grid[5][49] = "8：00～16：45";
      while (grid[6].length <= 49) grid[6].push("");
      grid[6][48] = "Ｂ"; grid[6][49] = "8：30～17：15";
      // 会計年度任用セクション（row 17-）
      while (grid.length <= 17) grid.push(new Array(50).fill(""));
      grid[17] = new Array(50).fill("");
      grid[17][48] = "時間帯";
      grid.push(new Array(50).fill(""));
      grid[18][48] = "①"; grid[18][49] = "8:30～15:30";

      const result = parseGovernmentShift(grid);
      expect(result.legendSections).toHaveLength(2);
      expect(result.legendSections[0].symbols).toEqual(["Ａ", "Ｂ"]);
      expect(result.legendSections[0].descriptions).toEqual(["8：00～16：45", "8：30～17：15"]);
      expect(result.legendSections[1].symbols).toEqual(["①"]);
      expect(result.legendSections[1].descriptions).toEqual(["8:30～15:30"]);
    });

    it("凡例がないグリッドではlegendSectionsが空", () => {
      const grid = buildSampleGrid();
      const result = parseGovernmentShift(grid);
      expect(result.legendSections).toEqual([]);
    });
  });
});
