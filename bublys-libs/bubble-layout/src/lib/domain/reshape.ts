/**
 * 形を変える（親の付け替え）。③の「並びは2つ以上」と ⑤ pin は、ここでどの操作にも同じに当たる。
 *
 * 元：lab.html 1359-1401 行（commitDrop）、1408-1427 行（snapOp）、1438-1459 行（reshape）、
 *     1461-1476 行（tidyRows）、1350 行（renumber）、1309-1322 行（freeCellNear）
 *
 * reshape の手順（lab.html 1438-1459 行）:
 *   1. change：付け替えるだけ（位置は書かない）。留める泡の id を返す
 *   2. ③ 並びは2つ以上：子が1つになった見えない親は消え、残った泡が席を継ぐ（継いだ泡も留める）
 *   3. 空間を移った泡は、見えていた大きさになる奥行きへ（keepSeen）
 *   4. ⑤ pin：留める泡を、前のフレームで見えていた所へ
 *   5. 親が変わった泡の補間を、見えていた所から始める（← ui に渡す）
 *
 * ★ ラボの reindex()（lab 497 行）に当たるものは、ここには無い。
 *   ラボは KIDS を手で作り直していたので「付け替えたあと reindex するまで KIDS は古い」という間があり、
 *   1367・1377 行の .filter(k => k !== b) はその間を埋めるためのもの。
 *   BubbleWorld は索引をインスタンスごとに作るので、木はいつも新しい。filter は残してある
 *   （新しい索引では取り除く相手がいるかどうかが逆になるだけで、答えは同じ）。
 */
import type { BubbleId, Cell, SpaceId } from './types.js';
import { ROOT_SPACE } from './types.js';
import type { Bubble } from './bubble.js';
import { Bubble as BubbleClass } from './bubble.js';
import type { BubbleWorld } from './world.js';
import type { ActContext, ReshapeResult, SeenRect } from './act.js';
import type { DropSlot, Grabbed, SnapTarget } from './drop.js';
import { resolveWorld } from './resolve.js';
import { snapView } from './view.js';
import { anchorOf, keepSeen, pin } from './pin.js';

/** 組み立て中のマス（Partial<Cell> は読み取り専用なので、書ける形を1つ用意する） */
type CellDraft = { -readonly [K in keyof Cell]?: Cell[K] };

/** lab.html 1349 行 byOrder */
const byOrder = (q: Bubble, r: Bubble): number => q.state.order - r.state.order;
/** order の順に並べた id。lab は泡そのものを並べていた */
const sortedIds = (list: readonly Bubble[]): BubbleId[] => list.slice().sort(byOrder).map((b) => b.id);

/**
 * ③ 見えない親の Z。
 * ラボは snapView に Z を書かない（lab 411-416 行）── 軸まるごと外の窓のものなので、viewOf が必ず差し替える。
 * View の型は3軸そろっているので、読まれない場所を埋めるための値を置く。
 */
const IMPLICIT_Z = { dim: 'none', arrange: 'as-is', lens: 'flat', step: 1 } as const;

/** change が返すもの：付け替えたあとの世界と、⑤ で留める泡 */
export interface ReshapeChange {
  readonly world: BubbleWorld;
  readonly keep: readonly BubbleId[];
}

/**
 * どの付け替えもここを通す。lab.html 1438-1459 行 reshape。
 * @param animateIds 付け替えとは別に、補間を見えていた所から始めたい泡（並べ替えで持ち上げていた泡など）
 */
