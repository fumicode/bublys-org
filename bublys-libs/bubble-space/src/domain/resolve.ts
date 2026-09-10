import type { Rect, Size2 } from "./geometry.js";
import type { RibbonStyle, Side } from "./types.js";
import { anchorSizesGuest } from "./anchor.js";
import { bindOf, relationKind } from "./relation.js";
import { depthMag, lensById } from "./lens.js";
import type { LensContext } from "./lens.js";
import { logicalOf } from "./dimension.js";
import type { View } from "./view.js";
import type { Space } from "./space.js";
import { measureBoxes } from "./solve.js";

export type Viewport = { width: number; height: number };

/** 画面上の1つの箱。DOM では left/top + transform: scale() に落ちる。 */
export type Placement = {
  id: string;
  /** 画面上の左上 */
  x: number;
  y: number;
  /** 論理サイズ（scale をかける前） */
  w: number;
  h: number;
  scale: number;
  opacity: number;
  /** 解決された絶対 z。描画順はこれ1本のソートだけで決まる。 */
  z: number;
  zIndex: number;
  /** 穴に嵌まっている＝大きさを自分で持たない（リサイズできない） */
  sizedByAnchor: boolean;
  hostId?: string;
  relationId?: string;
  /** アンカーの画面矩形（可視化用） */
  anchorRect?: Rect;
};

export type RibbonPiece = {
  relationId: string;
  kind: string;
  style: RibbonStyle;
  hue: number;
  from: Rect;
  to: Rect;
  z: number;
  zIndex: number;
  opacity: number;
  side?: Side;
  hostRect?: Rect;
};

export type Resolved = {
  placements: Placement[];
  ribbons: RibbonPiece[];
  byId: Record<string, Placement>;
  /** いま一番手前にある泡の z */
  frontZ: number;
};

const rectOf = (p: Placement): Rect => ({ x: p.x, y: p.y, w: p.w * p.scale, h: p.h * p.scale });

/**
 * 泡の画面位置を解く。経路は2つだけ。
 *   拘束する関係がある → ホストのアンカーから
 *   ない               → 次元 → 軸 → Vec3 → レンズ
 * 合流したあと、絶対 z の1回のソートで描画順が決まる。親子は描画順を拘束しない。
 */
