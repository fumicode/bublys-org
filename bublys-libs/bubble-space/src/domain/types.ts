import type { Size2, Vec3 } from "./geometry.js";

export type Side = "n" | "e" | "s" | "w";

export type Anchor =
  | { kind: "hole"; rx: number; ry: number; rw: number; rh: number }
  | { kind: "seat"; x: number; y: number }
  | { kind: "beside"; side: Side; gap: number };

/** 関係が配置を拘束するか。placed = アンカーが置き場所を決める。 */
export type Bind = "placed" | "none";
export type RibbonStyle = "filled" | "seam" | "thread";

export type RelationKindDef = {
  label: string;
  hue: number;
  ribbon: RibbonStyle;
  bind: Bind;
};

export type Relation = {
  id: string;
  kind: string;
  from: string;
  to: string;
  /** 拘束しない関係でもアンカーは持てる（＝中身の中のリンクの居場所） */
  anchor?: Anchor;
  /** ホストからの相対奥行き。placed のときだけ意味を持つ。 */
  dz?: number;
};

/**
 * 泡。中身と自前の大きさだけを持ち、座標は持たない。
 * `title` と `data` は描画側が中身を決めるための持ち物で、空間の計算には使わない。
 */
export type BubbleNode = {
  id: string;
  title: string;
  ownSize: Size2;
  /** 自由座標。軸に free 次元を刺したときに読まれ、ドラッグで書き換わる。 */
  free: Vec3;
  hue?: number;
  data?: Record<string, unknown>;
};