export function reshape(
  world: BubbleWorld,
  ctx: ActContext,
  change: (w: BubbleWorld) => ReshapeChange,
  animateIds: readonly BubbleId[] = [],
): ReshapeResult {
  const parent0 = new Map<BubbleId, SpaceId>(world.bubbles.map((b) => [b.id, b.space]));

  // 1. 付け替えるだけ
  const changed = change(world);
  // 2. ③ 並びは2つ以上
  const tidied = tidyRows(changed.world);
  let w = tidied.world;

  // 付け替わった泡（change の中で生まれた泡は parent0 に無いので入らない）
  const moved = w.bubbles.filter((b) => parent0.has(b.id) && parent0.get(b.id) !== b.space).map((b) => b.id);
  // 泡が出ていって縮んだ並び（見えない親）の、先頭の泡（lab 1447-1448 行）
  const olds = new Set<SpaceId>();
  for (const id of moved) {
    const o = parent0.get(id);
    if (o !== undefined) olds.add(o);
  }
  const shrunk: BubbleId[] = [];
  for (const sid of olds) {
    if (sid === ROOT_SPACE) continue;
    const row = w.bubble(sid);
    if (!row || !row.state.implicit) continue;
    const first = w.kidsOf(sid).slice().sort(byOrder)[0];
    if (first) shrunk.push(first.id);
  }

  // 3. 空間を移った泡は、見えていた大きさになる奥行きへ
  //    ★ ラボは probe() を1回だけ打って、その配置を moved 全員に使う（lab 1449-1450 行）
  const probe = resolveWorld(w, ctx.viewport, ctx.rules, ctx.chrome);
  /**
   * ★ ただし**並び（見えない親）を出入りするときは、奥行きを書き換えない。**
   *
   *   ③ 見えない親は体を持たない ── 並びは「別の場所」ではなく、ただのまとまり。
   *   出入りしても奥行きが変わったわけではないので、見えていた大きさを奥行きで
   *   取り戻す必要がない。
   *
   *   書き換えると並びが壊れる。並びの中の泡の奥行きは**外の窓のもの**なので、
   *   一人だけ別の面に置かれると、同じ帯にいるのに**一人だけ大きさが違い**、
   *   自分の帯の中で縮んだぶんが**隙間**になる（実測：縦に並べた2つが 0.49 と 0.56 で、
   *   間に 42px の空きができた）。
   *   ラボでは起きない ── 平行なレンズだと並びの倍率が 1 なので、書いても 0 のままだった。
   */
  const isRow = (s: SpaceId | undefined) =>
    !!s && s !== ROOT_SPACE && !!(world.bubble(s)?.state.implicit || w.bubble(s)?.state.implicit);
  for (const id of moved) {
    if (isRow(parent0.get(id)) || isRow(w.bubble(id)?.space)) continue;
    w = keepSeen(w, ctx, id, ctx.seen.get(id), probe);
  }

  // 4. ⑤ pin
  const pinned = [...shrunk, ...tidied.heirs, ...changed.keep];
  for (const id of pinned) w = pin(w, ctx, id, ctx.seen.get(id));

  // 5. 補間は見えていた所から。親の箱（host）は次のフレームで使うもので測るので、外側から順に（lab 1454-1458 行）
  //    ★ 実際に anim へ入れるのは ui（startFrom）。ここは「誰を・どの矩形から」を外側から順に並べて渡すだけ
  const after = w;
  const depth = (id: BubbleId): number => {
    let n = 0;
    for (let c: SpaceId | null = id; c !== null && c !== ROOT_SPACE; c = after.parentOf(c)) n++;
    return n;
  };
  const animateFrom = new Map<BubbleId, SeenRect>();
  const ids = [...new Set([...moved, ...animateIds])]
    .filter((id) => after.bubble(id) !== null)
    .sort((a, c) => depth(a) - depth(c));
  for (const id of ids) {
    const bf = ctx.seen.get(id);
    if (bf) animateFrom.set(id, bf);            // 見えていなかった泡は startFrom が何もしない（lab 1527 行）
  }

  return { world: w, animateFrom, pinned };
}

/**
 * 離したら確定。lab.html 1359-1401 行 commitDrop。
 * 親を付け替えて、親の View に従って値を書く。位置は書かない（⑤ pin が reshape の中で当てる）。
 * @param lift 並べ替え・マス移動でカーソルについてきていたか（補間の始点に要る）
 */