export function resolveSpace(space: Space, view: View, viewport: Viewport): Resolved {
  const lens = lensById(view.lensId);
  const ctx: LensContext = {
    focus: view.focus,
    cx: viewport.width / 2,
    cy: viewport.height / 2,
    quantize: view.quantize,
  };
  const boxes = measureBoxes(space);
  const box = (id: string): Size2 => boxes.get(id) ?? { w: 200, h: 130 };

  const cache = new Map<string, Placement>();
  const out: Placement[] = [];

  function resolve(id: string, guard: Set<string>): Placement | null {
    const hit = cache.get(id);
    if (hit) return hit;
    if (guard.has(id)) return null;
    const b = space.bubble(id);
    if (!b) return null;
    guard.add(id);

    let p: Placement | null = null;
    const rel = space.binding(id);
    const host = rel ? space.bubble(rel.from) : undefined;
    const hostP = host ? resolve(host.id, guard) : null;

    if (rel && host && hostP && rel.anchor) {
      const a = rel.anchor;
      const guestBox = box(id);

      if (a.kind === "beside") {
        // ★ 隣接は「画面上で辺が接する」だけの制約。ホストの座標系には入らないので、
        //   ゲストの奥行き＝縮尺は自分のもの。リストより手前にアイテムを大きく出せる。
        const sp = lens.project(logicalOf(b, space, view.axes), ctx);
        const H = rectOf(hostP);
        const gw = guestBox.w * sp.scale;
        const gh = guestBox.h * sp.scale;
        const gap = a.gap * sp.scale;

        // 同じホストの同じ辺に先に付いている泡の分だけ、辺に沿ってずらす（画面px）
        let along = 0;
        for (const o of space.relations) {
          if (o.id === rel.id) break;
          if (o.from !== rel.from || bindOf(o) === "none") continue;
          if (o.anchor?.kind !== "beside" || o.anchor.side !== a.side) continue;
          const op = resolve(o.to, guard);
          if (!op) continue;
          along += (a.side === "e" || a.side === "w" ? op.h * op.scale : op.w * op.scale) + gap;
        }

        let x: number, y: number;
        if (a.side === "e")      { x = H.x + H.w + gap;  y = H.y + along; }
        else if (a.side === "w") { x = H.x - gap - gw;   y = H.y + along; }
        else if (a.side === "s") { x = H.x + along;      y = H.y + H.h + gap; }
        else                     { x = H.x + along;      y = H.y - gap - gh; }

        p = {
          id, x, y, w: guestBox.w, h: guestBox.h, scale: sp.scale, opacity: sp.alpha,
          z: logicalOf(b, space, view.axes).z, zIndex: 0, sizedByAnchor: false,
          hostId: host.id, relationId: rel.id,
          anchorRect: { x, y, w: gw, h: gh },
        };
      } else {
        // 含む：ホストの中身座標にあるアンカーを画面へ写す（ゲストはホストの世界に入る）
        const r: Rect =
          a.kind === "hole"
            ? { x: a.rx * host.ownSize.w, y: a.ry * host.ownSize.h,
                w: a.rw * host.ownSize.w, h: a.rh * host.ownSize.h }
            : { x: a.x, y: a.y,
                w: guestBox.w * depthMag(rel.dz ?? 0), h: guestBox.h * depthMag(rel.dz ?? 0) };
        const ax = hostP.x + r.x * hostP.scale;
        const ay = hostP.y + r.y * hostP.scale;
        const dm = depthMag(view.quantize ? Math.round((rel.dz ?? 0) * 2) / 2 : rel.dz ?? 0);
        const sized = anchorSizesGuest(a);
        const w = sized ? r.w : guestBox.w;
        const h = sized ? r.h : guestBox.h;
        const scale = hostP.scale * dm;
        p = {
          id,
          x: ax + (r.w * hostP.scale - w * scale) / 2,
          y: ay + (r.h * hostP.scale - h * scale) / 2,
          w, h, scale, opacity: hostP.opacity,
          z: hostP.z + (rel.dz ?? 0), zIndex: 0, sizedByAnchor: sized,
          hostId: host.id, relationId: rel.id,
          anchorRect: { x: ax, y: ay, w: r.w * hostP.scale, h: r.h * hostP.scale },
        };
      }
    }

    if (!p) {
      const v = logicalOf(b, space, view.axes);
      const sp = lens.project(v, ctx);
      const gb = box(id);
      p = {
        id, x: sp.x - (gb.w * sp.scale) / 2, y: sp.y - (gb.h * sp.scale) / 2,
        w: gb.w, h: gb.h, scale: sp.scale, opacity: sp.alpha,
        z: v.z, zIndex: 0, sizedByAnchor: false,
      };
    }

    guard.delete(id);
    cache.set(id, p);
    out.push(p);
    return p;
  }

  for (const b of space.bubbles) resolve(b.id, new Set());

  // 帯（リンクバブル）。★ 起点はその関係自身のアンカー。相手がいまどこに結合していようと関係ない。
  const ribbons: RibbonPiece[] = [];
  for (const rel of space.relations) {
    const K = relationKind(rel.kind);
    const from = cache.get(rel.from);
    const to = cache.get(rel.to);
    if (!from || !to || to.scale < 0.1) continue;
    const host = space.bubble(rel.from);
    if (!host) continue;

    if (K.ribbon === "seam") {
      if (rel.anchor?.kind !== "beside") continue;
      ribbons.push({
        relationId: rel.id, kind: rel.kind, style: "seam", hue: K.hue,
        from: rectOf(from), to: rectOf(to), hostRect: rectOf(from), side: rel.anchor.side,
        z: to.z + 0.004, zIndex: 0, opacity: Math.min(from.opacity, to.opacity),
      });
      continue;
    }

    let src: Rect;
    if (rel.anchor?.kind === "hole") {
      const a = rel.anchor;
      src = {
        x: from.x + a.rx * host.ownSize.w * from.scale,
        y: from.y + a.ry * host.ownSize.h * from.scale,
        w: a.rw * host.ownSize.w * from.scale,
        h: a.rh * host.ownSize.h * from.scale,
      };
    } else {
      src = to.anchorRect ?? rectOf(from);
    }
    const dst = rectOf(to);
    if (Math.abs(src.x - dst.x) < 2 && Math.abs(src.y - dst.y) < 2) continue;
    ribbons.push({
      relationId: rel.id, kind: rel.kind, style: K.ribbon, hue: K.hue,
      from: src, to: dst, z: to.z + 0.004, zIndex: 0,
      opacity: Math.min(from.opacity, to.opacity),
    });
  }

  // ★ 唯一のソート。奥から手前へ。親子関係は描画順を拘束しない。
  const all: { z: number; set: (i: number) => void }[] = [
    ...out.map((p) => ({ z: p.z, set: (i: number) => { p.zIndex = i; } })),
    ...ribbons.map((r) => ({ z: r.z, set: (i: number) => { r.zIndex = i; } })),
  ];
  all.sort((a, b) => b.z - a.z);
  all.forEach((e, i) => e.set(i));

  const byId: Record<string, Placement> = {};
  for (const p of out) byId[p.id] = p;
  const frontZ = out.length ? Math.min(...out.map((p) => p.z)) : 0;

  return { placements: out, ribbons, byId, frontZ };
}

export const placementRect = rectOf;
