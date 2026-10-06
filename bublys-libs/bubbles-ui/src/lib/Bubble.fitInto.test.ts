import { Bubble } from "./Bubble.domain";

const makeBubble = (
  position: { x: number; y: number },
  size?: { width: number; height: number },
  defaultSize?: { width: number; height: number },
) =>
  new Bubble({
    url: "test",
    position,
    size,
    params: {},
    bubbleOptions: defaultSize ? { defaultSize } : undefined,
  } as ConstructorParameters<typeof Bubble>[0]);

/** 見えている範囲：(0,0) から 1000×600 */
const region = { origin: { x: 0, y: 0 }, size: { width: 1000, height: 600 } };

describe("Bubble.fitInto — 見えている範囲からはみ出さない", () => {
  it("収まっていれば何も変えない（大きさを決めていないバブルは決めないまま）", () => {
    const b = makeBubble({ x: 100, y: 50 });
    expect(b.fitInto(region)).toBe(b);
  });

  it("右へはみ出すなら、大きさはそのままで左へ寄せる", () => {
    const fitted = makeBubble({ x: 700, y: 0 }, { width: 400, height: 300 }).fitInto(region);
    expect(fitted.position).toEqual({ x: 600, y: 0 });
    expect(fitted.size).toEqual({ width: 400, height: 300 });
  });

  it("範囲より大きければ、範囲の大きさまで縮めて範囲の左上へ", () => {
    const fitted = makeBubble({ x: 400, y: 0 }, undefined, { width: 1560, height: 1100 }).fitInto(region);
    expect(fitted.position).toEqual({ x: 0, y: 0 });
    expect(fitted.size).toEqual({ width: 1000, height: 600 });
  });

  it("範囲がスクロールで動いていれば、その内側へ寄せる", () => {
    const scrolled = { origin: { x: 500, y: 200 }, size: region.size };
    const fitted = makeBubble({ x: 0, y: 0 }, { width: 400, height: 300 }).fitInto(scrolled);
    expect(fitted.position).toEqual({ x: 500, y: 200 });
  });
});
