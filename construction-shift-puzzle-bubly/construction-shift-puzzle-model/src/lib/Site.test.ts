import { Site } from "./Site.js";

describe("Site", () => {
  it("position 未設定は原点扱い", () => {
    expect(new Site({ id: "s", name: "S" }).position).toEqual({ x: 0, y: 0 });
  });

  it("distanceTo は直線距離を返す", () => {
    const a = new Site({ id: "a", name: "A", position: { x: 0, y: 0 } });
    const b = new Site({ id: "b", name: "B", position: { x: 3, y: 4 } });
    expect(a.distanceTo(b)).toBeCloseTo(5);
    expect(b.distanceTo(a)).toBeCloseTo(5);
  });

  it("moveTo は座標を変えた新インスタンスを返す（不変）", () => {
    const a = new Site({ id: "a", name: "A" });
    const moved = a.moveTo({ x: 1, y: 2 });
    expect(moved.position).toEqual({ x: 1, y: 2 });
    expect(a.position).toEqual({ x: 0, y: 0 });
  });
});
