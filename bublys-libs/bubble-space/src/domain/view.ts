import type { Vec3 } from "./geometry.js";
import type { Axes } from "./dimension.js";

/** 軸への次元の割り当て ＋ レンズ ＋ 焦点 */
export type View = {
  axes: Axes;
  lensId: string;
  focus: Vec3;
  /** Z を整数の面にスナップするか */
  quantize: boolean;
};

export const defaultView = (): View => ({
  axes: { x: "free.x", y: "free.y", z: "free.z" },
  lensId: "perspective",
  focus: { x: 0, y: 0, z: 0 },
  quantize: true,
});
