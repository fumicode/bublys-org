import type { BubbleNode } from "./types.js";
import type { Vec3 } from "./geometry.js";
import type { Space } from "./space.js";
import { STEP_PX } from "./lens.js";

export type DimensionKind = "free" | "derived";

/**
 * 次元：泡 → 数値。軸に差し込む。
 *   free    … その軸ではバブルが動く
 *   derived … その軸では焦点が動く（＝スクラブ）
 */
export type Dimension = {
  id: string;
  label: string;
  kind: DimensionKind;
  /** データ次元の1ステップの大きさ */
  unit: number;
  read(b: BubbleNode, space: Space): number;
};

export type Axes = { x: string; y: string; z: string };

const DIMS: Record<string, Dimension> = {
  none:     { id: "none",     label: "（なし）",   kind: "derived", unit: 0, read: () => 0 },
  "free.x": { id: "free.x",   label: "自由 X",     kind: "free",    unit: 1, read: (b) => b.free.x },
  "free.y": { id: "free.y",   label: "自由 Y",     kind: "free",    unit: 1, read: (b) => b.free.y },
  "free.z": { id: "free.z",   label: "面（自由Z）", kind: "free",   unit: 1, read: (b) => b.free.z },
  // 関係グラフを遡る次元。どの kind を辿るかはパラメータで、拘束するかどうかとは無関係。
  "open.chain":    { id: "open.chain",    label: "開いた連鎖", kind: "derived", unit: 1,
                     read: (b, s) => -s.chainDepth(b.id, "opened") },
  "contain.chain": { id: "contain.chain", label: "含む連鎖",   kind: "derived", unit: 1,
                     read: (b, s) => s.chainDepth(b.id, "contains") },
};

export const dimensions = (): Readonly<Record<string, Dimension>> => DIMS;
export const dimension = (id: string): Dimension => DIMS[id] ?? DIMS["none"];
export const registerDimension = (d: Dimension) => { DIMS[d.id] = d; };

const axisValue = (id: string, b: BubbleNode, space: Space, axis: "x" | "y" | "z") => {
  const d = dimension(id);
  const raw = d.read(b, space);
  if (d.kind === "free") return raw;
  return axis === "z" ? raw * d.unit : raw * d.unit * STEP_PX;
};

/** 軸に刺さった次元から論理座標を組み立てる */
export const logicalOf = (b: BubbleNode, space: Space, axes: Axes): Vec3 => ({
  x: axisValue(axes.x, b, space, "x"),
  y: axisValue(axes.y, b, space, "y"),
  z: axisValue(axes.z, b, space, "z"),
});

/** その軸で動くのは泡か焦点か */
export const axisMovesBubble = (axisDimId: string) => dimension(axisDimId).kind === "free";
