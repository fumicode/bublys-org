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

/* ────────────────────────────────────────────────────────────────────────────
 * 海の輪郭 ── **ネオンは海そのものの形をなぞる**
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * 1 つの海 ── 箱と、そこから切り抜かれているもの。
 *
 * ★ `keepOut` は**光を入れない所**（アプリの中身）。線の形とは別の話なので分けて持つ。
 */
export type TubeSea = {
  readonly rect: ScreenRect;
  readonly holes: readonly ScreenRect[];
  /** 引かない辺（大元の岸に乗っていて、そこに水が無い辺）。線はそこで終わる */
  readonly open?: readonly ShowreSide[];
  /**
   * 引かない辺の**どちらの端**で、線を縁まで走らせるか。
   *
   * ★ ふつうは親の線とちょうど重なる所で終えれば、合わせて閉じた形になる。
   *   けれど**その先が別の岸で塞がっている**と、止める相手がいない。
   *   そこで端に**帯の太さぶんの短い線を直角に**足す ── 1 本の線のままだが、
   *   白い芯はそれに囲まれて**閉じているように見える**。
   *   （最後までのばす手も試したが、行き過ぎるだけで閉じては見えなかった。）
   * ★ **端ごとに決まる。** 辺ごとにすると、片方が塞がっているだけで反対の端まで
   *   効いて、親の線を通り越してしまう（実測で踏んだ：上が 3px 行き過ぎて T になった）。
   *
   * `start` / `end` はその辺の**増える向き**（左右の辺なら上→下、上下の辺なら左→右）。
   */
  readonly extend?: Partial<Record<ShowreSide, { start?: boolean; end?: boolean }>>;
  readonly keepOut?: readonly ScreenRect[];
};

/**
 * **海の輪郭を 1 本で。**
 *
 * 岸に着いたものは海から**切り抜かれている**。だから管は「窓の矩形 ＋ 貼り物ごとの矩形」を
 * 別々に重ねるのではなく、**引き算した形の縁**を 1 本でなぞる。
 *
 * ★ 別々の輪として重ねていたころは、角がつながらず、岸の縁で線が二重になった。
 *   形が 1 本なら、角も継ぎ目も**そもそも存在しない**（曲がるだけ）。
 *
 * @param rect  海の箱
 * @param holes 岸に着いたもの（画面の座標）。縁に接している辺はそのまま外へ抜ける
 */
