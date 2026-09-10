import type { Rect } from "../domain/geometry.js";

/**
 * 現行 LinkBubbleView と同じ考えの帯：2つの矩形の向かい合う辺どうしをベジェで結んで塗る。
 * 石鹸膜の管に見えるのが狙い。
 */
export function ribbonPath(a: Rect, b: Rect): string {
  const dx = b.x + b.w / 2 - (a.x + a.w / 2);
  const dy = b.y + b.h / 2 - (a.y + a.h / 2);
  const horiz = Math.abs(dx) >= Math.abs(dy);
  let p1: [number, number], p2: [number, number], q1: [number, number], q2: [number, number];
  if (horiz) {
    const ax = dx >= 0 ? a.x + a.w : a.x;
    const bx = dx >= 0 ? b.x : b.x + b.w;
    p1 = [ax, a.y]; p2 = [ax, a.y + a.h]; q1 = [bx, b.y]; q2 = [bx, b.y + b.h];
  } else {
    const ay = dy >= 0 ? a.y + a.h : a.y;
    const by = dy >= 0 ? b.y : b.y + b.h;
    p1 = [a.x, ay]; p2 = [a.x + a.w, ay]; q1 = [b.x, by]; q2 = [b.x + b.w, by];
  }
  const mid = (u: [number, number], v: [number, number]): [number, number] =>
    horiz ? [(u[0] + v[0]) / 2, u[1]] : [u[0], (u[1] + v[1]) / 2];
  const c1 = mid(p1, q1);
  const d1: [number, number] = horiz ? [c1[0], q1[1]] : [q1[0], c1[1]];
  const c2 = mid(q2, p2);
  const d2: [number, number] = horiz ? [c2[0], p2[1]] : [p2[0], c2[1]];
  return [
    `M ${p1[0]} ${p1[1]}`,
    `C ${c1[0]} ${c1[1]} ${d1[0]} ${d1[1]} ${q1[0]} ${q1[1]}`,
    `L ${q2[0]} ${q2[1]}`,
    `C ${c2[0]} ${c2[1]} ${d2[0]} ${d2[1]} ${p2[0]} ${p2[1]}`,
    "Z",
  ].join(" ");
}

/** 配置を拘束しない関係の糸。ただ「関係がある」ことだけを示す。 */
export function threadPath(a: Rect, b: Rect): string {
  const acx = a.x + a.w / 2, acy = a.y + a.h / 2;
  const bcx = b.x + b.w / 2, bcy = b.y + b.h / 2;
  const mx = (acx + bcx) / 2;
  return `M ${acx} ${acy} C ${mx} ${acy} ${mx} ${bcy} ${bcx} ${bcy}`;
}

/** 隣り合う泡が共有している辺（膜） */
export function seamLine(host: Rect, guest: Rect, side: string) {
  if (side === "e") return { x1: host.x + host.w, y1: Math.max(host.y, guest.y), x2: host.x + host.w, y2: Math.min(host.y + host.h, guest.y + guest.h) };
  if (side === "w") return { x1: host.x, y1: Math.max(host.y, guest.y), x2: host.x, y2: Math.min(host.y + host.h, guest.y + guest.h) };
  if (side === "s") return { x1: Math.max(host.x, guest.x), y1: host.y + host.h, x2: Math.min(host.x + host.w, guest.x + guest.w), y2: host.y + host.h };
  return { x1: Math.max(host.x, guest.x), y1: host.y, x2: Math.min(host.x + host.w, guest.x + guest.w), y2: host.y };
}
