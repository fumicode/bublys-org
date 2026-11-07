import {
  isNarrowScreen,
  isSmallScreen,
  openMarginFor,
  surfaceLeftTopFor,
} from "./narrow-screen.js";

describe("小さい画面では、手前のバブルが画面を使い切る", () => {
  it("幅 600px 未満を狭いとする（幅 0 はまだ測っていないので狭いとしない）", () => {
    expect(isNarrowScreen(390)).toBe(true);
    expect(isNarrowScreen(599)).toBe(true);
    expect(isNarrowScreen(600)).toBe(false);
    expect(isNarrowScreen(0)).toBe(false);
  });

  it("幅が狭いか、高さが 500px 未満（横持ち）なら小さい画面", () => {
    expect(isSmallScreen({ width: 390, height: 844 })).toBe(true); // 縦持ち
    expect(isSmallScreen({ width: 844, height: 390 })).toBe(true); // 横持ち
    expect(isSmallScreen({ width: 1400, height: 900 })).toBe(false);
    expect(isSmallScreen({ width: 0, height: 0 })).toBe(false); // まだ測っていない
  });

  it("小さい画面では奥のレイヤーを覗かせない（海の左上を空けない）", () => {
    expect(surfaceLeftTopFor({ width: 844, height: 390 })).toEqual({ x: 0, y: 0 });
    expect(surfaceLeftTopFor({ width: 1400, height: 900 })).toEqual({ x: 100, y: 100 });
  });

  it("小さい画面では縁の余白を詰める", () => {
    expect(openMarginFor({ width: 380, height: 600 })).toBe(4);
    expect(openMarginFor({ width: 1300, height: 800 })).toBe(16);
  });
});
