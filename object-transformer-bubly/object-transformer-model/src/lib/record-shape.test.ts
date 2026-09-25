/**
 * **キーが決まっていない辞書（`record`）は、まるごとで 1 つの繋ぎ先。**
 *
 * メモの本文（`Record<blockId, MemoBlock>`）や CSV のセル（`Record<columnId, string>`）は、
 * キーが実行時にしか無い。中の 1 つ 1 つには名前が無く `blocks.<なにか>.content` という道が
 * 書けないので、配列と同じく**潜らない** ── その決まりを、変換エディタが実際に使う
 * `DomainSchema` の側から確かめる。
 */
import {
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
