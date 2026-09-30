/**
 * **本計画づくりの場の、置き場所を決める。**
 *
 * > **向きは「どの仲間か」。近さは「どれくらい埋まっているか」。**
 *
 * 真ん中に旅程があり、まだ入っていないものがそのまわりに 8 方向で散る。
 * 散らばり方そのものが関係を表す ── 並べ方（縦に並べる・奥に重ねる）では、
 * 「仲間」と「決まり具合」の 2 つを同時に見せられない。
 *
 * ★ **仲間は機械が推し量らない。** 同じ見出しの下に書いてあったかどうか
 *   （役 `group`）だけを見る ── それは書いた人が自分で作った関係なので、
 *   似ている・近いを機械が当てるより確か。
 * ★ **埋まっているほど中心に近い。** 時刻・長さ・金額・場所・日付のうち
 *   いくつ言えているかで決まる。よく埋まっているものほど旅程に入れやすいので、
 *   手の届く所に居てほしい。
 * ★ ここは純粋な計算。React も Redux も知らない。
 */

/** 置く前の 1 件 */
export type PlanPiece = {
  readonly url: string;
  /** どの仲間か（空なら「どこにも属さない」で、ひとつの仲間として扱う） */
  readonly group: string;
  /** いくつ言えているか（0 以上） */
  readonly known: number;
};

export type PlanSpot = { readonly x: number; readonly y: number };

/** 8 方向。上から時計回り */
const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, -1],
  [0.7, -0.7],
  [1, 0],
  [0.7, 0.7],
  [0, 1],
  [-0.7, 0.7],
  [-1, 0],
  [-0.7, -0.7],
];

/**
 * **円ではなく楕円**で散らす。
 *
 * ★ 真ん中の旅程が**縦長ではなく横長**（420×380）で、盤も横長だから。
 *   円にすると、斜めの所で旅程に重なるか、上下が盤からはみ出すかのどちらかになる
 *   （実測：円で置いたら付箋が盤の外に出た）。
 */
const INNER_X = 330;
const INNER_Y = 250;
/**
 * 埋まっていないものが 1 段ぶん遠ざかる量。
 *
 * ★ **付箋の丈より大きく**（帯を入れて 92）。小さいと段が違うだけで重なる
 *   ── 一覧をやめて帯が付いたぶん背が伸びたので、45 でも 62 でも足りなかった（実測）。
 *   そのぶん盤も縦に広げてある（`bubbleRoutes` の丈）。
 */
const RING_X = 70;
const RING_Y = 100;

/**
 * 斜めの向きだけ、少し遠くへ。
 *
 * ★ 斜めは縦横どちらの成分も 0.7 倍になるので、**そのままだと真ん中の旅程に被る**
 *   （横に 231 しか出ず、旅程の半幅 210 ＋ 付箋の半幅 100 に届かない）。
 */
const DIAGONAL = 1.4;
/** いちばん遠い段。これ以上は遠くしない（盤から出てしまう） */
const MAX_RING = 2;
/**
 * 同じ向き・同じ段にいくつも来たときに、横へずらす量。
 *
 * ★ **付箋の幅（200）より広く。** 狭いと隣どうしが重なって、
 *   何枚あるのかも読めなくなる（実測：88 にしていたら 4 枚が団子になった）。
 */
const SPREAD = 220;

/** 言える役の数の上限（時刻・長さ・金額・場所・日付） */
export const MAX_KNOWN = 5;

/**
 * 置き場所を決める。
 *
 * 仲間は**出てきた順**に方向をもらう。9 つ目からは最初の方向に戻り、
 * そのぶん外側へ出る ── 方向を増やすより、遠くするほうが読み違えない。
 */
export const planPositions = (pieces: readonly PlanPiece[]): Map<string, PlanSpot> => {
  const dirOfGroup = new Map<string, number>();
  for (const p of pieces) {
    if (!dirOfGroup.has(p.group)) dirOfGroup.set(p.group, dirOfGroup.size);
  }

  /** 同じ向き・同じ段に何番目に来たか */
  const seats = new Map<string, number>();
  const out = new Map<string, PlanSpot>();

  for (const piece of pieces) {
    const order = dirOfGroup.get(piece.group) ?? 0;
    const dir = DIRECTIONS[order % DIRECTIONS.length];
    /** 仲間が 9 つ目からは、1 周ぶん外側へ */
    const lap = Math.floor(order / DIRECTIONS.length);

    /**
     * ★ **段は「割合」で決める。** 「足りない数」をそのまま段にして上限で切ると、
     *   2 つ言えているものと 1 つも言えていないものが**同じ段に潰れる**
     *   （実測：上限 2 に対して、足りない数が 3 と 5 でどちらも 2 段目だった）。
     *   言えている割合で段を割り振れば、差がそのまま近さになる。
     */
    const short = Math.max(0, MAX_KNOWN - piece.known);
    const ring = Math.round((short / MAX_KNOWN) * MAX_RING) + lap;
    const diagonal = dir[0] !== 0 && dir[1] !== 0 ? DIAGONAL : 1;
    const rx = (INNER_X + ring * RING_X) * diagonal;
    const ry = (INNER_Y + ring * RING_Y) * diagonal;

    const key = `${order % DIRECTIONS.length}/${ring}`;
    const seat = seats.get(key) ?? 0;
    seats.set(key, seat + 1);

    /** 同じ所に重ならないよう、向きと直角にずらす（左右交互） */
    const side = seat === 0 ? 0 : Math.ceil(seat / 2) * (seat % 2 === 1 ? 1 : -1);
    const perp = { x: -dir[1], y: dir[0] };

    out.set(piece.url, {
      x: Math.round(dir[0] * rx + perp.x * side * SPREAD),
      y: Math.round(dir[1] * ry + perp.y * side * SPREAD * 0.6),
    });
  }

  return out;
};
