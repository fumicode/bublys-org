import type { BubbleNode, Relation, Anchor } from "./types.js";
import type { Size2, Vec3 } from "./geometry.js";
import { bindOf } from "./relation.js";

export type SpaceState = {
  bubbles: BubbleNode[];
  relations: Relation[];
};

let seq = 0;
const newId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${(seq++).toString(36)}`;

/**
 * 空間の集約。泡と関係だけを持ち、画面のことは何も知らない。
 * 更新は必ず新しいインスタンスを返す。
 *
 * 不変条件: 1つの泡が持てる placed 拘束は高々1つ。拘束しない関係はいくつでも。
 *           この不変条件は relate() が担保する。
 */
export class Space {
  constructor(readonly state: SpaceState) {}

  static empty(): Space {
    return new Space({ bubbles: [], relations: [] });
  }
  static fromPlain(state: SpaceState): Space {
    return new Space({ bubbles: [...state.bubbles], relations: [...state.relations] });
  }
  toPlain(): SpaceState {
    return { bubbles: this.state.bubbles, relations: this.state.relations };
  }

  get bubbles(): readonly BubbleNode[] { return this.state.bubbles; }
  get relations(): readonly Relation[] { return this.state.relations; }

  bubble(id: string): BubbleNode | undefined {
    return this.state.bubbles.find((b) => b.id === id);
  }
  /** その泡の配置を拘束している関係（高々1つ） */
  binding(id: string): Relation | undefined {
    return this.state.relations.find((r) => r.to === id && bindOf(r) === "placed");
  }
  /** ホストに置かれているゲストの関係 */
  guests(hostId: string): Relation[] {
    return this.state.relations.filter((r) => r.from === hostId && bindOf(r) === "placed");
  }
  /** ホストの中で場所を取る「席」 */
  seats(hostId: string): Relation[] {
    return this.guests(hostId).filter((r) => r.anchor?.kind === "seat");
  }
  /** g は h の先祖か（循環結合の禁止） */
  isAncestor(g: string, h: string): boolean {
    let cur: string | undefined = h;
    for (let n = 0; cur && n < 64; n++) {
      const r: Relation | undefined = this.binding(cur);
      if (!r) return false;
      if (r.from === g) return true;
      cur = r.from;
    }
    return false;
  }
  /** 指定した種類の関係を遡った鎖の長さ。どの kind を辿るかはパラメータ。 */
  chainDepth(id: string, kind: string): number {
    let d = 0;
    let cur: string | undefined = id;
    for (let n = 0; n < 64; n++) {
      const r: Relation | undefined = this.state.relations.find(
        (x) => x.to === cur && x.kind === kind
      );
      if (!r) break;
      d++;
      cur = r.from;
    }
    return d;
  }
  /** いま一番手前の面 */
  frontLayer(): number {
    return this.state.bubbles.reduce((m, b) => Math.min(m, b.free.z), 0);
  }

  // ── 泡 ────────────────────────────────────────────
  private withBubbles(bubbles: BubbleNode[]): Space {
    return new Space({ ...this.state, bubbles });
  }
  private withRelations(relations: Relation[]): Space {
    return new Space({ ...this.state, relations });
  }
  private patch(id: string, patch: Partial<BubbleNode>): Space {
    return this.withBubbles(
      this.state.bubbles.map((b) => (b.id === id ? { ...b, ...patch } : b))
    );
  }

  add(node: BubbleNode): Space {
    return this.withBubbles([...this.state.bubbles, node]);
  }
  remove(id: string): Space {
    return new Space({
      bubbles: this.state.bubbles.filter((b) => b.id !== id),
      relations: this.state.relations.filter((r) => r.from !== id && r.to !== id),
    });
  }
  setFree(id: string, free: Vec3): Space {
    return this.patch(id, { free });
  }
  moveBy(id: string, dx: number, dy: number): Space {
    const b = this.bubble(id);
    if (!b) return this;
    return this.patch(id, { free: { ...b.free, x: b.free.x + dx, y: b.free.y + dy } });
  }
  resize(id: string, ownSize: Size2): Space {
    return this.patch(id, {
      ownSize: { w: Math.max(80, ownSize.w), h: Math.max(60, ownSize.h) },
    });
  }

  // ── 関係 ───────────────────────────────────────────
  /**
   * 関係を張る。placed なら、先にその泡の拘束を解いてから張る（不変条件）。
   * 同じ相手・同じ意味の関係が既にあれば繋ぎ直す（重複した帯を作らない）。
   */
  relate(rel: Omit<Relation, "id"> & { id?: string }): Space {
    const base = bindOf(rel as Relation) === "placed" ? this.release(rel.to) : this;
    const found = base.state.relations.find(
      (r) => r.from === rel.from && r.to === rel.to && r.kind === rel.kind
    );
    if (found) {
      return base.withRelations(
        base.state.relations.map((r) =>
          r === found ? { ...found, anchor: rel.anchor, dz: rel.dz ?? 0 } : r
        )
      );
    }
    return base.withRelations([
      ...base.state.relations,
      { id: rel.id ?? newId("rel"), kind: rel.kind, from: rel.from, to: rel.to, anchor: rel.anchor, dz: rel.dz ?? 0 },
    ]);
  }

  /**
   * 置き場所の拘束を解く。
   * placed（含む／隣り合う）は配置そのものが意味なので、外せば関係も消える。
   * 拘束しない関係（開いた／参照／…）はそもそも触らない ＝ リンクの帯は消えない。
   */
  release(guestId: string): Space {
    return this.withRelations(
      this.state.relations.filter((r) => !(r.to === guestId && bindOf(r) === "placed"))
    );
  }
  unrelate(relationId: string): Space {
    return this.withRelations(this.state.relations.filter((r) => r.id !== relationId));
  }

  /** 席の位置を書き戻す（場所の譲り合いの結果） */
  moveSeat(relationId: string, x: number, y: number): Space {
    return this.withRelations(
      this.state.relations.map((r) =>
        r.id === relationId && r.anchor?.kind === "seat"
          ? { ...r, anchor: { ...r.anchor, x, y } }
          : r
      )
    );
  }

  /**
   * 開く ＝ 最前面に置いて、opened 関係を1本張る操作。
   * opener の1つ手前に固定するのではない（現行 popChild = layers.unshift と同じ）。
   */
  open(openerId: string, node: Omit<BubbleNode, "free">, anchor?: Anchor): Space {
    const z = this.frontLayer() - 1;
    const opener = this.bubble(openerId);
    const free: Vec3 = {
      x: (opener?.free.x ?? 0) + (opener?.ownSize.w ?? 0) + 60,
      y: opener?.free.y ?? 0,
      z,
    };
    return this.add({ ...node, free }).relate({
      kind: "opened",
      from: openerId,
      to: node.id,
      anchor,
    });
  }

  static newId = newId;
}
