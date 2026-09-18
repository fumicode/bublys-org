/**
 * 集約 ── 泡ぜんぶと、いちばん外の空間。関係は無い。親子だけ。
 *
 * 元：lab.html 419-520 行（ROOT・bubbles・KIDS・木の問い合わせ・windowOf・rowOf）
 *
 * ★ なぜ泡1つではなく「世界まるごと」で1つの集約か
 *   規則③（見えない親は子が1つになったら消える）と規則⑤（pin は外へたどった先の泡の座標に書く）は、
 *   どちらも1つの泡の中で閉じない。木を跨いで一度に整合させる必要があるので、境界は木ぜんぶ。
 *   Redux のスライスは `toPlain()` を丸ごと保存・取得するだけのリポジトリに徹する（CLAUDE.md）。
 *
 * ★ 木の索引（id → 泡、親 → 子）は `state` には入れない。
 *   インスタンスごとに1回だけ作って持つ（lab.html 484-491 行 reindex に当たる）。
 *   `state` は Redux にそのまま置ける plain のままにしておきたいので、索引は state の外。
 */
import { ROOT_SPACE } from './types.js';
import type { BubbleId, Focus, SpaceId } from './types.js';
import type { View } from './view.js';
import { Bubble } from './bubble.js';
import type { BubbleState } from './bubble.js';

/** いちばん外の空間。泡ではないので体を持たない（lab.html 419 行 ROOT） */
export interface RootState {
  readonly title: string;
  /** root はいつも自前の View を持つ（継ぐ先が無い） */
  readonly view: View;
  readonly focus: Focus;
}

export interface WorldState {
  readonly bubbles: readonly BubbleState[];
  readonly root: RootState;
  /** ③ 見えない親に付ける通し番号。id が場面の泡とぶつからないように（lab.html「踏んだこと」snap+n） */
  readonly implicitSeq: number;
}

export class BubbleWorld {
  /** 泡（クラスに包んだもの）。インスタンスごとに1回だけ作る */
  private cache: {
    readonly list: readonly Bubble[];
    readonly byId: ReadonlyMap<BubbleId, Bubble>;
    readonly kids: ReadonlyMap<SpaceId, readonly Bubble[]>;
  } | null = null;

  constructor(readonly state: WorldState) {}

  static fromPlain(plain: WorldState): BubbleWorld {
    return new BubbleWorld(plain);
  }

  toPlain(): WorldState {
    return this.state;
  }

  /** lab.html 484-491 行 reindex。state には入れない（plain のままにしておきたいので） */
  private index() {
    if (this.cache) return this.cache;
    const list = this.state.bubbles.map((b) => new Bubble(b));
    const byId = new Map<BubbleId, Bubble>();
    const kids = new Map<SpaceId, Bubble[]>([[ROOT_SPACE, []]]);
    for (const b of list) {
      byId.set(b.id, b);
      const parent = b.space;
      const row = kids.get(parent);
      if (row) row.push(b);
      else kids.set(parent, [b]);
    }
    this.cache = { list, byId, kids };
    return this.cache;
  }

  // ── 取り出す ──
  get bubbles(): readonly Bubble[] {
    return this.index().list;
  }

  bubble(id: BubbleId): Bubble | null {
    return this.index().byId.get(id) ?? null;
  }

  kidsOf(spaceId: SpaceId): readonly Bubble[] {
    return this.index().kids.get(spaceId) ?? EMPTY;
  }

  parentOf(id: SpaceId): SpaceId | null {
    if (id === ROOT_SPACE) return null;
    const b = this.bubble(id);
    return b ? b.space : null;
  }

  /** 空間を持つ泡：自前の View を持つか、中に泡がいる（lab.html 495 行 isHost） */
  isHost(id: SpaceId): boolean {
    if (id === ROOT_SPACE) return true;
    const b = this.bubble(id);
    return !!b && (b.state.view !== null || this.kidsOf(id).length > 0);
  }

  /** a は id の先祖か（id 自身も含む）。lab.html 497-500 行 */
  isAncestor(a: SpaceId, id: SpaceId): boolean {
    for (let cur: SpaceId | null = id; cur; cur = this.parentOf(cur)) if (cur === a) return true;
    return false;
  }

  /** その泡と、その中身ぜんぶ。lab.html 501-506 行 */
  subtreeOf(id: SpaceId): ReadonlySet<BubbleId> {
    const found = new Set<BubbleId>([id]);
    const walk = (x: SpaceId): void => {
      for (const k of this.kidsOf(x)) {
        found.add(k.id);
        walk(k.id);
      }
    };
    walk(id);
    return found;
  }

