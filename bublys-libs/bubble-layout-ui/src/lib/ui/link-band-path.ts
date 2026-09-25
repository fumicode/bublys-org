/**
 * 起点（クリック元）から openee（開かれたバブル）への帯 = 錐台（frustum）。
 *
 * 帯は「小さな起点が手前に拡大されて openee になった」ことを表す。だから起点の 4 頂点と
 * openee の 4 頂点を**同名で対応づけ**（左上↔左上 …）、その対応曲線で囲まれた領域を塗る。
 *
 * どの辺から出るか、という判断は無い。あるのは幾何だけ:
 *   1. 8 点の凸包を取る。起点と openee をまたぐ凸包の辺（橋）は 2 本。軸並行な矩形どうしなら
 *      橋は必ず同名の頂点対になる。この 2 本の対応曲線が帯の輪郭で、残り 2 本は内側に収まる
 *   2. 輪郭 = 橋 → openee の「近い側」の周 → 橋 → 起点の「遠い側」の周。
 *      起点は帯に含まれ（錐台の奥の面）、openee には被らない
 *   3. 曲線の制御点は、2 矩形の中心のずれが大きい軸の中点（横ずれなら横 S 字）
 *
 * 一方が他方を完全に含む（橋が無い）なら帯は無い。
 */

export type BandRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type BandSide = "right" | "left" | "bottom" | "top";

type P = { x: number; y: number };
type Corner = "tl" | "tr" | "br" | "bl";

/** 時計回りの頂点の並び */
const CORNERS: readonly Corner[] = ["tl", "tr", "br", "bl"];

const cornersOf = (r: BandRect): Record<Corner, P> => ({
  tl: { x: r.left, y: r.top },
  tr: { x: r.right, y: r.top },
  br: { x: r.right, y: r.bottom },
  bl: { x: r.left, y: r.bottom },
});

const centerOf = (r: BandRect): P => ({ x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 });

/** 隣り合う頂点 a→b の間の辺 */
const edgeBetween = (a: Corner, b: Corner): BandSide => {
  const key = [a, b].sort().join("-");
  switch (key) {
    case "tl-tr": return "top";
    case "br-tr": return "right";
    case "bl-br": return "bottom";
    default: return "left"; // "bl-tl"
  }
};

/** 頂点 from から to まで、周に沿って進む頂点列（両端を含む）。clockwise なら時計回り */
const perimeterPath = (from: Corner, to: Corner, clockwise: boolean): Corner[] => {
  const path: Corner[] = [from];
  let i = CORNERS.indexOf(from);
  while (path[path.length - 1] !== to) {
    i = (i + (clockwise ? 1 : 3)) % 4;
    path.push(CORNERS[i]);
  }
  return path;
};

const dist2 = (a: P, b: P): number => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

/** 周に沿う 2 通りの道のうち、途中の頂点が toward に近い方（near）/ 遠い方（far） */
const pickPath = (
  rect: BandRect,
  from: Corner,
  to: Corner,
  toward: P,
  want: "near" | "far",
): Corner[] => {
  const c = cornersOf(rect);
  const cw = perimeterPath(from, to, true);
  const ccw = perimeterPath(from, to, false);
  const score = (path: Corner[]): number => {
    const mids = path.slice(1, -1);
    if (mids.length === 0) {
      // 途中の頂点が無い（隣り合う頂点）: 辺の中点で比べる
      const m = { x: (c[from].x + c[to].x) / 2, y: (c[from].y + c[to].y) / 2 };
      return dist2(m, toward);
    }
    return mids.reduce((s, k) => s + dist2(c[k], toward), 0) / mids.length;
  };
  const sCw = score(cw);
  const sCcw = score(ccw);
  if (sCw === sCcw) return cw.length <= ccw.length ? cw : ccw;
  return (sCw < sCcw) === (want === "near") ? cw : ccw;
};

type Labeled = { p: P; owner: "origin" | "openee"; corner: Corner };

const cross = (o: P, a: P, b: P): number => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

