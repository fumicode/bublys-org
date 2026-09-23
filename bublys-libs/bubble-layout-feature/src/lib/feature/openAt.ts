/**
 * 開く ── 「この空間に、この泡の隣に、新しい泡を置く」。
 *
 * ★ domain に入るのは**この動詞だけ**。`ObjectView` も url もここから先へは行かない（DECISIONS.md）。
 *
 * ★ `openingPosition` は無い。**どこに置くかは親の View が決める**（規則①④）。
 *   旧 `bubbles-ui` の `openingPosition` は3役を兼ねていた ── どこに置くか／開いてよいか／膜を出すか。
 *   ここが持つのは1つめだけで、しかも「隣に置く」しか言わない。
 *
 * ★ 横に開くときは **X の魚眼も一緒に点ける**：
 *   > 「ただ兄弟にすると、同じ大きさで表示されてしまうので、もとの bubble-ui の良さが損なわれてしまう。
 *   >  よって、横に開く場合には X 方向の魚眼レンズも同時にオンにすべきだね」
 *   次元は変えない（自由X のまま）。**レンズだけ**を魚眼にする ── これだけで
 *   「開いたほうが大きく、元のリストは小さく」が出る。
 */
import {
  Bubble, METRICS, actContext, applySnap, focusOn, renumber, resolveRules, resolveWorld,
  screenToAxis, withAxis, withFocusAxis,
} from '@bublys-org/bubble-layout';
import type { BubbleId, BubbleWorld, LayoutRules, Viewport } from '@bublys-org/bubble-layout';

/** 開き方。いまは「隣に開く」だけ。ポップアップは未実装（DECISIONS.md の世界線スナップで戻る枝） */
export type OpenAs = 'beside';

/**
 * 奥行きの付け方。**試しに2つ並べてある**（v7 の検証。どちらにするかは masa さんが触って決める）。
 *
 * - `'fisheye-x'` … いまの既定。横に開いたら X の魚眼を点ける
 * - `'plane'`     … 旧 `bubbles-ui` の「面」（`process.layers`）を Z で書いたもの：
 *     **別の種類を開く**＝いちばん手前より1段手前の面に置き、Z の焦点をそこへ送る（他は全員1段下がる）
 *     **同じ種類を開く**＝兄弟と同じ面に並べる（全員が手前のまま）
 *   規則は1つも足していない ── 外の空間は最初から `Z＝自由Z·そのまま·透視` を持っている。
 *
 * ★ なぜ試すか（v7 の実測）：魚眼は**幅に罰を与える**（泡の像＝端をレンズに通した間）。
 *   詳細を3つ開くと並びが 900px になり、詳細 0.755 ＜ 一覧 0.773 と**関心の順が逆転**した。
 *   旧は同じ流れで 詳細 1.0 ×3 ／ 一覧 0.8。
 */
export type OpenDepth = 'fisheye-x' | 'plane' | 'cascade';

/** 「重ねて開く」で、元の泡からどれだけずらすか（px） */
const CASCADE = { dx: 96, dy: 76 };

/**
 * 面の1段。透視 `m = 1/(1 + 0.26·dz)` で **1段 0.90** になる dz（＝旧 `1 − 0.1 × layerIndex` の1段目）。
 * 2段目からは透視が寝ていくので 0.818 / 0.75（旧は 0.8 / 0.7）。
 */
export const PLANE_STEP = (1 / 0.9 - 1) / METRICS.K_PERSP;

