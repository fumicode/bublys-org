import { Layer } from "./Layer.js";
import { CoordinateSystem } from "./CoordinateSystem.js";

describe("Layer", () => {
  describe("最前面(index=0, scale=1)", () => {
    const layer = new Layer(0, { x: 100, y: 100 }, { x: 0, y: 0 });

    it("scale は 1", () => {
      expect(layer.scale).toBe(1);
    });

    it("place は layer-local に surfaceOrigin を足した universe 座標を返す", () => {
      expect(layer.place({ x: 50, y: 30 })).toEqual({ x: 150, y: 130 });
    });

    it("locate は place の逆変換", () => {
      const local = { x: 50, y: 30 };
      const universe = layer.place(local);
      expect(layer.locate(universe)).toEqual(local);
    });

    it("scaleScreenDelta は scale=1 なので等倍", () => {
      expect(layer.scaleScreenDelta({ x: 8, y: 8 })).toEqual({ x: 8, y: 8 });
    });
  });

  describe("奥のレイヤー(index=2, scale=0.8)", () => {
    const layer = new Layer(2, { x: 100, y: 100 }, { x: 0, y: 0 });

    it("scale は index から導出される", () => {
      expect(layer.scale).toBeCloseTo(0.8);
    });

    it("place は遠近スケール＋原点を適用する", () => {
      // vp + (local - vp)*scale + surfaceOrigin
      // = 0 + 50*0.8 + 100 = 140 / 0 + 30*0.8 + 100 = 124
      const p = layer.place({ x: 50, y: 30 });
      expect(p.x).toBeCloseTo(140);
      expect(p.y).toBeCloseTo(124);
    });

    it("locate は place の逆変換", () => {
      const local = { x: 50, y: 30 };
      expect(layer.locate(layer.place(local)).x).toBeCloseTo(local.x);
      expect(layer.locate(layer.place(local)).y).toBeCloseTo(local.y);
    });

    it("scaleScreenDelta は 1/scale 倍", () => {
      const d = layer.scaleScreenDelta({ x: 8, y: 8 });
      expect(d.x).toBeCloseTo(10);
      expect(d.y).toBeCloseTo(10);
    });
  });

  describe("CoordinateSystem との相互運用", () => {
    it("place は CoordinateSystem.transformLocalToGlobal と一致する（カーネル委譲）", () => {
      const layer = new Layer(2, { x: 100, y: 50 }, { x: 20, y: 10 });
      const cs = new CoordinateSystem(2, { x: 100, y: 50 }, { x: 20, y: 10 });
      expect(layer.place({ x: 12, y: 34 })).toEqual(
        cs.transformLocalToGlobal({ x: 12, y: 34 }),
      );
    });

    it("fromCoordinateSystem で相互変換できる", () => {
      const cs = new CoordinateSystem(3, { x: 7, y: 8 }, { x: 1, y: 2 });
      const layer = Layer.fromCoordinateSystem(cs);
      expect(layer.index).toBe(3);
      expect(layer.surfaceOrigin).toEqual({ x: 7, y: 8 });
      expect(layer.vanishingPoint).toEqual({ x: 1, y: 2 });
    });
  });

  it("atIndex は原点・消失点を保ったまま深さだけ変える", () => {
    const layer = new Layer(0, { x: 100, y: 100 }, { x: 5, y: 5 });
    const deeper = layer.atIndex(3);
    expect(deeper.index).toBe(3);
    expect(deeper.surfaceOrigin).toEqual({ x: 100, y: 100 });
    expect(deeper.vanishingPoint).toEqual({ x: 5, y: 5 });
  });
});
