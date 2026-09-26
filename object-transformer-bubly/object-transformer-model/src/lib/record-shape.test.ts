/**
 * **キーが決まっていない辞書（`record`）は、まるごとで 1 つの繋ぎ先。**
 *
 * メモの本文（`Record<blockId, MemoBlock>`）や CSV のセル（`Record<columnId, string>`）は、
 * キーが実行時にしか無い。中の 1 つ 1 つには名前が無く `blocks.<なにか>.content` という道が
 * 書けないので、配列と同じく**潜らない** ── その決まりを、変換エディタが実際に使う
 * `DomainSchema` の側から確かめる。
 */
import {
  arrayShape,
  objectShape,
  primitiveShape,
  recordShape,
  shapeKindLabel,
  pathToString,
} from "@bublys-org/domain-registry/schema";
import { DomainSchema } from "./DomainSchema.js";
import { validateMapping } from "./validate.js";

const MEMO = DomainSchema.of(
  "Memo",
  "メモ",
  objectShape([
    { name: "id", shape: primitiveShape("string"), required: true },
    {
      name: "blocks",
      shape: recordShape(
        objectShape([
          { name: "id", shape: primitiveShape("string"), required: true },
          { name: "content", shape: primitiveShape("string"), required: true },
        ]),
      ),
      required: true,
      label: "本文",
    },
  ]),
);

describe("record を語彙に足したあとの繋ぎ先", () => {
  it("辞書は 1 つの繋ぎ先として出る（中の項目には名前が無いので潜らない）", () => {
    const paths = MEMO.leafFields.map(({ path }) => pathToString(path));
    expect(paths).toEqual(["id", "blocks"]);
  });

  it("辞書の中へは道が引けない", () => {
    expect(MEMO.getFieldAt(["blocks", "content"])).toBeUndefined();
  });

  it("辞書そのものは引ける", () => {
    expect(MEMO.getFieldAt(["blocks"])?.label).toBe("本文");
  });

  it("型の名前は中身まで見せる", () => {
    expect(shapeKindLabel(recordShape(primitiveShape("string")))).toBe("record<string>");
  });

  it("辞書は値の検証をしない（複合型は素通し）", () => {
    const field = MEMO.getFieldAt(["blocks"]);
    expect(field).toBeDefined();
    expect(validateMapping("cells", field!, "なんでも").valid).toBe(true);
  });
});

/**
 * **並びには番号がある。だから中へ道が引ける。**
 *
 * 辞書との違いはここ。ただし中に項目が無い並び（文字列の並び）は、
 * 引ける道が「並びそのもの」しかない。
 */
const MEMO_V2 = DomainSchema.of(
  "Memo",
  "メモ",
  objectShape([
    { name: "id", shape: primitiveShape("string"), required: true },
    {
      name: "blocks",
      shape: arrayShape(
        objectShape([
          { name: "type", shape: primitiveShape("string"), required: true },
          { name: "content", shape: primitiveShape("string"), required: true, label: "中身" },
        ]),
      ),
      required: true,
      label: "段落の並び",
    },
    {
      name: "tags",
      shape: arrayShape(primitiveShape("string")),
      required: false,
      label: "ふだ",
    },
  ]),
);

describe("並びの中への道", () => {
  it("中身が項目を持つ並びは、中へ潜る", () => {
    expect(MEMO_V2.leafFields.map(({ path }) => pathToString(path))).toEqual([
      "id",
      "blocks[].type",
      "blocks[].content",
      "tags",
    ]);
  });

  it("並びの中の項目を引ける", () => {
    expect(MEMO_V2.getFieldAt(["blocks[]", "content"])?.label).toBe("中身");
  });

  it("文字列の並びは、まるごとで 1 つ（中に項目が無い）", () => {
    expect(MEMO_V2.getFieldAt(["tags"])?.label).toBe("ふだ");
    expect(MEMO_V2.getFieldAt(["tags[]", "content"])).toBeUndefined();
  });
});