export interface OpenAtInput {
  readonly world: BubbleWorld;
  readonly viewport: Viewport;
  /** 開く元の泡。null なら外の空間に置く */
  readonly openerId: BubbleId | null;
  readonly newId: BubbleId;
  readonly title: string;
  readonly size?: { readonly w: number; readonly h: number };
  readonly hue?: number;
  readonly as?: OpenAs;
  /** 奥行きの付け方。既定は `'fisheye-x'`（いまのまま） */
  readonly depth?: OpenDepth;
  readonly rules?: Partial<LayoutRules>;
  /**
   * **レンズには触らない。** 既定では横に開くと X の魚眼を点けるが、
   * 誰かが向きを選んでいる（魚眼を Y に向けた、どちらも平行にした）なら、
   * 開くたびに X へ戻すとその選択が握り潰される。選ばれたあとはこれを立てる。
   */
  readonly keepLens?: boolean;
  /**
   * ★ **同じ種類の泡（兄弟）を続けて開いたとき、その隣に並べる相手。**
   *
   * これが無いと、一覧の項目を2つダブルクリックしたとき、どちらも
   * 「一覧の右隣」という**同じ場所に重なって**開く（元の泡が同じなので当たり前）。
   * 旧 `bubbles-ui` は `join-sibling` でこれを避けていた。
   *
   * 渡すと、**共通の見えない親（並び）を作って、その中に並べる**（規則③ の「くっつける」そのもの）。
   * 1枚目は見えない親が生まれ（`born`）、2枚目からはその並びに加わる（`join`）。
   */
  readonly joinWith?: BubbleId | null;
}

export interface OpenAtResult {
  readonly world: BubbleWorld;
  readonly id: BubbleId;
}

const DEFAULT_SIZE = { w: 320, h: 240 };
/**
 * 隣に開くときの、元の泡との隙間。
 *
 * ★ **くっつく距離（METRICS.SNAP_EDGE ＝ 24px）より広くないといけない。**
 *   同じ 24 にしていたら、開いた直後の一覧と詳細が「いきなりくっつく距離」にいて、
 *   詳細をちょっと動かしただけで**見えない親が生まれて並びになり**、
 *   せっかくの「詳細が手前・一覧は小さく」が消えた（v6 の検証で踏んだ）。
 *   画面での隙間は倍率でさらに縮むので、2倍とっておく。
 */
const BESIDE_GAP = METRICS.SNAP_EDGE * 2;

