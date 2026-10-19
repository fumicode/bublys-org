/**
 * **誰を、どの区画の、どこに置くか。**
 *
 * `mandara.ts` が「向きの集合 → 区画」を返すのに対して、ここは
 * 「泡と向き → 画面の矩形」まで出す。**どちらも純粋**で、世界も React も知らない。
 *
 * ★ **向きを決めるのはここではない。** 開いた関係で決めるのか、いま居る場所で決めるのかは
 *   呼ぶ側の話で、ここは決まった向きを受け取るだけ ── 後で決め方を変えても、ここは動かない。
 */
import { mandaraOf, type Dir, type Mandara, type Rect } from './mandara.js';

/** 曼荼羅に並べる 1 つぶん */
export interface Member {
  readonly id: string;
  readonly dir: Dir;
}

export interface Placed {
  readonly id: string;
  /** null ＝ 中央（いま見ている泡） */
  readonly dir: Dir | null;
  readonly rect: Rect;
}

export interface Placement {
  readonly mandara: Mandara;
  readonly placed: readonly Placed[];
}

/** 区画の内側に取る余白（px） */
export const MARGIN = 8;

const inset = (r: Rect, m: number): Rect => ({
  x: r.x + m,
  y: r.y + m,
  w: Math.max(0, r.w - m * 2),
  h: Math.max(0, r.h - m * 2),
});

/**
 * 1 つの区画に n 個を**分け合わせる**（同じ向きに 2 つ以上いるとき）。
 * 長いほうの辺で等分する ── 細い帯なら帯に沿って、という自然な分け方になる。
 */
function share(r: Rect, n: number, i: number): Rect {
  if (n <= 1) return r;
  return r.w >= r.h
    ? { x: r.x + (r.w / n) * i, y: r.y, w: r.w / n, h: r.h }
    : { x: r.x, y: r.y + (r.h / n) * i, w: r.w, h: r.h / n };
}

/**
 * 曼荼羅の置き場所を出す。
 *
 * ★ **中央に誰も居ないときは、グリッドだけ出す。** 向きは「中央の泡から見て」決まるので、
 *   中央が空なら向きようが無い ── かわりに**9 つぜんぶの仕切り**を描いて、
 *   どれかにフォーカスが当たったら、そこから本来の決まり（居る向きだけ線が出る）に移る。
 * ★ **同じ向きに 2 つ以上いても、区画は 1 つ。** その中を分け合う。
 *
 * @param focusId 中央に座る泡。null なら中央は空
 * @param members 中央から見た、それぞれの向き
 */
export function placeOf(
  viewport: { readonly w: number; readonly h: number },
  focusId: string | null,
  members: readonly Member[],
  margin: number = MARGIN,
): Placement {
  // 中央が空なら、仕切りだけ全部描く（答え 7）
  if (focusId === null) {
    return {
      mandara: mandaraOf(viewport, ['NW', 'N', 'NE', 'W', 'E', 'SW', 'S', 'SE']),
      placed: [],
    };
  }

  const mandara: Mandara = mandaraOf(viewport, members.map((m) => m.dir));
  const placed: Placed[] = [{ id: focusId, dir: null, rect: inset(mandara.center, margin) }];

  const byDir = new Map<Dir, Member[]>();
  for (const m of members) {
    const list = byDir.get(m.dir);
    if (list) list.push(m);
    else byDir.set(m.dir, [m]);
  }
  for (const [dir, list] of byDir) {
    const region = mandara.region(dir);
    if (!region) continue;
    list.forEach((m, i) => {
      placed.push({ id: m.id, dir, rect: inset(share(region, list.length, i), margin) });
    });
  }
  return { mandara, placed };
}