export function commitDrop(
  world: BubbleWorld,
  ctx: ActContext,
  grabbed: Grabbed & { readonly lift: boolean },
  slot: DropSlot,
): ReshapeResult {
  const id = grabbed.id;
  const home = grabbed.space;
  return reshape(
    world,
    ctx,
    (w0) => {
      if (slot.snap) return snapChange(w0, id, slot.snap);
      let w = w0;
      const moved = slot.space !== home;
      // 順序は「兄弟の中での順番」：親を付け替えたら、出た空間と入った空間の兄弟を 0.. に振り直す
      // （出た空間に欠番を残すと、等間隔では抜けた番号の所が穴になる）
      if (moved) {
        const b = w.bubble(id);
        if (!b) return { world: w, keep: [] };
        w = w.withBubble(b.withParent(slot.space === ROOT_SPACE ? null : slot.space));
        w = renumber(w, sortedIds(w.kidsOf(home).filter((k) => k.id !== id)));
      }
      let anchor: BubbleId | null = null;
      if (slot.order) {
        const list = slot.order.list.slice();
        // ⑤ よそから差し込むときだけ、前の泡を留める（並びは後ろへ伸びる）。
        // 同じ空間の中の並べ替えは付け替えではないので留めない（帯が入れ替わるだけで、塊も箱も変わらない）
        if (moved) anchor = anchorOf(list, slot.order.idx);
        list.splice(slot.order.idx, 0, id);
        w = renumber(w, list);
      } else if (moved) {
        // 入った先に差し込み位置が無ければ一番後ろ
        w = renumber(w, [...sortedIds(w.kidsOf(slot.space).filter((k) => k.id !== id)), id]);
      }
      // ★ ここには raise（置いた泡も手前へ）があった。触っても値を書かなくなったので消した。
      //   置くのは「掴んでドラッグした」あとなので、値（親・順序・マス）は上でもう書いてある。
      //   視点の側は、掴む前の pointerdown が触りなので ui が focusOn を通っている（domain は足さない）

      // ★ 同じマスに2つ入れない。マス移動は兄弟の値の入れ替え：
      //   同じ空間の中なら、先客は掴んだ泡が空けたマスへ移る（順序の差し込みが番号を振り直すのと同じ）。
      //   よその空間から来た泡には空けたマスが無いので、1人ずつ順に一番近い空きマスへ逃がす
      //   （全員に同じ逃げ先を書くと、そこで重なる）
      if (slot.occupants.length) {
        const cur = w.bubble(id);
        if (!cur) return { world: w, keep: [] };
        let vacated: Partial<Cell> | null = null;
        if (!moved) {
          const o: CellDraft = {};
          for (const key of Object.keys(slot.cell) as (keyof Cell)[]) o[key] = cur.state.cell[key];
          vacated = o;
        }
        // ★ 先に「落とした泡のマス」を書く。でないと freeCellNear の taken に落とした泡が入らず、
        //   最後の1人が落とした泡と同じマスへ戻る（ラボは書いてから reindex している）
        w = w.withBubble(cur.withCell(slot.cell));
        for (const kid of slot.occupants) {
          const k = w.bubble(kid);
          if (!k) continue;
          w = w.withBubble(k.withCell(vacated ?? freeCellNear(w, slot.space, slot.cell, kid)));
          vacated = null;
        }
      }
      const last = w.bubble(id);
      if (last) w = w.withBubble(last.withCell(slot.cell));
      return { world: w, keep: anchor ? [anchor] : moved ? [id] : [] };
    },
    grabbed.lift ? [id] : [],
  );
}

/**
 * ③ くっつける・並びに加わる の付け替え。lab.html 1408-1427 行 snapOp を reshape で包んだもの。
 * ドラッグでも、場面を組み立てるときも、この1つだけを通る（lab.html 1830 行の起動時もこれ）。
 */
export function applySnap(
  world: BubbleWorld,
  ctx: ActContext,
  id: BubbleId,
  snap: SnapTarget,
): ReshapeResult {
  return reshape(world, ctx, (w) => snapChange(w, id, snap));
}

/** lab.html 1408-1427 行 snapOp の中身。位置は書かない：留める泡を返し、reshape が ⑤ pin で留める */
function snapChange(world: BubbleWorld, id: BubbleId, sn: SnapTarget): ReshapeChange {
  let w = world;
  const b0 = w.bubble(id);
  const T0 = w.bubble(sn.target);
  if (!b0 || !T0) return { world: w, keep: [] };
  const from = b0.space;

  let rowId: BubbleId;
  if (sn.kind === 'join') {
    const rid = T0.state.parent;
    if (rid === null) return { world: w, keep: [] };      // 並びに加わるのに並びがいない
    rowId = rid;
  } else {
    // 相手の席に見えない親が生まれる（親・順序・マス・座標を相手から写す）。奥行きには置かれない
    const next = w.nextImplicitId();
    w = next.world;
    rowId = next.id;
    w = w.add(
      BubbleClass.create({
        id: rowId, title: '並び（見えない親）', hue: 215, w: 0, h: 0, implicit: true,
        view: { ...snapView(sn.axis), z: IMPLICIT_Z },
        parent: T0.state.parent, order: T0.state.order, cell: T0.state.cell, free: T0.state.free,
      }),
    );
    w = w.withBubble(T0.with({ parent: rowId, order: 0 }));
  }

  const b1 = w.bubble(id);
  if (!b1) return { world: w, keep: [] };
  w = w.withBubble(b1.withParent(rowId));
  if (from !== rowId) w = renumber(w, sortedIds(w.kidsOf(from)));

  const list = sortedIds(w.kidsOf(rowId).filter((k) => k.id !== id));
  const idx = list.indexOf(sn.target) + (sn.after ? 1 : 0);
  const anchor = anchorOf(list, idx);            // 差し込む所より前の泡（生まれたばかりの並びでは相手 T）
  list.splice(idx, 0, id);
  w = renumber(w, list);
  /**
   * ★ **後ろへ差し込むなら、並びそのものの左上も留める。**
   *
   * ⑤ は「触っていない泡は画面の上で動かない」なので、留めるのは中の泡 1 つ（anchor）で足りる
   * ── **平行なレンズなら**。並びの中は剛体なので、1 つ留めれば残りも動かない。
   *
   * 魚眼だとそうならない。並びの箱が伸びると**並びの像の倍率そのものが変わる**ので、
   * 中の 1 つを画面に留めると、その辻褄合わせに並びが世界の中で右へ飛ぶ
   * （実測：600 の泡を足すたびに並びが 200px ずつ右へ逃げ、隣にいたはずの一覧から離れていく）。
   * 「並びは後ろへ伸びる」を言葉どおりにするなら、留めるのは**並びの左上**。
   * `pin` はもともと左上を留める（大きさが変わる泡のため）ので、そのまま使える。
   *
   * 前へ差し込むとき（idx 0）は並びが前へ伸びるので、左上は動いて当たり前 ── 中の泡だけを留める。
   * 生まれたばかりの並びは前のフレームに居ないので、`pin` は何もしない（seen が無い）。
   */
  const keep = anchor ?? sn.target;
  return { world: w, keep: idx > 0 ? [keep, rowId] : [keep] };
}