export function openAt(input: OpenAtInput): OpenAtResult {
  const depth = input.depth ?? 'fisheye-x';
  if (depth === 'plane') return openOnPlane(input);
  const cascade = depth === 'cascade';
  const { world, viewport, openerId, newId, title } = input;
  const size = input.size ?? DEFAULT_SIZE;
  const opener = openerId === null ? null : world.bubble(openerId);
  const space = opener ? opener.space : 'root';

  // 兄弟として、元の泡の右隣に
  const siblings = world.kidsOf(space);
  const at = opener ? siblings.findIndex((b) => b.id === opener.id) : siblings.length - 1;
  /**
   * ★ 置き場所は 2 通り:
   *   beside  … 元の泡の右隣（既定）
   *   cascade … 元の泡の右下へ少しずらして**重ねる**。Z を使わずに重なりを作る道
   *             （重なりを作るのはレンズではなく並べ方 ── 同じあたりに置けば重なる）
   */
  /**
   * 重ねて開くときの基準は「**その空間で最後に置かれた泡**」。無ければ元の泡。
   * 種類を問わないのは、種類が違うだけで同じ場所に落ちて完全に重なるから。
   *
   * ★ 新しい泡は元の泡の**直後**に挿さり、その後ろは 1 つずつ下がる（renumber）。
   *   つまり **番号が小さいほうが新しい** ── 元の泡を除いた最小がそれ。
   */
  const cascadeBase = cascade
    ? (input.joinWith ? world.bubble(input.joinWith) : null) ??
      world
        .kidsOf(space)
        .filter((b) => b.id !== opener?.id)
        .reduce<typeof opener>((best, b) => (!best || b.state.order < best.state.order ? b : best), null) ??
      opener
    : opener;
  const free = opener
    ? cascade && cascadeBase
      ? { x: cascadeBase.state.free.x + CASCADE.dx, y: cascadeBase.state.free.y + CASCADE.dy, z: cascadeBase.state.free.z }
      : {
          x: opener.state.free.x + opener.state.size.w / 2 + BESIDE_GAP + size.w / 2,
          y: opener.state.free.y,
          z: opener.state.free.z,
        }
    : { x: 0, y: 0, z: 0 };

  let w = world.add(
    Bubble.create({
      id: newId,
      title,
      hue: input.hue ?? hueOf(newId),
      w: Math.max(80, size.w),
      h: Math.max(METRICS.HEADER + 10, size.h),
      parent: space === 'root' ? null : space,
      order: at + 1,
      free,
    }),
  );
  // 順序を 0.. に振り直す（間に挟んだので、後ろが1つずつ下がる）
  const after = w
    .kidsOf(space)
    .slice()
    .sort((p, q) => (p.id === newId ? at + 0.5 : p.state.order) - (q.id === newId ? at + 0.5 : q.state.order))
    .map((b) => b.id);
  w = renumber(w, after);

  /**
   * ★ 同じ種類の兄弟が既にいるなら、**共通の見えない親（並び）を作って、その中に並べる**。
   *
   * これが無いと、一覧の項目を2つ開いたとき、どちらも「一覧の右隣」という
   * 同じ場所に重なる（元の泡が同じなので、行き先も同じになる）。
   * 使うのは規則③ の「くっつける」そのもの ── 新しい仕組みは要らない。
   *   1枚目の相手には見えない親が生まれ（born）、2枚目からはその並びに加わる（join）。
   */
  // 重ねて開くときは、見えない親にまとめない ── まとめると並び全体が 1 つの像になり、
  // 魚眼が幅に罰を与えて「開くほど、いちばん見たいものが小さくなる」（v7 の 0.755）
  const mate = !cascade && input.joinWith ? w.bubble(input.joinWith) : null;
  if (mate && mate.id !== newId) {
    const row = w.rowOf(mate.id);
    const ctx = actContext(
      viewport,
      new Map(
        resolveWorld(world, viewport, input.rules).order.map((p) => [
          p.id,
          { x: p.x, y: p.y, w: p.box.w, h: p.box.h, scale: p.scale },
        ]),
      ),
      input.rules,
    );
    w = applySnap(w, ctx, newId, {
      kind: row ? 'join' : 'born',
      target: mate.id,
      axis: 'x',
      after: true,   // 続けて開いたものは、前に開いたものの右に
      dist: 0,
    }).world;
  }

  // ★ 横に開いたら X の魚眼を点ける。次元は変えない（自由X のまま）
  //   ただし **元の泡があるときだけ** ── 最初の1つを置くのに、小さくする相手はいない
  //   `keepLens` が来ているときも触らない（誰かが向きを選んでいる）
  if (opener && (input.as ?? 'beside') === 'beside' && !input.keepLens) {
    const view = w.ownViewOf(space);
    if (!view || view.x.lens !== 'fisheye') w = withAxis(w, space, 'x', { lens: 'fisheye' });
  }
  // 重ねて開くときは Z を使わない。**前後は「焦点に近い＝大きいほうが手前」**で決まる
  //（描く順の第2キー）。触れば焦点が寄り、前後が入れ替わる ── 泡の値は 1 つも書かない
  if (cascade) {
    const view = w.ownViewOf(space);
    if (!view || view.z.dim !== 'none') w = withAxis(w, space, 'z', { dim: 'none', lens: 'flat' });
  }

  // ② 開いたら、そこへ視点が寄る（泡の値は1つも書かない）
  w = focusOn(w, resolveWorld(w, viewport, input.rules), newId, input.rules);
  return { world: w, id: newId };
}

