/**
 * **メモが持つのは並び。割るのはしまうときだけ。**
 *
 * ここで確かめるのは主に「しまって、また出したときに同じものが戻るか」──
 * 保存形（番号札の列＋対応表）は変えていないので、**割れていた頃に保存されたメモも
 * そのまま読める**必要がある。
 */
import { Memo, type MemoPlain } from "./Memo.js";

/** 割れていた頃の形で保存されているメモ（番号札の列＋対応表） */
const SAVED: MemoPlain = {
  id: "m1",
  blocks: {
    b2: { id: "b2", type: "text", content: "こんにちは" },
    b1: { id: "b1", type: "text", content: "題名" },
    b3: { id: "b3", type: "text", content: "また明日" },
  },
  lines: ["b1", "b2", "b3"],
  authorId: "u1",
};

describe("しまってある形との行き来", () => {
  it("番号札の列の順に並ぶ（対応表の並び順ではない）", () => {
    expect(Memo.fromPlain(SAVED).blocks.map((b) => b.content)).toEqual([
      "題名",
      "こんにちは",
      "また明日",
    ]);
  });

  it("しまって出しても同じものが戻る", () => {
    const again = Memo.fromPlain(Memo.fromPlain(SAVED).toPlain());
    expect(again.toPlain()).toEqual(Memo.fromPlain(SAVED).toPlain());
    expect(again.authorId).toBe("u1");
  });

  it("番号札だけあって中身が無いものは飛ばす", () => {
    const broken: MemoPlain = {
      ...SAVED,
      blocks: { b1: SAVED.blocks.b1, b3: SAVED.blocks.b3 },
    };
    expect(Memo.fromPlain(broken).blocks.map((b) => b.id)).toEqual(["b1", "b3"]);
  });

  it("列に載っていない段落も捨てない（末尾に足す）", () => {
    const broken: MemoPlain = { ...SAVED, lines: ["b1"] };
    expect(Memo.fromPlain(broken).blocks.map((b) => b.id).sort()).toEqual(["b1", "b2", "b3"]);
  });
});

describe("段落をいじる", () => {
  const memo = Memo.fromPlain(SAVED);

  it("名前は 1 行目が決める", () => {
    expect(memo.title).toBe("題名");
    expect(Memo.create().title).toBe("");
  });

  it("差し込むと、そのすぐうしろに入る", () => {
    const { memo: next, newBlockId } = memo.insertTextBlockAfter("b1", "text", "差し込み");
    expect(next.blocks.map((b) => b.id)).toEqual(["b1", newBlockId, "b2", "b3"]);
  });

  it("前へ繋げると、中身が足されて 1 つ減る", () => {
    const next = memo.mergeBlock("b2");
    expect(next.blocks.map((b) => b.content)).toEqual(["題名こんにちは", "また明日"]);
  });

  it("先頭は前へ繋げられない", () => {
    expect(memo.mergeBlock("b1")).toBe(memo);
  });

  it("書き換えても元のメモは変わらない", () => {
    const next = memo.updateBlockContent("b2", "書き換え");
    expect(next.blocks[1].content).toBe("書き換え");
    expect(memo.blocks[1].content).toBe("こんにちは");
  });

  it("前後の段落を辿れる", () => {
    expect(memo.getNextBlockId("b1")).toBe("b2");
    expect(memo.getPrevBlockId("b2")).toBe("b1");
    expect(memo.getNextBlockId("b3")).toBeUndefined();
    expect(memo.getPrevBlockId("b1")).toBeUndefined();
  });
});
