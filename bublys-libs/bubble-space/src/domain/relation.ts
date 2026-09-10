import type { Bind, Relation, RelationKindDef } from "./types.js";

/**
 * 関係の種類。意味（kind）と、配置を拘束するか（bind）を対応づける。
 *
 * ★ 「開いた」は拘束しない。開くのは opener の1つ手前に固定することではなく、
 *   その瞬間に最前面へ置く「操作」だから（現行 popChild = layers.unshift）。
 *   置いたあと奥へ送っても構わないし、関係は出来事として残り続ける。
 */
const KINDS: Record<string, RelationKindDef> = {
  contains:   { label: "含む",     hue: 190, ribbon: "filled", bind: "placed" },
  adjacent:   { label: "隣り合う", hue: 170, ribbon: "seam",   bind: "placed" },
  opened:     { label: "開いた",   hue: 210, ribbon: "filled", bind: "none" },
  references: { label: "参照",     hue:  45, ribbon: "thread", bind: "none" },
  derived:    { label: "由来",     hue: 305, ribbon: "thread", bind: "none" },
  annotates:  { label: "注釈",     hue: 110, ribbon: "thread", bind: "none" },
};

export const relationKinds = (): Readonly<Record<string, RelationKindDef>> => KINDS;
export const relationKind = (kind: string): RelationKindDef =>
  KINDS[kind] ?? { label: kind, hue: 0, ribbon: "thread", bind: "none" };
/** アプリ側が独自の関係を足せる */
export const registerRelationKind = (kind: string, def: RelationKindDef) => { KINDS[kind] = def; };

export const bindOf = (r: Relation): Bind => relationKind(r.kind).bind;
/** 拘束しない関係が持つ hole アンカー ＝ 中身の中のリンク。帯はここから伸びる。 */
export const isLink = (r: Relation) => bindOf(r) === "none" && r.anchor?.kind === "hole";