  /** ③ 外へたどって最初に見つかる本物の空間が、その並びの窓。lab.html 513 行 windowOf */
  windowOf(id: SpaceId): SpaceId {
    let s = id;
    for (;;) {
      if (s === ROOT_SPACE) return s;
      const b = this.bubble(s);
      if (!b || !b.state.implicit) return s;
      const up = this.parentOf(s);
      if (up === null) return ROOT_SPACE;
      s = up;
    }
  }

  /** その泡を入れている見えない親（なければ null）。lab.html 516 行 rowOf */
  rowOf(id: BubbleId): Bubble | null {
    if (id === ROOT_SPACE) return null;
    const b = this.bubble(id);
    if (!b || b.state.parent === null) return null;
    const q = this.bubble(b.state.parent);
    return q && q.state.implicit ? q : null;
  }

  /** その空間の焦点。lab.html 514 行 focusZ はこの z（窓をたどるのは呼ぶ側） */
  focusOf(spaceId: SpaceId): Focus {
    if (spaceId === ROOT_SPACE) return this.state.root.focus;
    const b = this.bubble(spaceId);
    return b ? b.state.focus : ZERO;
  }

  /** その空間の自前の View（継承をたどる前）。root は必ず持つ */
  ownViewOf(spaceId: SpaceId): View | null {
    if (spaceId === ROOT_SPACE) return this.state.root.view;
    const b = this.bubble(spaceId);
    return b ? b.state.view : null;
  }

  /** 見出し。lab.html 511 行 spaceName */
  spaceName(spaceId: SpaceId): string {
    if (spaceId === ROOT_SPACE) return this.state.root.title;
    const b = this.bubble(spaceId);
    if (!b) return spaceId;
    return b.state.implicit ? '並び（見えない親）' : `${b.state.title}の中`;
  }

  // ── 書き換える（新しい世界を返す）──
  withBubble(bubble: Bubble): BubbleWorld {
    return this.withBubbles([bubble]);
  }

  withBubbles(bubbles: readonly Bubble[]): BubbleWorld {
    if (!bubbles.length) return this;
    const patch = new Map(bubbles.map((b) => [b.id, b.state] as const));
    const next: BubbleState[] = [];
    for (const b of this.state.bubbles) {
      const to = patch.get(b.id);
      if (to) {
        next.push(to);
        patch.delete(b.id);
      } else next.push(b);
    }
    for (const rest of patch.values()) next.push(rest);   // 無かったものは足す
    return new BubbleWorld({ ...this.state, bubbles: next });
  }

  /** 足す。lab.html 441 行（bubbles.push）。id は呼ぶ側が決める（nextImplicitId） */
  add(bubble: Bubble): BubbleWorld {
    return new BubbleWorld({ ...this.state, bubbles: [...this.state.bubbles, bubble.state] });
  }

  /** 消す。lab.html 443 行 removeBubble */
  without(id: BubbleId): BubbleWorld {
    const next = this.state.bubbles.filter((b) => b.id !== id);
    if (next.length === this.state.bubbles.length) return this;
    return new BubbleWorld({ ...this.state, bubbles: next });
  }

  withFocus(spaceId: SpaceId, focus: Partial<Focus>): BubbleWorld {
    if (spaceId === ROOT_SPACE) {
      return new BubbleWorld({
        ...this.state,
        root: { ...this.state.root, focus: { ...this.state.root.focus, ...focus } },
      });
    }
    const b = this.bubble(spaceId);
    return b ? this.withBubble(b.withFocus(focus)) : this;
  }

  withView(spaceId: SpaceId, view: View | null): BubbleWorld {
    if (spaceId === ROOT_SPACE) {
      // root は継ぐ先が無いので、いつも自前の View を持つ（lab.html 558 行 inheritView も root を外す）
      if (!view) return this;
      return new BubbleWorld({ ...this.state, root: { ...this.state.root, view } });
    }
    const b = this.bubble(spaceId);
    return b ? this.withBubble(b.withView(view)) : this;
  }

  /** ③ 見えない親の次の id。lab.html 1415 行の "snap" + (++IMPLICIT_N) */
  nextImplicitId(): { readonly id: BubbleId; readonly world: BubbleWorld } {
    const seq = this.state.implicitSeq + 1;
    return { id: `snap${seq}`, world: new BubbleWorld({ ...this.state, implicitSeq: seq }) };
  }
}

const EMPTY: readonly Bubble[] = [];
const ZERO: Focus = { x: 0, y: 0, z: 0 };

/** 空の世界（root だけ）。場面は呼ぶ側が add で積む。lab.html 419 行 ROOT */
export function emptyWorld(view: View): BubbleWorld {
  return new BubbleWorld({
    bubbles: [],
    root: { title: '外の空間', view, focus: { x: 0, y: 0, z: 0 } },
    implicitSeq: 0,
  });
}