/**
 * ③ 並びは2つ以上：子が1つになった見えない親は消え、残った泡が親の席を継ぐ（0 なら消えるだけ）。
 * lab.html 1461-1476 行 tidyRows。継いだ泡の id（＝ ⑤ で留める泡）も返す。
 *
 * ★ ラボは消える並びが選択中だったら選択を継いだ泡へ移す（lab 1473 行）。選択は ui の持ちものなので、
 *   ここには無い。消えた並びを選んでいたら、ui が選び直すこと。
 */
export function tidyRows(world: BubbleWorld): {
  readonly world: BubbleWorld;
  readonly heirs: readonly BubbleId[];
} {
  const heirs: BubbleId[] = [];
  let w = world;
  for (;;) {
    const X = w.bubbles.find((b) => b.state.implicit && w.kidsOf(b.id).length < 2);
    if (!X) return { world: w, heirs };
    const k = w.kidsOf(X.id)[0];
    if (k) {
      w = w.withBubble(k.with({ parent: X.state.parent, order: X.state.order, cell: X.state.cell }));
      heirs.push(k.id);
    }
    w = w.without(X.id);
  }
}

/** 兄弟の order を 0.. に振り直す。lab.html 1350 行 renumber（出た空間に欠番を残さない） */
export function renumber(world: BubbleWorld, ids: readonly BubbleId[]): BubbleWorld {
  const next: Bubble[] = [];
  ids.forEach((id, i) => {
    const b = world.bubble(id);
    if (b) next.push(b.withOrder(i));
  });
  return world.withBubbles(next);
}

/**
 * 空いているいちばん近いマスを探す。lab.html 1309-1322 行 freeCellNear。
 * 近さは、マスの値そのもの（列・行の差）で測る。
 *
 * ★ v4 から続く穴がそのまま残っている（v5 でも同じ答え。直していない）：
 *   行0・列0 の端では「自分のマス」が空きに見えて、そこへ逃げる＝逃げない。
 *   実測：スタッフの佐藤を カレンダーの「6」（5,0）へ落とすと (5,0) に2つ入る。
 *   ここを直すと検証の答えが変わる。直すなら別の回で、規則の側から決めること。
 */
export function freeCellNear(
  world: BubbleWorld,
  spaceId: SpaceId,
  cell: Partial<Cell>,
  excludeId: BubbleId,
): Partial<Cell> {
  const keys = Object.keys(cell) as (keyof Cell)[];
  const at = (c: Partial<Cell>, key: keyof Cell): number => c[key] ?? 0;   // keys は Object.keys なので必ずある
  const taken = new Set(
    world.kidsOf(spaceId).filter((k) => k.id !== excludeId).map((k) => keys.map((key) => k.state.cell[key]).join(',')),
  );
  for (let r = 1; r < 32; r++) {
    const dirs: number[][] = keys.length === 1
      ? [[r], [-r]]
      : [[r, 0], [0, r], [-r, 0], [0, -r], [r, r], [-r, r], [r, -r], [-r, -r]];
    for (const d of dirs) {
      // ★ 0 未満になる候補は「飛ばす」。折り返す（Math.max(0,…)）と、行0・列0 の端で候補が
      //   「自分がいま重なっているマス」そのものになり、そこが空きに見えて誰も逃げない
      const cand: CellDraft = {};
      keys.forEach((key, i) => { cand[key] = at(cell, key) + (d[i] ?? 0); });
      if (keys.some((key) => at(cand, key) < 0)) continue;
      if (!taken.has(keys.map((key) => at(cand, key)).join(','))) return cand;
    }
  }
  return cell;
}
