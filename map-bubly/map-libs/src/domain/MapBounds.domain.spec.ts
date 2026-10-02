/**
 * 範囲のテスト ── **残っている仕事は「この中に入っているか」だけ**。
 *
 * ★ 寄る・動かす・画面の位置へ写す、のテストはもう無い。Leaflet の仕事になったので、
 *   こちらに同じ計算を残すと**2 つの答え**ができてピンが地の絵からずれる。
 */
import { describe, expect, it } from "vitest";
import { ECHIGO_TSUMARI_BOUNDS, MapBounds_範囲 } from "./MapBounds.domain.js";

const bounds = MapBounds_範囲.fromPlain(ECHIGO_TSUMARI_BOUNDS);

describe("MapBounds_範囲", () => {
  it("範囲の中と外を見分ける", () => {
    // 十日町駅（37.130, 138.756）は中
    expect(bounds.contains(37.13, 138.756)).toBe(true);
    // 新潟駅（37.912, 139.062）は外
    expect(bounds.contains(37.912, 139.062)).toBe(false);
  });

  it("端はどちらも中に数える", () => {
    expect(bounds.contains(ECHIGO_TSUMARI_BOUNDS.south, ECHIGO_TSUMARI_BOUNDS.west)).toBe(true);
    expect(bounds.contains(ECHIGO_TSUMARI_BOUNDS.north, ECHIGO_TSUMARI_BOUNDS.east)).toBe(true);
  });

  it("同じ範囲かどうかを言える（探すのをやめる判定に使う）", () => {
    expect(bounds.equals(MapBounds_範囲.fromPlain(ECHIGO_TSUMARI_BOUNDS))).toBe(true);
    expect(
      bounds.equals(MapBounds_範囲.fromPlain({ ...ECHIGO_TSUMARI_BOUNDS, south: ECHIGO_TSUMARI_BOUNDS.south + 0.001 })),
    ).toBe(false);
  });
});
