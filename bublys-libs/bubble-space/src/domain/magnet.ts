import type { Anchor } from "./types.js";
import type { Rect } from "./geometry.js";
import { beside, seat } from "./anchor.js";
import { depthMag } from "./lens.js";
import type { Space } from "./space.js";
import type { Resolved } from "./resolve.js";
import { placementRect } from "./resolve.js";

/** 近づけると生まれる結合の候補 */
export type MagnetCandidate = {
  hostId: string;
  kind: "contains" | "adjacent";
  anchor: Anchor;
  /** ヒントを描く画面矩形 */
  rect: Rect;
  label: string;
  score: number;
};

/** 辺の外側で結合が生まれる距離。広すぎると自由に置けなくなる。 */
export const MAGNET_PX = 62;
/** 縁の帯。ここは「隣り合う」、その内側が「含む」。 */
export const EDGE_BAND = 62;

const SIDE_LABEL: Record<string, string> = { e: "右", w: "左", s: "下", n: "上" };

/**
 * ドラッグ中の泡に対する結合候補を探す。
 * 相手の縁の帯に触れれば「隣り合う」、帯より内側まで入れば「含む」。
 * 膜に触れれば隣接、中まで入れば包含。
 */
export function findMagnet(
  space: Space,
  resolved: Resolved,
  draggedId: string
): MagnetCandidate | null {
  const dp = resolved.byId[draggedId];
  const dragged = space.bubble(draggedId);
  if (!dp || !dragged) return null;
  const D = placementRect(dp);
  const dcx = D.x + D.w / 2;
  const dcy = D.y + D.h / 2;

  let best: MagnetCandidate | null = null;
  const better = (c: MagnetCandidate) => { if (!best || c.score < best.score) best = c; };

  for (const host of space.bubbles) {
    if (host.id === draggedId) continue;
    if (space.isAncestor(draggedId, host.id)) continue;   // 循環結合の禁止
    const hp = resolved.byId[host.id];
    if (!hp || hp.scale < 0.25) continue;
    const H = placementRect(hp);
    const band = Math.min(EDGE_BAND, H.w / 2 - 4, H.h / 2 - 4);

    // 中心部（縁の帯より内側）→ 含む
    if (dcx > H.x + band && dcx < H.x + H.w - band && dcy > H.y + band && dcy < H.y + H.h - band) {
      const m = depthMag(-0.15);
      const gw = dp.w * m;
      const gh = dp.h * m;
      const lx = Math.max(0, (dcx - H.x) / hp.scale - gw / 2);
      const ly = Math.max(0, (dcy - H.y) / hp.scale - gh / 2);
      better({
        hostId: host.id, kind: "contains", score: -100 - hp.scale, anchor: seat(lx, ly),
        rect: { x: H.x + lx * hp.scale, y: H.y + ly * hp.scale, w: gw * hp.scale, h: gh * hp.scale },
        label: `含む → ${host.title}`,
      });
      continue;
    }

    // 縁の帯（内外どちらでも）→ 隣り合う
    const sides = [
      { s: "e" as const, d: dcx - (H.x + H.w), across: dcy, lo: H.y, hi: H.y + H.h },
      { s: "w" as const, d: H.x - dcx,         across: dcy, lo: H.y, hi: H.y + H.h },
      { s: "s" as const, d: dcy - (H.y + H.h), across: dcx, lo: H.x, hi: H.x + H.w },
      { s: "n" as const, d: H.y - dcy,         across: dcx, lo: H.x, hi: H.x + H.w },
    ];
    for (const sd of sides) {
      if (sd.d < -band || sd.d > MAGNET_PX) continue;
      if (sd.across < sd.lo - 36 || sd.across > sd.hi + 36) continue;
      const gw = dp.w * dp.scale;
      const gh = dp.h * dp.scale;
      const gap = 14 * dp.scale;
      const rect: Rect =
        sd.s === "e" ? { x: H.x + H.w + gap, y: H.y, w: gw, h: gh }
        : sd.s === "w" ? { x: H.x - gap - gw, y: H.y, w: gw, h: gh }
        : sd.s === "s" ? { x: H.x, y: H.y + H.h + gap, w: gw, h: gh }
        : { x: H.x, y: H.y - gap - gh, w: gw, h: gh };
      better({
        hostId: host.id, kind: "adjacent", score: Math.abs(sd.d), anchor: beside(sd.s),
        rect, label: `隣り合う → ${host.title} の${SIDE_LABEL[sd.s]}`,
      });
    }
  }
  return best;
}
