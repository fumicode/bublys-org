import type { Size2, Rect } from "./geometry.js";
import { overlaps } from "./geometry.js";
import { PAD } from "./anchor.js";
import { depthMag } from "./lens.js";
import type { Space } from "./space.js";

/**
 * 箱の大きさを解く。席を全部収めるまでホストが伸びる。
 *   必要な箱幅 = 席のx + ゲスト幅 × 奥行き倍率 + 余白
 *
 * ★ 押し広げるのは「席」だけ。穴（ゲストが枠に従う）と隣接（外側）は要求しない。
 *   これを守らないと「成長 → 比率アンカー拡大 → 再衝突 → さらに成長」で発散する。
 * ★ 席は入れ子になりうるので、動かなくなるまで数回まわす。
 */
export function measureBoxes(space: Space, passes = 4): Map<string, Size2> {
  const sizes = new Map<string, Size2>();
  for (const b of space.bubbles) sizes.set(b.id, { ...b.ownSize });
  for (let pass = 0; pass < passes; pass++) {
    let changed = false;
    for (const b of space.bubbles) {
      let w = b.ownSize.w;
      let h = b.ownSize.h;
      for (const r of space.seats(b.id)) {
        const g = sizes.get(r.to);
        if (!g || r.anchor?.kind !== "seat") continue;
        const m = depthMag(r.dz ?? 0);
        w = Math.max(w, r.anchor.x + g.w * m + PAD);
        h = Math.max(h, r.anchor.y + g.h * m + PAD);
      }
      const prev = sizes.get(b.id);
      if (!prev || Math.abs(prev.w - w) > 0.01 || Math.abs(prev.h - h) > 0.01) {
        sizes.set(b.id, { w, h });
        changed = true;
      }
    }
    if (!changed) break;
  }
  return sizes;
}

type Seat = { relationId: string; x: number; y: number; w: number; h: number };

/** a を o から押し出す。左上より外へは出さない（負座標を作らない）。 */
function pushApart(a: Seat, o: Rect, share: number) {
  if (!overlaps(a, o)) return;
  const cands = [
    { d: o.x + o.w - a.x, ax: "x" as const },
    { d: -(a.x + a.w - o.x), ax: "x" as const },
    { d: o.y + o.h - a.y, ax: "y" as const },
    { d: -(a.y + a.h - o.y), ax: "y" as const },
  ]
    .filter((c) => (c.ax === "x" ? a.x + c.d * share : a.y + c.d * share) >= 0)
    .sort((p, q) => Math.abs(p.d) - Math.abs(q.d));
  const c = cands[0] ?? { d: o.x + o.w - a.x, ax: "x" as const };
  if (c.ax === "x") a.x += c.d * share;
  else a.y += c.d * share;
}

/**
 * 同じホストの中で、席・ホスト自身の中身・穴が場所を取り合う。
 * ★ ホスト自身の中身も「場所を取るもの」の一つとして同列に扱う。
 *   これがあるから、放り込まれた泡がホストの中身を隠さない。
 * 落ち着くまで毎フレーム damping ぶんだけ動かす。動かなければ同じ Space を返す。
 */
export function settleSeats(space: Space, damping = 0.35): Space {
  const sizes = measureBoxes(space);
  let next = space;
  let moved = false;

  for (const host of space.bubbles) {
    const mine = space.seats(host.id);
    if (!mine.length) continue;

    const fixed: Rect[] = [{ x: 0, y: 0, w: host.ownSize.w, h: host.ownSize.h }];
    for (const r of space.relations) {
      if (r.from !== host.id || r.anchor?.kind !== "hole") continue;
      const a = r.anchor;
      fixed.push({
        x: a.rx * host.ownSize.w, y: a.ry * host.ownSize.h,
        w: a.rw * host.ownSize.w, h: a.rh * host.ownSize.h,
      });
    }

    const seats: Seat[] = mine.map((r) => {
      const g = sizes.get(r.to) ?? { w: 0, h: 0 };
      const m = depthMag(r.dz ?? 0);
      const a = r.anchor as { kind: "seat"; x: number; y: number };
      return { relationId: r.id, x: a.x, y: a.y, w: g.w * m + PAD, h: g.h * m + PAD };
    });

    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < seats.length; i++) {
        for (const o of fixed) pushApart(seats[i], o, 1);
        for (let j = 0; j < seats.length; j++) if (j !== i) pushApart(seats[i], seats[j], 0.5);
      }
    }

    for (let i = 0; i < seats.length; i++) {
      const r = mine[i];
      const a = r.anchor as { kind: "seat"; x: number; y: number };
      const tx = a.x + (Math.max(0, seats[i].x) - a.x) * damping;
      const ty = a.y + (Math.max(0, seats[i].y) - a.y) * damping;
      if (Math.abs(tx - a.x) > 0.05 || Math.abs(ty - a.y) > 0.05) {
        next = next.moveSeat(r.id, tx, ty);
        moved = true;
      }
    }
  }
  return moved ? next : space;
}
