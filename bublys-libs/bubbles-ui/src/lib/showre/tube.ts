/**
 * 管（ネオン）の形。
 *
 * 岸の光は「海の縁の管」と「岸に着いたバブルの管」が**つながった 1 本の網**である。
 * 網だから、要素ごとにバラバラに描くと必ず接ぎ目が出る。ここでは形だけを求め、
 * 描くのは 1 枚のレイヤー（ShowreTubes）がまとめてやる。
 *
 * 規則:
 *   1. 管は**中心線**で表す。太さは描くときに与える（線を太らせれば帯になる）
 *   2. **接している辺には管を引かない。** そこは相手の管がそのまま続く
 *   3. 接している辺と直交する走りは、**相手の管まで伸ばす**。伸ばし方は 2 つ:
 *      - `"edge"`  … 矩形の縁まで（帯。相手の帯と隙間なく重なる）
 *      - `"center"`… 相手の中心線まで（芯。T 字で出会って 1 本に見える）
 *   4. **通さない区間（`cuts`）のある辺は、そこで切れる。** 岸の管を泡の枠へ
 *      迂回させるのに使う（{@link TubeJoin}）
 */

import type { ShowreSide, ScreenRect } from "./Showre.domain.js";

/** 管の太さ（px）。細いほうが枠として邪魔にならない（もとは 12 だった。その半分） */
export const TUBE_THICKNESS = 6;

/** 角の丸み（px）。海を切り抜くフレームと必ず合わせる */
export const TUBE_RADIUS = 14;

/** 管の色。奥行き（手前か奥か）を表す光なので、色は一色で変えない */
export const TUBE_COLOR = "#1a5bff";

/** 芯（白い線）の太さ（px）。管と同じ比で細くする（もとは 3） */
export const TUBE_CORE_WIDTH = 1.5;

/** 近い滲みのぼかし半径（px） */
export const TUBE_GLOW_NEAR = 6;
/** 遠い滲みのぼかし半径（px） */
export const TUBE_GLOW_FAR = 18;

/**
 * 岸に着いた泡の所で、管をどう通すか。**同じ形を 2 通りに描き分けるだけ**で、
 * 貼り付く・剥がす・伸び縮みするといった挙動は何も変わらない。
 *
 * - `"branch"`（枝分かれ）… 岸の管はまっすぐ走り、泡の枠がそこから**枝分かれ**する。
 *   泡と画面の縁の間にも管が通るので、付け根が **T 字**になる
 * - `"detour"`（迂回）… 岸の管は泡の所で**泡の枠のほうへ回り込む**。
 *   **泡と画面の縁の間には通らない**ので T 字にならず、輪郭がひと続きの線になる
 */
export type TubeJoin = "branch" | "detour";

/** 管を通さない区間。`side` の走る向きの座標（上下辺なら x、左右辺なら y）で、`from < to` */
export type TubeCut = {
  readonly side: ShowreSide;
  readonly from: number;
  readonly to: number;
};

/** 管が囲む 1 つの矩形 */
export type TubeOutline = {
  readonly rect: ScreenRect;
  /** 他の管と接している辺。そこには引かない */
  readonly joined?: readonly ShowreSide[];
  /** その辺で管を通さない区間。迂回のときに、岸の縁から泡のぶんを抜く */
  readonly cuts?: readonly TubeCut[];
};

export type TubePathOptions = {
  thickness?: number;
  radius?: number;
  /** 接している辺で、直交する走りをどこまで伸ばすか */
  joinAt?: "edge" | "center";
};

/**
 * 迂回のときに、岸（外枠）の管から取り除く区間 ──
 * 泡が接している辺の、**その泡が占めている範囲**。
 *
 * 帯と芯で止める所は違う（帯は泡の縁まで、芯は泡の中心線まで）が、その差は
 * {@link tubePath} が `joinAt` から決めるので、ここでは泡の範囲をそのまま渡す。
 */
export const detourCuts = (rect: ScreenRect, touching: readonly ShowreSide[]): TubeCut[] =>
  touching.map((side) =>
    side === "left" || side === "right"
      ? { side, from: rect.y, to: rect.y + rect.height }
      : { side, from: rect.x, to: rect.x + rect.width },
  );

const CLOCKWISE: readonly ShowreSide[] = ["top", "right", "bottom", "left"];

/** 座標の突き合わせに使う余裕（px）。これより短い走りは無いものとする */
const EPSILON = 0.01;

type Point = { x: number; y: number };
/** 1 本の辺の上の区間（増える向き） */
type Span = { lo: number; hi: number };

/**
 * 管の中心線をなぞる SVG path。接している辺は引かず、1 本につながるよう端を伸ばす。
 * 引く辺が途切れていれば（接している・通さない区間がある）、そのぶん subpath（`M`）が分かれる。
 */