/** 凸包（Andrew's monotone chain）。反時計回りに並んだ点列を返す */
const convexHull = (points: Labeled[]): Labeled[] => {
  const pts = [...points].sort((a, b) => a.p.x - b.p.x || a.p.y - b.p.y);
  if (pts.length < 3) return pts;
  const lower: Labeled[] = [];
  for (const q of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2].p, lower[lower.length - 1].p, q.p) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: Labeled[] = [];
  for (const q of [...pts].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2].p, upper[upper.length - 1].p, q.p) <= 0) upper.pop();
    upper.push(q);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
};

export type FrustumBand = {
  /** SVG のパス */
  path: string;
  /** openee の、帯が着いている辺（近い側の周に乗っている辺）。角を角張らせるのに使う */
  openeeEdges: BandSide[];
};

/**
 * 起点 → openee の錐台の帯。橋が無い（一方が他方を含む）なら null。
 */
export const frustumBand = (origin: BandRect, openee: BandRect): FrustumBand | null => {
  const oc = cornersOf(origin);
  const ec = cornersOf(openee);
  const labeled: Labeled[] = [
    ...CORNERS.map((k) => ({ p: oc[k], owner: "origin" as const, corner: k })),
    ...CORNERS.map((k) => ({ p: ec[k], owner: "openee" as const, corner: k })),
  ];
  const hull = convexHull(labeled);

  // 凸包の辺のうち、持ち主が変わるところが橋
  const bridges: { origin: Corner; openee: Corner }[] = [];
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i];
    const b = hull[(i + 1) % hull.length];
    if (a.owner === b.owner) continue;
    bridges.push(
      a.owner === "origin"
        ? { origin: a.corner, openee: b.corner }
        : { origin: b.corner, openee: a.corner },
    );
  }
  if (bridges.length < 2) return null;
  const [b1, b2] = bridges;

  // 曲線の S 字の向き: 中心のずれが大きい軸
  const co = centerOf(origin);
  const ce = centerOf(openee);
  const horizontal = Math.abs(ce.x - co.x) >= Math.abs(ce.y - co.y);
  const curve = (from: P, to: P): string =>
    horizontal
      ? `C ${(from.x + to.x) / 2} ${from.y} ${(from.x + to.x) / 2} ${to.y} ${to.x} ${to.y}`
      : `C ${from.x} ${(from.y + to.y) / 2} ${to.x} ${(from.y + to.y) / 2} ${to.x} ${to.y}`;

  // 輪郭: 橋1 → openee の近い側の周 → 橋2 → 起点の遠い側の周
  const openeePath = pickPath(openee, b1.openee, b2.openee, co, "near");
  const originPath = pickPath(origin, b2.origin, b1.origin, ce, "far");

  const parts: string[] = [`M ${oc[b1.origin].x} ${oc[b1.origin].y}`, curve(oc[b1.origin], ec[b1.openee])];
  for (const k of openeePath.slice(1)) parts.push(`L ${ec[k].x} ${ec[k].y}`);
  parts.push(curve(ec[b2.openee], oc[b2.origin]));
  for (const k of originPath.slice(1)) parts.push(`L ${oc[k].x} ${oc[k].y}`);
  parts.push("Z");

  const openeeEdges: BandSide[] = [];
  for (let i = 0; i + 1 < openeePath.length; i++) {
    const e = edgeBetween(openeePath[i], openeePath[i + 1]);
    if (!openeeEdges.includes(e)) openeeEdges.push(e);
  }

  return { path: parts.join(" "), openeeEdges };
};

/**
 * 帯が着いている辺の角を角張らせた border-radius。
 * 角が丸いままだと帯の直線の縁が角丸からはみ出す。帯に使われている辺だけ角張らせ、
 * 他の辺は丸いまま。値の順は CSS と同じ「左上 右上 右下 左下」。
 */
export const cornerRadiusFor = (
  linkedEdges: readonly BandSide[] | undefined,
  radius: string,
  bottomRadius: string = radius,
): string => {
  const on = (edge: BandSide) => linkedEdges?.includes(edge) ?? false;
  const tl = on("top") || on("left") ? "0" : radius;
  const tr = on("top") || on("right") ? "0" : radius;
  const br = on("bottom") || on("right") ? "0" : bottomRadius;
  const bl = on("bottom") || on("left") ? "0" : bottomRadius;
  return `${tl} ${tr} ${br} ${bl}`;
};
