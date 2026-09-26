import {
  applyTransform,
  applyMappingRule,
  collectAtPath,
  getAtPath,
  setAtPath,
} from "./transform.js";
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

  it("toNumber returns original value for non-numeric strings", () => {
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

describe("getAtPath / setAtPath", () => {
  it("getAtPath returns nested values", () => {
    const obj = { a: { b: { c: 42 } } };
    expect(getAtPath(obj, ["a", "b", "c"])).toBe(42);
    expect(getAtPath(obj, ["a", "b"])).toEqual({ c: 42 });
    expect(getAtPath(obj, ["missing"])).toBeUndefined();
  });

  it("setAtPath creates nested objects as needed", () => {
    const obj: Record<string, unknown> = {};
    setAtPath(obj, ["a", "b", "c"], 42);
    expect(obj).toEqual({ a: { b: { c: 42 } } });
  });
});

describe("applyMappingRule", () => {
  const mappings: FieldMapping[] = [
    { sourcePath: "名前", targetPath: "name", transform: { type: "identity" } },
    { sourcePath: "メール", targetPath: "email", transform: { type: "identity" } },
    { sourcePath: "年齢", targetPath: "age", transform: { type: "toNumber" } },
  ];

  const rule = new MappingRule({
    id: "test-rule",
    name: "テストルール",
    targetSchemaId: "Staff",
    mappings,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  });

  it("converts source array using mapping rule", () => {
    const sources = [
      { id: "1", 名前: "田中太郎", メール: "tanaka@example.com", 年齢: "25" },
      { id: "2", 名前: "鈴木花子", メール: "suzuki@example.com", 年齢: "30" },
    ];

    const result = applyMappingRule(sources, rule);

    expect(result).toEqual([
      { name: "田中太郎", email: "tanaka@example.com", age: 25 },
      { name: "鈴木花子", email: "suzuki@example.com", age: 30 },
    ]);
  });

  it("skips undefined source paths", () => {
    const sources = [{ id: "1", 名前: "田中太郎" }];
    const result = applyMappingRule(sources, rule);
    expect(result).toEqual([{ name: "田中太郎" }]);
  });

  it("supports nested target paths", () => {
    const nestedRule = new MappingRule({
      id: "r",
      name: "nested",
      targetSchemaId: "T",
      mappings: [
        { sourcePath: "city", targetPath: "address.city", transform: { type: "identity" } },
        { sourcePath: "zip", targetPath: "address.zip", transform: { type: "identity" } },
      ],
      createdAt: "",
      updatedAt: "",
    });
    const result = applyMappingRule([{ city: "Tokyo", zip: "100-0001" }], nestedRule);
    expect(result).toEqual([{ address: { city: "Tokyo", zip: "100-0001" } }]);
  });

  it("supports nested source paths", () => {
    const rule2 = new MappingRule({
      id: "r",
      name: "nested-src",
      targetSchemaId: "T",
      mappings: [
        { sourcePath: "user.name", targetPath: "name", transform: { type: "identity" } },
      ],
      createdAt: "",
      updatedAt: "",
    });
    const result = applyMappingRule([{ user: { name: "Alice" } }], rule2);
    expect(result).toEqual([{ name: "Alice" }]);
  });

  it("handles empty source array", () => {
    expect(applyMappingRule([], rule)).toEqual([]);
  });
});

describe("並びの中へ繋ぐ", () => {
  /** CSV の 1 行 → メモの段落 1 つ */
  const rule = MappingRule.create("行を段落に", "memo", [
    { sourcePath: "本文", targetPath: "blocks[].content", transform: { type: "identity" } },
    { sourcePath: "種類", targetPath: "blocks[].type", transform: { type: "identity" } },
  ]);
  const rows = [
    { 本文: "題名", 種類: "text" },
    { 本文: "こんにちは", 種類: "text" },
    { 本文: "また明日", 種類: "text" },
  ];

  it("ソース 1 件ごとに要素が 1 つできて、ひとつのものに集まる", () => {
    const out = applyMappingRule(rows, rule);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({
      blocks: [
        { content: "題名", type: "text" },
        { content: "こんにちは", type: "text" },
        { content: "また明日", type: "text" },
      ],
    });
  });

  it("並びとして作られる（番号を名前に持つ「もの」ではない）", () => {
    expect(Array.isArray(applyMappingRule(rows, rule)[0].blocks)).toBe(true);
  });

  it("ソースの順番が、そのまま並びの順番", () => {
    const out = applyMappingRule(rows, rule)[0].blocks as { content: string }[];
    expect(out.map((b) => b.content)).toEqual(["題名", "こんにちは", "また明日"]);
  });

  it("並びの外へ繋いだ項目は、最初の 1 件から取る", () => {
    const withOuter = rule.addMapping({
      sourcePath: "書いた人",
      targetPath: "authorId",
      transform: { type: "identity" },
    });
    const out = applyMappingRule(
      rows.map((r, i) => ({ ...r, 書いた人: i === 0 ? "u1" : "u2" })),
      withOuter,
    );
    expect(out).toHaveLength(1);
    expect(out[0].authorId).toBe("u1");
  });

  it("ソースが無ければ、何も作らない", () => {
    expect(applyMappingRule([], rule)).toEqual([]);
  });

  it("並びの外だけに繋いだときは、これまでどおり 1 件 → 1 つ", () => {
    const flat = MappingRule.create("そのまま", "user", [
      { sourcePath: "本文", targetPath: "name", transform: { type: "identity" } },
    ]);
    expect(applyMappingRule(rows, flat)).toHaveLength(3);
  });

  it("読むときの [] は最初の一つ（見本のため）", () => {
    const memo = { blocks: [{ content: "題名" }, { content: "二行目" }] };
    expect(getAtPath(memo, ["blocks[]", "content"])).toBe("題名");
  });
});

describe("出来たものを読む", () => {
  const memo = {
    id: "m1",
    blocks: [{ content: "題名" }, { content: "こんにちは" }, { content: "また明日" }],
  };

  it("並びの中を指す道は、全部取れる", () => {
    expect(collectAtPath(memo, ["blocks[]", "content"])).toEqual([
      "題名",
      "こんにちは",
      "また明日",
    ]);
  });

  it("並びの外は 1 つだけ", () => {
    expect(collectAtPath(memo, ["id"])).toEqual(["m1"]);
  });

  it("無いものは空", () => {
    expect(collectAtPath(memo, ["tags[]", "name"])).toEqual([]);
    expect(collectAtPath(memo, ["authorId"])).toEqual([]);
  });
});
