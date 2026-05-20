import { Viewport } from "./Viewport.js";

describe("Viewport", () => {
  // universe 原点は screen(50,20)。viewport は screen(70,20) から 800x600。
  // => 横に 20 スクロールした状態（universe が左へ 20 ずれている）
  const viewport = Viewport.fromMeasuredRects(
    { x: 50, y: 20 },
    { x: 70, y: 20, width: 800, height: 600 },
  );

  it("scroll = viewport左上 - universe左上（universe 座標）", () => {
    expect(viewport.scroll).toEqual({ x: 20, y: 0 });
  });

  it("size は可視ピクセル", () => {
    expect(viewport.size).toEqual({ width: 800, height: 600 });
  });

  it("screenToUniverse は universe 原点を引く", () => {
    expect(viewport.screenToUniverse({ x: 100, y: 50 })).toEqual({
      x: 50,
      y: 30,
    });
  });

  it("universeToScreen は screenToUniverse の逆", () => {
    const screen = { x: 123, y: 77 };
    expect(viewport.universeToScreen(viewport.screenToUniverse(screen))).toEqual(
      screen,
    );
  });

  it("visibleRegion は scroll を origin、可視ピクセルを size とする universe 矩形", () => {
    expect(viewport.visibleRegion()).toEqual({
      origin: { x: 20, y: 0 },
      size: { width: 800, height: 600 },
    });
  });

  it("スクロールしていなければ scroll は 0、screen と universe は原点ずれのみ", () => {
    const vp = Viewport.fromMeasuredRects(
      { x: 50, y: 20 },
      { x: 50, y: 20, width: 800, height: 600 },
    );
    expect(vp.scroll).toEqual({ x: 0, y: 0 });
    expect(vp.screenToUniverse({ x: 50, y: 20 })).toEqual({ x: 0, y: 0 });
  });
});
