/**
 * 範囲のテスト ── 「この地図で探す」が正しいことに、いちばんかかっている。
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

  it("北が上・東が右に写す", () => {
    const nw = bounds.project(HAKONE_BOUNDS.north, HAKONE_BOUNDS.west, 100, 100);
    const se = bounds.project(HAKONE_BOUNDS.south, HAKONE_BOUNDS.east, 100, 100);
    expect(nw).toEqual({ x: 0, y: 0 });
    expect(se.x).toBeCloseTo(100);
    expect(se.y).toBeCloseTo(100);
  });

  it("寄っても中心は動かない", () => {
    const zoomed = bounds.zoomed(0.5);
    expect(zoomed.centerLat).toBeCloseTo(bounds.centerLat);
    expect(zoomed.centerLng).toBeCloseTo(bounds.centerLng);
    expect(zoomed.latSpan).toBeCloseTo(bounds.latSpan / 2);
  });

  it("寄りすぎでは潰れない（下限で止まる）", () => {
    let b = bounds;
    for (let i = 0; i < 20; i += 1) b = b.zoomed(0.5);
    expect(b.latSpan).toBeGreaterThan(0);
    expect(b.centerLat).toBeCloseTo(bounds.centerLat);
  });

  it("動かしても大きさは変わらない", () => {
    const moved = bounds.panned(0.01, -0.02);
    expect(moved.latSpan).toBeCloseTo(bounds.latSpan);
    expect(moved.lngSpan).toBeCloseTo(bounds.lngSpan);
    expect(moved.south).toBeCloseTo(bounds.south + 0.01);
    expect(moved.west).toBeCloseTo(bounds.west - 0.02);
  });

  it("同じ範囲かどうかを言える（探すのをやめる判定に使う）", () => {
    expect(bounds.equals(MapBounds_範囲.fromPlain(HAKONE_BOUNDS))).toBe(true);
    expect(bounds.equals(bounds.panned(0.001, 0))).toBe(false);
  });
});