/**
 * 面に開く（`depth: 'plane'`）── 旧 `bubbles-ui` の `popChild` / `joinSibling` を Z で書いたもの。
 *
 * ```
 *   旧                          ここ
 *   layers.unshift([id])        いちばん手前より1段手前の値を free.z に書き、Z の焦点をそこへ送る
 *   layers[0].push(id)          兄弟と同じ free.z。並びに加わる（規則③）
 *   測る→Redux→再レンダ→置く    置く所は**解いた答えから純関数で**出る（測らない）
 * ```
 *
 * ★ **他の泡の値は1つも書かない。** 全員が1段下がって見えるのは、焦点が手前へ動いたから。
 * ★ **X・Y の焦点は動かさない。** 平行のレンズで X・Y を送ると画面ごと滑る（CARRYOVER「開いた瞬間に画面ごと滑る」）。
 *   旧も開いたときに画面は滑らない。奥行きだけが変わる。
 * ★ 置く所は「元の泡が**1段下がった後**の右辺」。旧の `toLayerBelow().toGlobal().getNeighbor()` と同じ考えを、
 *   焦点を送った世界を解いて読む ── 縁が接する（実測 0.0000px）。
 */
function openOnPlane(input: OpenAtInput): OpenAtResult {
  const { world, viewport, openerId, newId, title } = input;
  const R = resolveRules(input.rules);
  const size = { w: Math.max(80, (input.size ?? DEFAULT_SIZE).w), h: Math.max(METRICS.HEADER + 10, (input.size ?? DEFAULT_SIZE).h) };
  const opener = openerId === null ? null : world.bubble(openerId);
  // ③ 見えない親（並び）は体を持たない。面を持つのは外へたどった窓
  const space = opener ? world.windowOf(opener.space) : 'root';
  const parent = space === 'root' ? null : space;
  const make = (free: { x: number; y: number; z: number }) =>
    Bubble.create({ id: newId, title, hue: input.hue ?? hueOf(newId), w: size.w, h: size.h, parent, order: world.kidsOf(space).length, free });

  // 最初の1つ：真ん中、いまの面
  if (!opener) {
    return { world: world.add(make({ x: 0, y: 0, z: world.focusOf(space).z })), id: newId };
  }

  const mate = input.joinWith ? world.bubble(input.joinWith) : null;
  if (mate && mate.id !== newId) {
    // ── 同じ種類：兄弟と同じ面に並べる（旧 joinSibling）。面は増えない
    const z = mate.state.free.z;
    let w = world.add(make({ x: mate.state.free.x + mate.state.size.w / 2 + size.w / 2, y: mate.state.free.y, z }));
    const row = w.rowOf(mate.id);
    const ctx = actContext(viewport, seenOf(world, viewport, input.rules), input.rules);
    w = applySnap(w, ctx, newId, { kind: row ? 'join' : 'born', target: mate.id, axis: 'x', after: true, dist: 0 }).world;
    return { world: bringIntoView(sendZ(w, viewport, space, z, R), viewport, space, newId, R), id: newId };
  }

  // ── 別の種類：1段手前に新しい面（旧 popChild）
  const kids = world.kidsOf(space);
  const z = Math.min(...kids.map((b) => b.state.free.z)) - PLANE_STEP;
  // 仮に置いて焦点を送り、元の泡が「1段下がった後」に画面のどこへ来るかを読む
  const probe = sendZ(world.add(make({ x: 0, y: 0, z })), viewport, space, z, R);
  const L = resolveWorld(probe, viewport, input.rules);
  const S = L.spaces.get(space);
  // 元の泡が並びの中にいるなら、基準は並びごと（並びの右辺に接して置く）
  const base = L.byId.get(world.rowOf(opener.id)?.id ?? opener.id);
  if (!S || !base) return { world: probe, id: newId };
  const free = {
    x: screenToAxis(S, 'x', base.x + base.w, 1) + size.w / 2,   // 右辺に接する。m=1 ＝ 焦点の面
    y: screenToAxis(S, 'y', base.y, 1) + size.h / 2,            // 上をそろえる
    z,
  };
  return { world: bringIntoView(sendZ(world.add(make(free)), viewport, space, z, R), viewport, space, newId, R), id: newId };
}

