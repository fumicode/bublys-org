/**
 * 持ち上げ ── 掴んでいる泡を一番上に描き、並べ替え・マス移動ではカーソルについてこさせる。
 *
 * ★ これは **ui の仕事**。domain（`resolveWorld`）は持ち上げも補間も知らない
 *   （`resolve.ts` の「補間と持ち上げは ui の仕事」）。
 * 元：lab.html 795-818 行（`resolveSpace` の `grabbed` の枝と `lifted` の配列）。
 *
 * ★ 中身の泡は、掴んだ泡の置き場所から作り直す代わりに **同じアフィン変換を当てる**。
 *   `compose` は `x' = host.x + local.x × host.scale` の1次式なので、
 *   親の置き場所を動かして倍率を k 倍すれば、子もそのまま k 倍・同じだけ動く ── 作り直すのと同じ答えになる。
 */
import type { BubbleId, Layout, Placement } from '@bublys-org/bubble-layout';
import type { DragVerbs } from '@bublys-org/bubble-layout';

export interface LiftState {
  readonly id: BubbleId;
  /** 掴んだ泡とその中身（`world.subtreeOf(id)`） */
  readonly skip: ReadonlySet<BubbleId>;
  /** 並べ替え・マス移動か（カーソルについてくる） */
  readonly lift: boolean;
  /** 今いる空間の外へ引き出したか（両方の軸でついてくる） */
  readonly out: boolean;
  readonly verbs: DragVerbs;
  /** 掴んだときの合成倍率 */
  readonly scale0: number;
  /** 掴んだ点が箱のどこか（0..1） */
  readonly fx: number;
  readonly fy: number;
  /** いまのカーソル（層の左上から） */
  readonly mx: number;
  readonly my: number;
}

/** 掴んでいる泡を一番上へ。`lift` ならカーソルについてこさせる */
export function withLift(layout: Layout, drag: LiftState | null): Layout {
  if (!drag) return layout;
  const held = layout.order.filter((p) => drag.skip.has(p.id));
  if (held.length === 0) return layout;
  const rest = layout.order.filter((p) => !drag.skip.has(p.id));

  let moved: readonly Placement[] = held;
  const p = layout.byId.get(drag.id);
  if (drag.lift && p) {
    const scale = drag.scale0;
    const w = p.box.w * scale;
    const h = p.box.h * scale;
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    const follow = (ax: 'x' | 'y') =>
      drag.out || drag.verbs[ax] === 'reorder' || drag.verbs[ax] === 'cell';
    const nx = follow('x') ? drag.mx - drag.fx * w : cx - w / 2;
    const ny = follow('y') ? drag.my - drag.fy * h : cy - h / 2;
    const k = scale / p.scale;
    moved = held.map((q) =>
      q.id === drag.id
        ? { ...q, x: nx, y: ny, w, h, scale, alpha: 1 }
        : { ...q, x: nx + (q.x - p.x) * k, y: ny + (q.y - p.y) * k, w: q.w * k, h: q.h * k, scale: q.scale * k },
    );
  }

  const order = [...rest, ...moved]; // 掴んでいる泡とその中身は一番上に描く
  const byId = new Map(layout.byId);
  for (const q of moved) byId.set(q.id, q);
  return { ...layout, order, byId };
}
