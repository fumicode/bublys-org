import { describe, it, expect } from "vitest";
import {
  GOVERNMENT_SYMBOL_MAPPING,
  SymbolMapping,
} from "./SymbolMapping.js";

describe("GOVERNMENT_SYMBOL_MAPPING", () => {
  const mapping = GOVERNMENT_SYMBOL_MAPPING;

  describe("休みの希望", () => {
    it("「週」は週休の希望（day-off:週）", () => {
      const result = mapping.interpret("週");
      expect(result).toEqual({
        kind: "wish",
        options: [{ optionKey: "day-off:週", preference: "want" }],
      });
    });

    it("「祝」は祝日の希望（day-off:祝）", () => {
      const result = mapping.interpret("祝");
      expect(result).toEqual({
        kind: "wish",
        options: [{ optionKey: "day-off:祝", preference: "want" }],
      });
    });

    it("「休」は休暇の希望（day-off:休）", () => {
      const result = mapping.interpret("休");
      expect(result).toEqual({
        kind: "wish",
        options: [{ optionKey: "day-off:休", preference: "want" }],
      });
    });
  });

  describe("休暇の希望", () => {
    it("「年」は年休の希望（day-off:年）", () => {
      const result = mapping.interpret("年");
      expect(result).toEqual({
        kind: "wish",
        options: [{ optionKey: "day-off:年", preference: "want" }],
      });
    });

    it("「PM年」は午後年休の希望（day-off:PM年）", () => {
      const result = mapping.interpret("PM年");
      expect(result).toEqual({
        kind: "wish",
        options: [{ optionKey: "day-off:PM年", preference: "want" }],
      });
    });

    it("「介護」は介護休暇の希望（day-off:介護）", () => {
      const result = mapping.interpret("介護");
      expect(result).toEqual({
        kind: "wish",
        options: [{ optionKey: "day-off:介護", preference: "want" }],
      });
    });
  });

  describe("勤務帯の希望", () => {
    it("「B」は B勤務の希望", () => {
      const result = mapping.interpret("B");
      expect(result).toEqual({
        kind: "wish",
        options: [{ optionKey: "work:B勤務", preference: "want" }],
      });
    });

    it("「①」は ①勤務の希望", () => {
      const result = mapping.interpret("①");
      expect(result).toEqual({
        kind: "wish",
        options: [{ optionKey: "work:①勤務", preference: "want" }],
      });
    });
  });

  describe("曖昧な希望", () => {
    it("「①ｏｒ②」は ①と② 両方の want", () => {
      const result = mapping.interpret("①ｏｒ②");
      expect(result).toEqual({
        kind: "wish",
        options: [
          { optionKey: "work:①勤務", preference: "want" },
          { optionKey: "work:②勤務", preference: "want" },
        ],
      });
    });

    it("半角の「①or②」も同じ", () => {
      const result = mapping.interpret("①or②");
      expect(result).toEqual({
        kind: "wish",
        options: [
          { optionKey: "work:①勤務", preference: "want" },
          { optionKey: "work:②勤務", preference: "want" },
        ],
      });
    });
  });

  describe("空欄", () => {
    it("空文字列は空欄", () => {
      expect(mapping.isEmpty("")).toBe(true);
    });

    it("空白のみも空欄", () => {
      expect(mapping.isEmpty("  ")).toBe(true);
    });

    it("「B」は空欄ではない", () => {
      expect(mapping.isEmpty("B")).toBe(false);
    });
  });

  describe("未知の記号", () => {
    it("未知の記号は undefined", () => {
      expect(mapping.interpret("不明")).toBeUndefined();
    });
  });

  describe("逆引き", () => {
    it("週休の希望キーの記号を逆引き", () => {
      expect(mapping.symbolForWish("day-off:週")).toBe("週");
    });

    it("祝日の希望キーの記号を逆引き", () => {
      expect(mapping.symbolForWish("day-off:祝")).toBe("祝");
    });

    it("年休の希望キーの記号を逆引き", () => {
      expect(mapping.symbolForWish("day-off:年")).toBe("年");
    });

    it("B勤務のオプションキーの記号を逆引き", () => {
      expect(mapping.symbolForWish("work:B勤務")).toBe("B");
    });
  });

  describe("前後の空白はトリムする", () => {
    it("「 B 」でも B として解釈する", () => {
      const result = mapping.interpret(" B ");
      expect(result).toEqual({
        kind: "wish",
        options: [{ optionKey: "work:B勤務", preference: "want" }],
      });
    });
  });

  describe("更新（不変）", () => {
    it("記号を追加できる", () => {
      const updated = mapping.addEntry({
        symbol: "研修",
        interpretation: { kind: "wish", options: [{ optionKey: "training", preference: "want" }] },
        label: "研修",
      });
      expect(updated.interpret("研修")).toEqual({
        kind: "wish",
        options: [{ optionKey: "training", preference: "want" }],
      });
      // 元のインスタンスは変わらない
      expect(mapping.interpret("研修")).toBeUndefined();
    });

    it("同じ記号を追加すると上書きされる", () => {
      const updated = mapping.addEntry({
        symbol: "週",
        interpretation: { kind: "empty" },
        label: "変更後",
      });
      expect(updated.interpret("週")).toEqual({ kind: "empty" });
      // 重複しない（entries に「週」が1つだけ）
      expect(updated.entries.filter((e) => e.symbol === "週")).toHaveLength(1);
    });

    it("記号を削除できる", () => {
      const updated = mapping.removeEntry("週");
      expect(updated.interpret("週")).toBeUndefined();
      // 元のインスタンスは変わらない
      expect(mapping.interpret("週")).toBeDefined();
    });

    it("記号のラベルを更新できる", () => {
      const updated = mapping.updateEntry("週", { label: "定休日" });
      const entry = updated.entries.find((e) => e.symbol === "週");
      expect(entry?.label).toBe("定休日");
      // 解釈は変わらない
      expect(updated.interpret("週")).toEqual({
        kind: "wish",
        options: [{ optionKey: "day-off:週", preference: "want" }],
      });
    });
  });

  describe("シリアライズ", () => {
    it("toPlain → fromPlain で往復できる", () => {
      const plain = mapping.toPlain();
      const restored = SymbolMapping.fromPlain(plain);
      // 全エントリが復元される
      expect(restored.entries).toHaveLength(mapping.entries.length);
      // 解釈が同じ
      expect(restored.interpret("週")).toEqual(mapping.interpret("週"));
      expect(restored.interpret("B")).toEqual(mapping.interpret("B"));
      expect(restored.interpret("①ｏｒ②")).toEqual(mapping.interpret("①ｏｒ②"));
    });

    it("plain は JSON.stringify できる", () => {
      const plain = mapping.toPlain();
      const json = JSON.stringify(plain);
      const parsed = JSON.parse(json);
      const restored = SymbolMapping.fromPlain(parsed);
      expect(restored.interpret("年")).toEqual(mapping.interpret("年"));
    });
  });
});