/**
 * 開いた泡が窓からはみ出すなら、**はみ出したぶんだけ** X・Y の視点を送る。真ん中へは寄せない。
 *
 * ★ 面は幅を潰さない（魚眼とちがって）。だから同じ種類を続けて開くと、いつか窓の右へ溢れる
 *   （実測：1440px の窓で、300px の詳細の3枚目が x1460…1760）。
 *   ②の「視点が寄る」をそのまま当てると泡が真ん中へ来るまで画面ごと滑るので、要るぶんだけにする。
 * ★ 平行のレンズの軸だけ。曲がったレンズでは「送る量」が画面の量と一致しないので、手を出さない。
 */
const VIEW_MARGIN = 24;
function bringIntoView(world: BubbleWorld, viewport: Viewport, space: string, id: BubbleId, R: LayoutRules): BubbleWorld {
  const L = resolveWorld(world, viewport, R);
  const p = L.byId.get(id);
  const S = L.spaces.get(space);
  if (!p || !S) return world;
  let w = world;
  for (const axis of ['x', 'y'] as const) {
    if (S.view[axis].lens !== 'parallel') continue;
    const lo = axis === 'x' ? p.x : p.y;
    const hi = lo + (axis === 'x' ? p.w : p.h);
    const size = axis === 'x' ? viewport.w : viewport.h;
    // 右（下）へ溢れたぶん。ただし左（上）が切れるほどは送らない ── 泡の頭が見えているほうが大事
    const over = Math.max(0, hi - (size - VIEW_MARGIN));
    const shift = Math.min(over, Math.max(0, lo - VIEW_MARGIN)) + Math.min(0, lo - VIEW_MARGIN);
    if (shift === 0) continue;
    w = withFocusAxis(w, S, axis, S.focus[axis] + shift / S.host.scale, R);
  }
  return w;
}

/** Z の焦点を送る。約束（`fitFocus`）は通す */
function sendZ(world: BubbleWorld, viewport: Viewport, space: string, z: number, R: LayoutRules): BubbleWorld {
  const L = resolveWorld(world, viewport, R).spaces.get(space);
  return L ? withFocusAxis(world, L, 'z', z, R) : world;
}

function seenOf(world: BubbleWorld, viewport: Viewport, rules?: Partial<LayoutRules>) {
  return new Map(
    resolveWorld(world, viewport, rules).order.map((p) => [p.id, { x: p.x, y: p.y, w: p.box.w, h: p.box.h, scale: p.scale }]),
  );
}

/**
 * 面の上で閉じたあと ── **焦点の面が空になったら、焦点は残った中でいちばん手前の面へ下がる。**
 *
 * 旧の「空になったレイヤーは消え、後ろが1段ずつ上がる」に当たる。値は書かない。
 * ★ これは A 案（いまの規則のまま）の手当て。Z の「詰める」の帯の幅を step にすれば（v7 の B 案）、
 *   面はひとりでに詰まるので、この関数ごと要らなくなる。
 */
export function settlePlaneAfterClose(
  world: BubbleWorld, viewport: Viewport, space: string, rules?: Partial<LayoutRules>,
): BubbleWorld {
  const kids = world.kidsOf(world.windowOf(space));
  if (!kids.length) return world.withFocus(world.windowOf(space), { z: 0 });
  const front = Math.min(...kids.map((b) => b.state.free.z));
  if (world.focusOf(world.windowOf(space)).z >= front) return world;   // 焦点の面か、その奥にまだ泡がいる
  return sendZ(world, viewport, world.windowOf(space), front, resolveRules(rules));
}

/** 色は id から作る（同じ url なら同じ色になるので、開き直しても色が変わらない） */
export function hueOf(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}