export const tubePath = (outline: TubeOutline, options: TubePathOptions = {}): string => {
  const { thickness = TUBE_THICKNESS, radius = TUBE_RADIUS, joinAt = "edge" } = options;
  const { rect, joined = [], cuts = [] } = outline;
  const half = thickness / 2;
  /** 角の丸み（中心線の上での半径） */
  const corner = Math.max(0, radius - half);
  /** 接している辺での伸ばし量（縁からどれだけ内側で止めるか） */
  const stop = joinAt === "center" ? half : 0;

  const L = rect.x;
  const T = rect.y;
  const R = rect.x + rect.width;
  const B = rect.y + rect.height;
  const drawn = (side: ShowreSide) => !joined.includes(side);

  // 各辺の走り（時計回り）。隣の辺も引くなら角の丸みのぶん手前で止め、
  // 隣が接している辺なら相手の管まで伸ばす
  /** 走りの始点。隣も引くなら角の丸みのぶん手前、隣が接しているなら相手の管まで */
  const startOf = (before: ShowreSide, lo: number): number =>
    drawn(before) ? lo + corner : lo - half + stop;
  /** 走りの終点。同上 */
  const endOf = (after: ShowreSide, hi: number): number =>
    drawn(after) ? hi - corner : hi + half - stop;

  /** 辺の走りを、**増える向きの区間**と「逆向きにたどるか」で表す */
  const spanOf = (side: ShowreSide): Span & { reversed: boolean } => {
    switch (side) {
      case "top":
        return { lo: startOf("left", L + half), hi: endOf("right", R - half), reversed: false };
      case "right":
        return { lo: startOf("top", T + half), hi: endOf("bottom", B - half), reversed: false };
      case "bottom":
        return { lo: startOf("left", L + half), hi: endOf("right", R - half), reversed: true };
      case "left":
        return { lo: startOf("top", T + half), hi: endOf("bottom", B - half), reversed: true };
    }
  };

  /** その辺の上の座標 t を、画面の点に戻す */
  const pointAt = (side: ShowreSide, t: number): Point => {
    switch (side) {
      case "top":
        return { x: t, y: T + half };
      case "bottom":
        return { x: t, y: B - half };
      case "right":
        return { x: R - half, y: t };
      case "left":
        return { x: L + half, y: t };
    }
  };

  /**
   * 1 辺ぶんの走り。通さない区間で切れたら複数になる。
   * `head` / `tail` は「たどる向きで、辺の端まで届いているか」── 隣と角でつながるかを決める
   */
  const runsOf = (
    side: ShowreSide,
  ): { runs: { from: Point; to: Point }[]; head: boolean; tail: boolean } => {
    const none = { runs: [], head: false, tail: false };
    if (!drawn(side)) return none;
    const { lo, hi, reversed } = spanOf(side);
    // 帯は泡の縁まで、芯は泡の中心線まで ── 取り除く区間も同じだけ内側に寄せる
    const holes = cuts
      .filter((c) => c.side === side)
      .map((c) => ({ lo: c.from + stop, hi: c.to - stop }));
    const kept = subtractSpans(lo, hi, holes);
    if (kept.length === 0) return none;
    const atLo = kept[0].lo <= lo + EPSILON;
    const atHi = kept[kept.length - 1].hi >= hi - EPSILON;
    const ordered = reversed
      ? kept
          .slice()
          .reverse()
          .map((s) => [s.hi, s.lo] as const)
      : kept.map((s) => [s.lo, s.hi] as const);
    return {
      runs: ordered.map(([a, b]) => ({ from: pointAt(side, a), to: pointAt(side, b) })),
      head: reversed ? atHi : atLo,
      tail: reversed ? atLo : atHi,
    };
  };

  // 時計回りに並べ直す。`link` は「次の走りと角でつながるか」
  const bySide = CLOCKWISE.map(runsOf);
  const flat: { from: Point; to: Point; link: boolean }[] = [];
  bySide.forEach((sp, i) => {
    const next = bySide[(i + 1) % CLOCKWISE.length];
    sp.runs.forEach((run, j) => {
      const last = j === sp.runs.length - 1;
      flat.push({ ...run, link: last ? sp.tail && next.head : false });
    });
  });
  if (flat.length === 0) return "";

  // 全部つながっていれば閉じた輪。そうでなければ、切れ目ごとに subpath を作る
  const closed = flat.every((f) => f.link);
  const groups: (typeof flat)[] = [];
  if (closed) groups.push(flat);
  else {
    const start = flat.findIndex((_, i) => !flat[(i - 1 + flat.length) % flat.length].link);
    let current: typeof flat = [];
    for (let k = 0; k < flat.length; k++) {
      const item = flat[(start + k) % flat.length];
      current.push(item);
      if (!item.link) {
        groups.push(current);
        current = [];
      }
    }
    if (current.length > 0) groups.push(current);
  }

  const arc = (to: Point) => `A ${corner} ${corner} 0 0 1 ${round(to.x)} ${round(to.y)}`;
  const step = (to: Point) => (corner > 0 ? arc(to) : `L ${round(to.x)} ${round(to.y)}`);
  return groups
    .map((group) => {
      let d = `M ${round(group[0].from.x)} ${round(group[0].from.y)} L ${round(group[0].to.x)} ${round(group[0].to.y)}`;
      for (const item of group.slice(1)) {
        d += ` ${step(item.from)} L ${round(item.to.x)} ${round(item.to.y)}`;
      }
      // 最後の角を回って閉じる
      if (closed) d += ` ${step(group[0].from)} Z`;
      return d;
    })
    .join(" ");
};

/** 区間 [lo, hi] から、通さない区間を抜く */
const subtractSpans = (lo: number, hi: number, holes: readonly Span[]): Span[] => {
  let spans: Span[] = hi > lo ? [{ lo, hi }] : [];
  for (const hole of holes) {
    if (hole.hi <= hole.lo) continue;
    const next: Span[] = [];
    for (const s of spans) {
      if (hole.hi <= s.lo || hole.lo >= s.hi) {
        next.push(s);
        continue;
      }
      if (hole.lo > s.lo) next.push({ lo: s.lo, hi: hole.lo });
      if (hole.hi < s.hi) next.push({ lo: hole.hi, hi: s.hi });
    }
    spans = next;
  }
  return spans.filter((s) => s.hi - s.lo > EPSILON);
};

const round = (v: number): number => Math.round(v * 100) / 100;
