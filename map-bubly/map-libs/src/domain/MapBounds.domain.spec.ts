/**
 * 範囲のテスト ── **残っている仕事は「この中に入っているか」だけ**。
 *
 * ★ 寄る・動かす・画面の位置へ写す、のテストはもう無い。Leaflet の仕事になったので、
 *   こちらに同じ計算を残すと**2 つの答え**ができてピンが地の絵からずれる。
 */
import { describe, expect, it } from "vitest";
import { HAKONE_BOUNDS, MapBounds_範囲 } from "./MapBounds.domain.js";

const bounds = MapBounds_範囲.fromPlain(HAKONE_BOUNDS);

describe("MapBounds_範囲", () => {
  it("範囲の中と外を見分ける", () => {
    // 箱根神社（35.2049, 139.0257）は中
    expect(bounds.contains(35.2049, 139.0257)).toBe(true);
    // 新宿（35.69, 139.70）は外
    expect(bounds.contains(35.69, 139.7)).toBe(false);
  });

  it("端はどちらも中に数える", () => {
    expect(bounds.contains(HAKONE_BOUNDS.south, HAKONE_BOUNDS.west)).toBe(true);
    expect(bounds.contains(HAKONE_BOUNDS.north, HAKONE_BOUNDS.east)).toBe(true);
  });

  it("同じ範囲かどうかを言える（探すのをやめる判定に使う）", () => {
    expect(bounds.equals(MapBounds_範囲.fromPlain(HAKONE_BOUNDS))).toBe(true);
    expect(
      bounds.equals(MapBounds_範囲.fromPlain({ ...HAKONE_BOUNDS, south: HAKONE_BOUNDS.south + 0.001 })),
    ).toBe(false);
  });
});
