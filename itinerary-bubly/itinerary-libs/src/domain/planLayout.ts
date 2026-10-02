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
 * ★ **寸法は場の実寸から出す。** 前はここに決め打ちの画素（内側 330・段 70…）が
 *   書いてあり、場の大きさは別の所（`bubbleRoutes` の `defaultSize`）に書いてあった。
 *   2 つは誰も揃えないので食い違い、**付箋が場の外へ 102px はみ出した**（実測）。
 *   いまは場の大きさを受け取り、そこから内側と外側を出す ── 出所が 1 つになる。
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

/** 場の中身の大きさ（枠の内側）。真ん中を原点とした座標を返すのに要る */
export type PlanBox = { readonly w: number; readonly h: number };

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
 * 真ん中の旅程の箱（`bubbleRoutes` の `itineraries/:id` と同じ）。
 * 付箋はこれに被らない所に置く。
 */
export const CENTER = { w: 420, h: 380 } as const;
/** 付箋の箱（帯を入れた実寸） */
export const PIECE = { w: 214, h: 102 } as const;
/** 箱と箱のすき間（縁とのすき間でもある） */
const GAP = 16;

/** いちばん遠い段。これ以上は遠くしない */
const MAX_RING = 2;
/**
 * 斜めの向きだけ、少し遠くへ。
 *
 * ★ 斜めは縦横どちらの成分も 0.7 倍になるので、**そのままだと真ん中の旅程に被る**。
 */
const DIAGONAL = 1.4;

/** 言える役の数の上限（時刻・長さ・金額・場所・日付） */
export const MAX_KNOWN = 5;

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/**
 * その場での、内側（ここより近いと旅程に被る）と外側（ここより遠いと場から出る）。
 *
 * ★ 場が狭くて内側 > 外側になったら、**外側を取る** ── 旅程に多少被っても、
 *   場の外に出すよりはよい（外に出たものは掴めない）。
 */
const room = (box: PlanBox) => {
  const inner = { x: CENTER.w / 2 + PIECE.w / 2 + GAP, y: CENTER.h / 2 + PIECE.h / 2 + GAP };
  const outer = { x: box.w / 2 - PIECE.w / 2 - GAP, y: box.h / 2 - PIECE.h / 2 - GAP };
  return {
    outer: { x: Math.max(0, outer.x), y: Math.max(0, outer.y) },
    inner: { x: Math.min(inner.x, Math.max(0, outer.x)), y: Math.min(inner.y, Math.max(0, outer.y)) },
  };
};

/**
 * 置き場所を決める。真ん中（旅程）を原点とした画素で返す。
 *
 * 仲間は**出てきた順**に方向をもらう。9 つ目からは最初の方向に戻り、
 * そのぶん外側へ出る ── 方向を増やすより、遠くするほうが読み違えない。
 */
export const planPositions = (
  pieces: readonly PlanPiece[],
  box: PlanBox,
): Map<string, PlanSpot> => {
  const { inner, outer } = room(box);
  /** 隣どうしをずらす量。**付箋の幅より広く**、ただし場に収まる範囲で */
  const spread = Math.min(PIECE.w + GAP, Math.max(0, outer.x));

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
    const ring = Math.min(MAX_RING, Math.round((short / MAX_KNOWN) * MAX_RING) + lap);
    /** 段は内側から外側までを等分する ── 何段あっても場からは出ない */
    const t = ring / MAX_RING;
    const diagonal = dir[0] !== 0 && dir[1] !== 0 ? DIAGONAL : 1;
    const rx = (inner.x + (outer.x - inner.x) * t) * diagonal;
    const ry = (inner.y + (outer.y - inner.y) * t) * diagonal;

    const key = `${order % DIRECTIONS.length}/${ring}`;
    const seat = seats.get(key) ?? 0;
    seats.set(key, seat + 1);

    /** 同じ所に重ならないよう、向きと直角にずらす（左右交互） */
    const side = seat === 0 ? 0 : Math.ceil(seat / 2) * (seat % 2 === 1 ? 1 : -1);
    const perp = { x: -dir[1], y: dir[0] };

    /**
     * ★ **最後に必ず場の中へ収める。** 斜めの伸ばし（1.4 倍）と席ずらしを足すと
     *   縁を越えることがある ── 前はここが無くて、いちばん右の付箋が外へ出た。
     */
    out.set(piece.url, {
      x: Math.round(clamp(dir[0] * rx + perp.x * side * spread, -outer.x, outer.x)),
      y: Math.round(clamp(dir[1] * ry + perp.y * side * spread * 0.6, -outer.y, outer.y)),
    });
  }

  return out;
};
