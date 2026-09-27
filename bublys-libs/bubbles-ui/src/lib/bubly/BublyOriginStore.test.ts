import { normalizeBublyOrigin } from "./BublyOriginStore.js";

/**
 * 打った所から `{origin}/bubly.js` までの間で、何を落とし何を補うか。
 * ここが緩いと、取りに行く先が黙ってずれる（OS 自身を取りに行っていた）。
 */
describe("normalizeBublyOrigin", () => {
  it("そのままの形は変えない", () => {
    expect(normalizeBublyOrigin("http://localhost:4001")).toBe("http://localhost:4001");
    expect(normalizeBublyOrigin("https://ekikyo.bublys.ooo")).toBe("https://ekikyo.bublys.ooo");
  });

  it("scheme を省いても足す", () => {
    expect(normalizeBublyOrigin("localhost:4001")).toBe("http://localhost:4001");
    expect(normalizeBublyOrigin("bublys.ooo")).toBe("http://bublys.ooo");
  });

  it("コロンの打ち損ないを直す", () => {
    expect(normalizeBublyOrigin("http/localhost:4001")).toBe("http://localhost:4001");
    expect(normalizeBublyOrigin("http:/localhost:4001")).toBe("http://localhost:4001");
    expect(normalizeBublyOrigin("https:///ekikyo.bublys.ooo")).toBe("https://ekikyo.bublys.ooo");
  });

  it("後ろに付いた道・クエリ・印を落とす", () => {
    expect(normalizeBublyOrigin("http://localhost:4001/")).toBe("http://localhost:4001");
    expect(normalizeBublyOrigin("http://localhost:4001/bubly.js")).toBe("http://localhost:4001");
    expect(normalizeBublyOrigin("http://localhost:4001/tasks?q=1#x")).toBe("http://localhost:4001");
    expect(normalizeBublyOrigin("localhost:4001/tasks")).toBe("http://localhost:4001");
  });

  it("前後の空きを落とす", () => {
    expect(normalizeBublyOrigin("  http://localhost:4001/  ")).toBe("http://localhost:4001");
  });

  it("畳めないものは空（＝押せない の合図）", () => {
    expect(normalizeBublyOrigin("")).toBe("");
    expect(normalizeBublyOrigin("   ")).toBe("");
    expect(normalizeBublyOrigin("://")).toBe("");
    expect(normalizeBublyOrigin("http://")).toBe("");
  });
});
