import { suggestMappings } from "./suggest.js";
import { DomainSchema } from "./DomainSchema.js";
import { STAFF_SCHEMA } from "./schemas/staff-schema.js";

describe("suggestMappings", () => {
  it("matches exact property names (case-insensitive)", () => {
    const sourceKeys = ["name", "email", "phone"];
    const result = suggestMappings(sourceKeys, STAFF_SCHEMA);

    expect(result.find((m) => m.targetProperty === "name")?.sourceKey).toBe(
      "name"
    );
    expect(result.find((m) => m.targetProperty === "email")?.sourceKey).toBe(
      "email"
    );
    expect(result.find((m) => m.targetProperty === "phone")?.sourceKey).toBe(
      "phone"
    );
  });

  it("matches via alias dictionary", () => {
    const sourceKeys = ["名前", "メールアドレス", "電話番号", "学校"];
    const result = suggestMappings(sourceKeys, STAFF_SCHEMA);

    expect(result.find((m) => m.targetProperty === "name")?.sourceKey).toBe(
      "名前"
    );
    expect(result.find((m) => m.targetProperty === "email")?.sourceKey).toBe(
      "メールアドレス"
    );
    expect(result.find((m) => m.targetProperty === "phone")?.sourceKey).toBe(
      "電話番号"
    );
    expect(result.find((m) => m.targetProperty === "school")?.sourceKey).toBe(
      "学校"
    );
  });

  it("matches via label", () => {
    const sourceKeys = ["フリガナ", "学年"];
    const result = suggestMappings(sourceKeys, STAFF_SCHEMA);

    expect(
      result.find((m) => m.targetProperty === "furigana")?.sourceKey
    ).toBe("フリガナ");
    expect(result.find((m) => m.targetProperty === "grade")?.sourceKey).toBe(
      "学年"
    );
  });

  it("uses value pattern matching for email", () => {
    const sourceKeys = ["連絡先"];
    const result = suggestMappings(sourceKeys, STAFF_SCHEMA, {
      連絡先: "test@example.com",
    });

    // "連絡先"はエイリアスにないが、値パターンでemail候補になる
    const emailSuggestion = result.find((m) => m.targetProperty === "email");
    expect(emailSuggestion?.sourceKey).toBe("連絡先");
  });

  it("does not duplicate source or target in suggestions", () => {
    const sourceKeys = ["名前", "氏名"]; // 両方"name"のエイリアス
    const result = suggestMappings(sourceKeys, STAFF_SCHEMA);

    const nameTargets = result.filter((m) => m.targetProperty === "name");
    expect(nameTargets).toHaveLength(1);
  });

  it("returns empty array when no matches found", () => {
    const sourceKeys = ["aaa", "bbb", "ccc"];
    const result = suggestMappings(sourceKeys, STAFF_SCHEMA);

    expect(result).toEqual([]);
  });

  it("assigns toNumber transform for number-typed properties", () => {
    const schema = new DomainSchema({
      id: "test",
      name: "Test",
      properties: [
        { name: "age", type: "number", required: true, label: "年齢" },
      ],
    });

    const result = suggestMappings(["年齢"], schema);
    expect(result[0]?.transform).toEqual({ type: "toNumber" });
  });
});
