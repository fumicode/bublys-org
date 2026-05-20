import { Universe } from "./Universe.js";

describe("Universe", () => {
  const universe = new Universe({ width: 50000, height: 50000 });

  describe("clamp", () => {
    it("上端/左端より外（負）は 0 に丸める", () => {
      expect(universe.clamp({ x: -5, y: -120 })).toEqual({ x: 0, y: 0 });
    });

    it("下端/右端より外は size に丸める", () => {
      expect(universe.clamp({ x: 60000, y: 70000 })).toEqual({
        x: 50000,
        y: 50000,
      });
    });

    it("範囲内はそのまま", () => {
      expect(universe.clamp({ x: 123, y: 456 })).toEqual({ x: 123, y: 456 });
    });

    it("片軸だけ外でも独立に丸める", () => {
      expect(universe.clamp({ x: -10, y: 456 })).toEqual({ x: 0, y: 456 });
    });
  });

  describe("contains", () => {
    it("原点は内側", () => {
      expect(universe.contains({ x: 0, y: 0 })).toBe(true);
    });

    it("負の座標は外側", () => {
      expect(universe.contains({ x: -1, y: 0 })).toBe(false);
    });

    it("size を超えると外側", () => {
      expect(universe.contains({ x: 50001, y: 0 })).toBe(false);
    });
  });
});
