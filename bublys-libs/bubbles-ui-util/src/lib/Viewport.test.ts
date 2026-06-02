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

  describe("parentScale（universe が親で CSS scale されている場合）", () => {
    // universe 原点は screen(100, 100)。viewport は screen(100, 100) から 900x720。
    // 親が scale(0.9) で縮小しているので、universe 単位の可視領域は 1000x800、
    // universe 内の (X, Y) は screen(100 + X*0.9, 100 + Y*0.9) に写る。
    const vp = Viewport.fromMeasuredRects(
      { x: 100, y: 100 },
      { x: 100, y: 100, width: 900, height: 720 },
      0.9,
    );

    it("size は universe 単位（screen / scale）", () => {
      expect(vp.size).toEqual({ width: 1000, height: 800 });
    });

    it("screenToUniverse は origin を引いて scale で割る", () => {
      // universe(100, 100) は screen(100 + 90, 100 + 90) = (190, 190) にあるはず。
      expect(vp.screenToUniverse({ x: 190, y: 190 })).toEqual({ x: 100, y: 100 });
    });

    it("universeToScreen は screenToUniverse の逆", () => {
      const u = { x: 250, y: 100 };
      expect(vp.screenToUniverse(vp.universeToScreen(u))).toEqual(u);
    });

    it("screenSizeToUniverse は scale で割る", () => {
      // 親 scale 0.9 のもとで screen 上 90x45 のサイズは universe 単位で 100x50。
      expect(vp.screenSizeToUniverse({ width: 90, height: 45 })).toEqual({
        width: 100,
        height: 50,
      });
    });

    it("parentScale が 0 や負のときは 1 として扱う（DOM未準備への保険）", () => {
      const safe = Viewport.fromMeasuredRects(
        { x: 0, y: 0 },
        { x: 0, y: 0, width: 100, height: 100 },
        0,
      );
      expect(safe.parentScale).toBe(1);
      expect(safe.size).toEqual({ width: 100, height: 100 });
    });
  });
});
