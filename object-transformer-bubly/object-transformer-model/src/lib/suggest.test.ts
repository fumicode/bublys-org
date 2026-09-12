import { suggestMappings, type SourceLeaf } from "./suggest.js";
import { DomainSchema } from "./DomainSchema.js";
import {
  objectShape,
  primitiveShape,
  enumShape,
  type SchemaField,
} from "@bublys-org/domain-registry/schema";

const STAFF_SCHEMA = DomainSchema.of(
  "Staff",
  "Staff_スタッフ",
  objectShape([
    { name: "name", shape: primitiveShape("string"), required: true, label: "名前" },
    { name: "furigana", shape: primitiveShape("string"), required: true, label: "フリガナ" },
    { name: "email", shape: primitiveShape("string"), required: true, label: "メール" },
    { name: "phone", shape: primitiveShape("string"), required: true, label: "電話" },
    { name: "school", shape: primitiveShape("string"), required: true, label: "学校" },
    { name: "grade", shape: primitiveShape("string"), required: true, label: "学年" },
    {
      name: "gender",
      shape: enumShape(["male", "female", "other", "prefer_not_to_say"]),
      required: true,
      label: "性別",
    },
    { name: "notes", shape: primitiveShape("string"), required: false, label: "備考" },
  ] as readonly SchemaField[])
);

const sourcesFrom = (keys: string[], samples?: Record<string, string>): SourceLeaf[] =>
  keys.map((k) => ({ path: k, sampleValue: samples?.[k] }));

describe("suggestMappings", () => {
  it("matches exact property names (case-insensitive)", () => {
    const result = suggestMappings(
      sourcesFrom(["name", "email", "phone"]),
      STAFF_SCHEMA
    );

    expect(result.find((m) => m.targetPath === "name")?.sourcePath).toBe("name");
    expect(result.find((m) => m.targetPath === "email")?.sourcePath).toBe("email");
    expect(result.find((m) => m.targetPath === "phone")?.sourcePath).toBe("phone");
  });

  it("matches via alias dictionary", () => {
    const result = suggestMappings(
      sourcesFrom(["名前", "メールアドレス", "電話番号", "学校"]),
      STAFF_SCHEMA
    );

    expect(result.find((m) => m.targetPath === "name")?.sourcePath).toBe("名前");
    expect(result.find((m) => m.targetPath === "email")?.sourcePath).toBe("メールアドレス");
    expect(result.find((m) => m.targetPath === "phone")?.sourcePath).toBe("電話番号");
    expect(result.find((m) => m.targetPath === "school")?.sourcePath).toBe("学校");
  });

  it("matches via label", () => {
    const result = suggestMappings(
      sourcesFrom(["フリガナ", "学年"]),
      STAFF_SCHEMA
    );

    expect(result.find((m) => m.targetPath === "furigana")?.sourcePath).toBe("フリガナ");
    expect(result.find((m) => m.targetPath === "grade")?.sourcePath).toBe("学年");
  });

  it("uses value pattern matching for email", () => {
    const result = suggestMappings(
      sourcesFrom(["連絡先"], { 連絡先: "test@example.com" }),
      STAFF_SCHEMA
    );

    const email = result.find((m) => m.targetPath === "email");
    expect(email?.sourcePath).toBe("連絡先");
  });

  it("does not duplicate source or target in suggestions", () => {
    const result = suggestMappings(
      sourcesFrom(["名前", "氏名"]),
      STAFF_SCHEMA
    );

    const nameTargets = result.filter((m) => m.targetPath === "name");
    expect(nameTargets).toHaveLength(1);
  });

  it("returns empty array when no matches found", () => {
    const result = suggestMappings(
      sourcesFrom(["aaa", "bbb", "ccc"]),
      STAFF_SCHEMA
    );
    expect(result).toEqual([]);
  });

  it("assigns toNumber transform for number-typed properties", () => {
    const schema = DomainSchema.of(
      "Test",
      "Test",
      objectShape([
        { name: "age", shape: primitiveShape("number"), required: true, label: "年齢" },
      ])
    );

    const result = suggestMappings(sourcesFrom(["年齢"]), schema);
    expect(result[0]?.transform).toEqual({ type: "toNumber" });
  });

  it("works for nested target paths", () => {
    const schema = DomainSchema.of(
      "Person",
      "Person",
      objectShape([
        { name: "name", shape: primitiveShape("string"), required: true },
        {
          name: "address",
          shape: objectShape([
            { name: "city", shape: primitiveShape("string"), required: false, label: "市" },
            { name: "zip", shape: primitiveShape("string"), required: false, label: "郵便番号" },
          ]),
          required: false,
        },
      ])
    );

    const result = suggestMappings(sourcesFrom(["name", "city", "zip"]), schema);
    expect(result.find((m) => m.targetPath === "address.city")?.sourcePath).toBe("city");
    expect(result.find((m) => m.targetPath === "address.zip")?.sourcePath).toBe("zip");
    expect(result.find((m) => m.targetPath === "name")?.sourcePath).toBe("name");
  });
});