export const seaPath = (
  rect: ScreenRect,
  holes: readonly ScreenRect[],
  options: {
    thickness?: number;
    radius?: number;
    open?: readonly ShowreSide[];
  } = {},
): string => {
  const { thickness = TUBE_THICKNESS, radius = TUBE_RADIUS, open = [] } = options;
  const half = thickness / 2;
  const corner = Math.max(0, radius - half);

  /** 管の中心線が通る箱（縁から半分だけ内側） */
  const box = {
    x: rect.x + half,
    y: rect.y + half,
    w: Math.max(0, rect.width - thickness),
    h: Math.max(0, rect.height - thickness),
  };
  if (!(box.w > 0 && box.h > 0)) return "";
  const X0 = box.x;
  const X1 = box.x + box.w;
  const Y0 = box.y;
  const Y1 = box.y + box.h;

  /**
   * 抜く形 ── 縁に接している辺は**外へ抜けさせる**（そこは海の縁ではないので）。
   * 接していない辺は、管の中心線が泡の内側を通るよう半分だけ内へ寄せる。
   */
  /** 縁に接しているか（`touchingEdges` と同じ見方。ここで持つのは取り込みの輪を避けるため） */
  const TOUCH = 2;
  const cut = holes
    .map((h) => {
      const lo = (v: number, touch: boolean, out: number) => (touch ? out : v + half);
      const hi = (v: number, touch: boolean, out: number) => (touch ? out : v - half);
      return {
        x0: lo(h.x, h.x - rect.x <= TOUCH, X0 - 1),
        x1: hi(h.x + h.width, rect.x + rect.width - (h.x + h.width) <= TOUCH, X1 + 1),
        y0: lo(h.y, h.y - rect.y <= TOUCH, Y0 - 1),
        y1: hi(h.y + h.height, rect.y + rect.height - (h.y + h.height) <= TOUCH, Y1 + 1),
      };
    })
    .filter((c) => c.x1 > c.x0 && c.y1 > c.y0);

  const axis = (base: readonly number[], more: readonly number[]) =>
    [...new Set([...base, ...more].map((v) => Math.round(v * 100) / 100))]
      .filter((v) => v >= base[0] - EPSILON && v <= base[1] + EPSILON)
      .sort((a, b) => a - b);
  const xs = axis([X0, X1], cut.flatMap((c) => [c.x0, c.x1]));
  const ys = axis([Y0, Y1], cut.flatMap((c) => [c.y0, c.y1]));

  /** 升目が海か（抜く形に入っていなければ海） */
  const water = (i: number, j: number) => {
    if (i < 0 || j < 0 || i + 1 >= xs.length || j + 1 >= ys.length) return false;
    const cx = (xs[i] + xs[i + 1]) / 2;
    const cy = (ys[j] + ys[j + 1]) / 2;
    return !cut.some((c) => cx > c.x0 && cx < c.x1 && cy > c.y0 && cy < c.y1);
  };

  /** 海を右に見て進む向きで、境目の線分を集める（＝時計回り） */
  const key = (p: Point) => `${p.x},${p.y}`;
  const next = new Map<string, Point[]>();
  const add = (from: Point, to: Point) => {
    const list = next.get(key(from));
    if (list) list.push(to);
    else next.set(key(from), [to]);
  };
  for (let i = 0; i + 1 < xs.length; i++) {
    for (let j = 0; j + 1 < ys.length; j++) {
      if (!water(i, j)) continue;
      const [a, b, c, d] = [
        { x: xs[i], y: ys[j] },
        { x: xs[i + 1], y: ys[j] },
        { x: xs[i + 1], y: ys[j + 1] },
        { x: xs[i], y: ys[j + 1] },
      ];
      if (!water(i, j - 1)) add(a, b);
      if (!water(i + 1, j)) add(b, c);
      if (!water(i, j + 1)) add(c, d);
      if (!water(i - 1, j)) add(d, a);
    }
  }
  if (next.size === 0) return "";

  /** 線分をつないで輪にする */
  const loops: Point[][] = [];
  const take = (from: Point): Point | null => {
    const list = next.get(key(from));
    if (!list || list.length === 0) return null;
    return list.shift() ?? null;
  };
  for (const startKey of [...next.keys()]) {
    let list = next.get(startKey);
    while (list && list.length) {
      const [sx, sy] = startKey.split(",").map(Number);
      const start = { x: sx, y: sy };
      const loop: Point[] = [start];
      let at = take(start);
      while (at && !(Math.abs(at.x - start.x) < EPSILON && Math.abs(at.y - start.y) < EPSILON)) {
        loop.push(at);
        at = take(at);
      }
      if (loop.length >= 4) loops.push(simplify(loop));
      list = next.get(startKey);
    }
  }
  const boxCorners: Point[] = [
    { x: X0, y: Y0 },
    { x: X1, y: Y0 },
    { x: X1, y: Y1 },
    { x: X0, y: Y1 },
  ];
  /**
   * ★ **引かない辺。** その辺には水が無い（大元の岸に乗っている）ので、囲うものが無い。
   *   線を**そこで終える**だけ ── 伸ばして追い出すと必ず行き過ぎ、開いた端ができる。
   *   終わり先は隣の海の線とちょうど重なるので、合わせて閉じた形になる。
   */
  const onOpen = (a: Point, b: Point) =>
    (open.includes("left") && near(a.x, X0) && near(b.x, X0)) ||
    (open.includes("right") && near(a.x, X1) && near(b.x, X1)) ||
    (open.includes("top") && near(a.y, Y0) && near(b.y, Y0)) ||
    (open.includes("bottom") && near(a.y, Y1) && near(b.y, Y1));
  return loops
    .map((loop) => roundedLoop(loop, corner, boxCorners, onOpen))
    .filter(Boolean)
    .join(" ");
};

const near = (a: number, b: number) => Math.abs(a - b) < EPSILON;

/** 蓋の太さ ── **ハイライトを挟んでいる青の片側**と同じ（帯から芯を抜いた半分） */
export const seaCapWidth = (thickness: number = TUBE_THICKNESS): number =>
  (thickness - TUBE_CORE_WIDTH) / 2;

/**
 * **閉じて見せる蓋。** 引かない辺の、止める相手がいない端に重ねる短い線。
 *
 * ★ **線は曲げない。** 本線はまっすぐ終わらせ、その端のすぐ先に**直角の短い線を置く**だけ。
 * ★ **長さは帯の太さぶん**（芯の端を上下から挟みきる）、
 *   **太さはハイライトを挟んでいる青の片側と同じ**（{@link seaCapWidth}）。
 *   帯と同じ太さにすると**少し太く見える** ── 続きの青ではなく、別の塊に見えてしまう。
 * ★ **芯（白）は通さない。** 帯だけで描くので、白い芯はその青に囲まれて閉じて見える。
 * ★ 端で線を曲げる形も試したが、それでは線そのものが曲がってしまう。
 */
