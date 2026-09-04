import { applyTransform, applyMappingRule } from "./transform.js";
import { MappingRule } from "./MappingRule.js";
import type { ValueTransform, FieldMapping } from "./MappingRule.js";

describe("applyTransform", () => {
  it("identity transform returns the value as-is", () => {
    expect(applyTransform("hello", { type: "identity" })).toBe("hello");
  });

  it("toNumber converts numeric strings", () => {
    expect(applyTransform("42", { type: "toNumber" })).toBe(42);
    expect(applyTransform("3.14", { type: "toNumber" })).toBe(3.14);
  });

  it("toNumber returns original string for non-numeric values", () => {
    expect(applyTransform("abc", { type: "toNumber" })).toBe("abc");
  });

  it("toBoolean returns true for matching values", () => {
    const t: ValueTransform = {
      type: "toBoolean",
      trueValues: ["はい", "yes", "1"],
    };
    expect(applyTransform("はい", t)).toBe(true);
    expect(applyTransform("yes", t)).toBe(true);
    expect(applyTransform("1", t)).toBe(true);
  });

  it("toBoolean returns false for non-matching values", () => {
    const t: ValueTransform = {
      type: "toBoolean",
      trueValues: ["はい", "yes"],
    };
    expect(applyTransform("いいえ", t)).toBe(false);
    expect(applyTransform("no", t)).toBe(false);
  });

  it("dictionary maps known values", () => {
    const t: ValueTransform = {
      type: "dictionary",
      map: { 男: "male", 女: "female" },
    };
    expect(applyTransform("男", t)).toBe("male");
    expect(applyTransform("女", t)).toBe("female");
  });

  it("dictionary passes through unknown values", () => {
    const t: ValueTransform = {
      type: "dictionary",
      map: { 男: "male" },
    };
    expect(applyTransform("その他", t)).toBe("その他");
  });
});

describe("applyMappingRule", () => {
  const mappings: FieldMapping[] = [
    { sourceKey: "名前", targetProperty: "name", transform: { type: "identity" } },
    { sourceKey: "メール", targetProperty: "email", transform: { type: "identity" } },
    { sourceKey: "年齢", targetProperty: "age", transform: { type: "toNumber" } },
  ];

  const rule = new MappingRule({
    id: "test-rule",
    name: "テストルール",
    targetSchemaId: "staff-schema",
    mappings,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  });

  it("converts PlaneObject array using mapping rule", () => {
    const planeObjects = [
      { id: "1", name: "田中", 名前: "田中太郎", メール: "tanaka@example.com", 年齢: "25" },
      { id: "2", name: "鈴木", 名前: "鈴木花子", メール: "suzuki@example.com", 年齢: "30" },
    ];

    const result = applyMappingRule(planeObjects, rule);

    expect(result).toEqual([
      { name: "田中太郎", email: "tanaka@example.com", age: 25 },
      { name: "鈴木花子", email: "suzuki@example.com", age: 30 },
    ]);
  });

  it("skips undefined source keys", () => {
    const planeObjects = [
      { id: "1", name: "田中", 名前: "田中太郎" },
    ];

    const result = applyMappingRule(planeObjects, rule);

    expect(result).toEqual([{ name: "田中太郎" }]);
  });

  it("handles empty planeObjects array", () => {
    expect(applyMappingRule([], rule)).toEqual([]);
  });
});
