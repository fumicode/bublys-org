import { bublyOriginCandidates, normalizeBublyOrigin } from "./BublyOriginStore.js";

describe("normalizeBublyOrigin", () => {
  it("保存の形だけ揃える（前後の空きと末尾スラッシュ）", () => {
    expect(normalizeBublyOrigin("  http://localhost:4001/  ")).toBe("http://localhost:4001");
    expect(normalizeBublyOrigin("localhost:4001")).toBe("localhost:4001");
  });
});

/**
 * 打った字は捨てない。畳めたものを先に、打ったそのままを後ろに。
 * どちらで取りに行くかを選ぶのは打った人なので、ここは並べるだけ。
 */
describe("bublyOriginCandidates", () => {
  it("すでにオリジンなら 1 つだけ（選ぶ所は要らない）", () => {
    expect(bublyOriginCandidates("http://localhost:4001")).toEqual(["http://localhost:4001"]);
    expect(bublyOriginCandidates("  http://localhost:4001  ")).toEqual(["http://localhost:4001"]);
  });

  it("scheme が無ければ、補ったものと打ったそのままを並べる", () => {
    expect(bublyOriginCandidates("localhost:4001")).toEqual([
      "http://localhost:4001",
      "localhost:4001",
    ]);
  });

  it("コロンの打ち損ないも、直したものと打ったそのままを並べる", () => {
    expect(bublyOriginCandidates("http/localhost:4001")).toEqual([
      "http://localhost:4001",
      "http/localhost:4001",
    ]);
  });

  it("後ろの道・クエリ・印を落としたものを先に出す（打ったものも残す）", () => {
    expect(bublyOriginCandidates("http://localhost:4001/tasks?q=1#x")).toEqual([
      "http://localhost:4001",
      "http://localhost:4001/tasks?q=1#x",
    ]);
  });

  it("畳めなくても、打ったものは候補として残る", () => {
    expect(bublyOriginCandidates("http://")).toEqual(["http://"]);
  });

  it("空のときだけ候補が無い", () => {
    expect(bublyOriginCandidates("")).toEqual([]);
    expect(bublyOriginCandidates("   ")).toEqual([]);
  });
});