export const seaCaps = (
  rect: ScreenRect,
  options: {
    thickness?: number;
    open?: readonly ShowreSide[];
    extend?: Partial<Record<ShowreSide, { start?: boolean; end?: boolean }>>;
  } = {},
): string => {
  const { thickness = TUBE_THICKNESS, open = [], extend = {} } = options;
  const half = thickness / 2;
  /** 本線の端の**すぐ先**に置く（芯の端をちょうど塞ぐ） */
  const beyond = seaCapWidth(thickness) / 2;
  const X0 = rect.x + half;
  const X1 = rect.x + rect.width - half;
  const Y0 = rect.y + half;
  const Y1 = rect.y + rect.height - half;
  const out: string[] = [];
  for (const side of open) {
    const e = extend[side];
    if (!e) continue;
    const vertical = side === "left" || side === "right";
    const back = side === "left" || side === "top" ? -1 : 1;
    const at =
      (vertical ? (side === "left" ? X0 : X1) : side === "top" ? Y0 : Y1) + back * beyond;
    const ends: [boolean | undefined, number][] = vertical
      ? [[e.start, Y0], [e.end, Y1]]
      : [[e.start, X0], [e.end, X1]];
    for (const [on, along] of ends) {
      if (!on) continue;
      // 本線（辺と直交して走っている）の端に、辺に沿って重ねる
      const a = along - half;
      const b = along + half;
      out.push(
        vertical
          ? `M ${fmt(at)} ${fmt(a)} L ${fmt(at)} ${fmt(b)}`
          : `M ${fmt(a)} ${fmt(at)} L ${fmt(b)} ${fmt(at)}`,
      );
    }
  }
  return out.join(" ");
};

/** まっすぐ続く点を落とす */
const simplify = (loop: readonly Point[]): Point[] => {
  const out: Point[] = [];
  for (let i = 0; i < loop.length; i++) {
    const p = loop[(i - 1 + loop.length) % loop.length];
    const q = loop[i];
    const r = loop[(i + 1) % loop.length];
    const straight =
      (Math.abs(p.x - q.x) < EPSILON && Math.abs(q.x - r.x) < EPSILON) ||
      (Math.abs(p.y - q.y) < EPSILON && Math.abs(q.y - r.y) < EPSILON);
    if (!straight) out.push(q);
  }
  return out;
};

const fmt = (v: number) => String(round(v));

/**
 * 直角の輪を、角だけ丸めた path にする。
 *
 * ★ **角丸で海を削ってはいけない。** だから丸める角は 2 種類だけ:
 *   - **海が凹んでいる角**（貼り物の角が海に食い込む所）… 丸めると海が**増える**ので丸める
 *   - **箱そのものの 4 隅** … 器の角丸そのもの。削っているのではなく、海の形がそれ
 *   それ以外の**海が凸になっている角**（貼り物の脇で海が曲がる所）は、丸めると海が減るので
 *   **直角のまま**にする。古い描き方（輪を別々に重ねる）では、そこは元から丸めていなかった。
 */
const roundedLoop = (
  loop: readonly Point[],
  corner: number,
  boxCorners: readonly Point[],
  onOpen: (a: Point, b: Point) => boolean = () => false,
): string => {
  const n = loop.length;
  if (n < 4) return "";
  const at = (i: number) => loop[(i + n) % n];
  const len = (a: Point, b: Point) => Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
  const toward = (from: Point, to: Point, by: number): Point => {
    const d = len(from, to);
    if (d < EPSILON) return { ...to };
    const t = Math.min(1, by / d);
    return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
  };
  /** 辺ごとに、引くかどうか。辺 i は 頂点 i → 頂点 i+1 */
  const drawn = loop.map((_, i) => !onOpen(at(i), at(i + 1)));
  if (drawn.every((v) => !v)) return "";
  const closed = drawn.every((v) => v);

  const parts: string[] = [];
  for (let i = 0; i < n; i++) {
    const prev = at(i - 1);
    const here = at(i);
    const nextP = at(i + 1);
    // 引かない辺のまわり ── 角は丸めず、線はそこで終える／そこから始める
    const inDrawn = drawn[(i - 1 + n) % n];
    const outDrawn = drawn[i];
    if (!inDrawn && !outDrawn) continue;
    // 外積の符号で、曲がる向き（時計回り＝1）が決まる。輪は海を右に見て進むので、
    // 時計回りに曲がる角＝海が凸、逆に曲がる角＝海が凹んでいる
    const cross =
      (here.x - prev.x) * (nextP.y - here.y) - (here.y - prev.y) * (nextP.x - here.x);
    const atBox = boxCorners.some(
      (c) => Math.abs(c.x - here.x) < EPSILON && Math.abs(c.y - here.y) < EPSILON,
    );
    const round = (cross < 0 || atBox) && inDrawn && outDrawn;   // 凹んでいる角と、箱の 4 隅だけ
    const r = round ? Math.min(corner, len(prev, here) / 2, len(here, nextP) / 2) : 0;
    const inp = toward(here, prev, r);
    const out = toward(here, nextP, r);
    // 引かない辺から来たなら、ここが始まり
    const start = parts.length === 0 || !inDrawn;
    parts.push(`${start ? "M" : "L"} ${fmt(inp.x)} ${fmt(inp.y)}`);
    if (r > EPSILON) parts.push(`A ${fmt(r)} ${fmt(r)} 0 0 ${cross > 0 ? 1 : 0} ${fmt(out.x)} ${fmt(out.y)}`);
    // 引かない辺へ出ていくなら、ここで終わり（その先は隣の海の線が続ける）。
    // 角を丸めていなければ、もう同じ点に居るので足さない（長さ 0 の線を作らない）
    if (!outDrawn && r > EPSILON) parts.push(`L ${fmt(here.x)} ${fmt(here.y)}`);
  }
  if (closed) parts.push("Z");
  return parts.join(" ");
};

