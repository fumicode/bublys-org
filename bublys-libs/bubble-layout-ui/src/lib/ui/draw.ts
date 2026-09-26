/**
 * 描く ── 配置（domain の答え）→ DOM の属性。React も DOM も要らない純関数。
 *
 * 元：docs/bubble-space-prototype/v5-dom/lab.html 1017-1096 行 `renderBubbles`。
 * ★ ここが「ラボと px で差 0」を約束している面。ラボが書いている文字列を1字ずつ同じに作る
 *   （`toFixed` の桁も、書く順も、クラス名の並びも）。
 *
 * ★ 描く下限（tiny）は **ここ**（ui）にあって、domain には無い。
 *   `resolveWorld` の答え（placements）は下限を動かしても1バイトも変わらない ── DECISIONS.md。
 */
import { clamp, hostScale, spaceSummary, verbOf, viewOfSpace } from '@bublys-org/bubble-layout';
import type { BubbleId, BubbleWorld, Layout, Placement, SpaceId, Viewport } from '@bublys-org/bubble-layout';

/** 泡のヘッダの高さ。domain の `METRICS.header` と同じ数（ここでは中身の行数を数えるのに要る） */
import { frustumBand } from './link-band-path.js';

export const HEADER = 24;
/** 字の下限（画面 px）。これより小さくなる題名・印は描かない（lab.html 974 行） */
export const MARK_MIN = 6.5;
/** ★ 描く下限の既定（画面 px・短辺）。いくつがよいかは未決 ── DECISIONS.md */
export const DRAW_MIN = 5.0;
/**
 * 中身を描く倍率の下限。**その泡が自分の海の中でどれだけ縮んでいるか**で見る。
 *
 * ★ **「題名が読めない」と「中身を描かない」は別の話。**
 *   題名は読めなくなったら出す意味が無い（{@link MARK_MIN}）が、中身は読めなくても
 *   **形が「何が入っているか」の手がかり**になる。だから中身はもっと奥まで描く。
 *   前はここが分かれておらず、本文 12px が 6.5px を切る倍率 0.542 で中身ごと消えていて、
 *   泡そのものは短辺 5px まで残るので「枠だけの箱」が長く居座っていた。
 *
 * ★ **それぞれの海が、自分の物差しで決める。**
 *   `Placement.scale` は入れ子を掛け合わせた**画面の**倍率（`compose`）なので、
 *   そのまま比べると**窓の中の泡が、外の海と同じ画面の大きさで中身を失う**
 *   ── 窓はそれ自体が縮んで写るので、中の泡は自分の海をいくら占めていても消えた。
 *   見るのは自分の海の中での縮み（`scale ÷ その空間の倍率`）だけ。
 *   絶対の下限は**窓が受け持つ** ── 窓が小さくなれば窓ごと中身を描かなくなるので、
 *   中の海はそこで丸ごと消える。物差しが海ごとに閉じて、入れ子でも同じ言葉で通る。
 */
export const CONTENT_MIN = 0.25;
/** 画面の外へどれだけ出たら消すか（lab.html 1041 行） */
const OUT_PAD = 60;

/** 題名・印の幅を測る人。画面が無い所（テスト）では作り物を渡す */
export type MeasureText = (text: string, px: number) => number;

export interface DrawInput {
  readonly world: BubbleWorld;
  readonly layout: Layout;
  readonly viewport: Viewport;
  /** 短辺がこれを切った泡は描かない。0 で「なし（ぜんぶ描く）」 */
  readonly drawMin?: number;
  readonly selectedId?: BubbleId | null;
  /** 見えない親の縁に触れている（枠をシアンにする） */
  readonly hoverRing?: BubbleId | null;
  /** 掴んでいる泡とその中身（掴めなくする） */
  readonly skipGrab?: ReadonlySet<BubbleId> | null;
  /** 掴んでいる泡そのもの（箱の縁で切らないのはこれだけ） */
  readonly grabbedId?: BubbleId | null;
  /**
   * **補間しない泡。** 装いが出入りする泡がこれ。
   *
   * ★ 装いは箱の大きさ（その場で効く）と位置（320ms かけて補間）の**両方**を変える。
   *   片方だけ補間すると、**中身が装いの高さぶん飛んでから戻ってくる**
   *   ── 実測：選んだ札の中身が 27px 下がって、そこから元の位置へ 320ms かけて浮き上がった。
   *   装いが出た泡は**そもそも動かない**（`resolve.ts` の `dressed`）ので、補間するものが無い。
   */
  readonly noTween?: ReadonlySet<BubbleId> | null;
  readonly measureText: MeasureText;
  /**
   * **どこから開いたか。** 開いた泡の id → 開いた元の id。
   * 渡さなければ帯は描かない（ラボの素の海は関係を持たない）。
   */
  readonly openerOf?: ReadonlyMap<BubbleId, BubbleId | null> | null;
  /**
   * **帯の出どころ。** 開いた泡の id → 押されたものの id。
   * 一覧の札から開いたとき、`openerOf` は一覧（置き場所を決めた側）だが、
   * 帯はこちら（札そのもの）から出す。無い／描かれていなければ `openerOf` に落ちる。
   */
  readonly originOf?: ReadonlyMap<BubbleId, BubbleId | null> | null;
  /**
   * **押されたのが泡の中の一点だったとき**、その場所（出どころの箱に対する割合 0〜1）。
   * 中の要素から開いたことが、帯の細い側の形でそのまま見える。
   */
  readonly originSpotOf?: ReadonlyMap<BubbleId, BandSpot> | null;
  /** いま触れている泡。帯を見せるかどうかだけに使う */
  readonly hoveredId?: BubbleId | null;
}

/** 1つの泡を描くのに要るものぜんぶ */
export interface BubbleDraw {
  readonly id: BubbleId;
  readonly implicit: boolean;
  readonly hue: number;
  readonly title: string;
  readonly className: string;
  readonly style: Readonly<Record<string, string | number>>;
  /**
   * **留め** ── その泡を包む 1 枚（`bl-hold`）。箱に留める泡では箱そのもの
   * （大きさ ＋ `overflow:hidden` ＋ 箱の位置）、留めない泡では大きさを持たない素通し。
   * 切り取りを**箱の側**に置くための入れもの（{@link drawBubble} の註）。
   */
  readonly hold: Readonly<Record<string, string | number>>;
  /** 描く下限を切ったか（掴めない） */
  readonly tiny: boolean;
  /** 掴めるか */
  readonly grab: boolean;
  /** 見えない親の札（「見えない親 · 横に並べる」） */
  readonly label: string | null;
  /** 空間を持つ泡の印（「中は別の空間 · 動く」） */
  readonly mark: string | null;
}

/** 大きさの角。★ 泡の中ではなく層の兄弟に置く（遠い泡の opacity に薄まらないように） */
export interface HandleDraw {
  readonly transform: string;
  readonly zIndex: number;
}

/**
 * **帯** ── 「この泡は、あの泡から開いた」を示す錐台。
 *
 * 起点の 4 頂点と開いた先の 4 頂点を同名で対応づけた形（{@link frustumBand}）で、
 * 旧い海（`BubblesLayeredView`）が描いていたものと同じ。**線ではなく面**なので、
 * 魚眼で小さく写る泡へ伸びる帯は勝手に細くなる ── 太さを自分で持たなくてよい。
 */
/** 泡の箱に対する割合（0〜1）で言う、中の一点 */
export interface BandSpot {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface BandDraw {
  /** 開いた先の泡（帯はこの泡に着く） */
  readonly id: BubbleId;
  /** 開いた元の泡。帯を見せるかどうかは**両端のどちらか**に触れているかで決まる */
  readonly openerId: BubbleId;
  readonly path: string;
  /** 起点の色相。帯は起点の色で塗る */
  readonly hue: number;
  readonly zIndex: number;
  /** いま見せる状態か（両端のどちらかに触れている） */
  readonly on: boolean;
}

export interface FieldDraw {
  readonly items: readonly BubbleDraw[];
  /** どこから開いたかの帯（`openerOf` を渡したときだけ） */
  readonly bands: readonly BandDraw[];
  readonly handle: HandleDraw | null;
  /** 短辺が下限を切って描かなかった泡（ツールバーの読みに出す） */
  readonly tinyIds: readonly BubbleId[];
}

/**
 * **魚眼の掛かった空間での、描く下限。**
 *
 * ★ 魚眼は「端は小さく写るが、**在ることは見える**」が値打ち。ふつうの下限（5px）のままだと
 *   いちばん外がまるごと消えて、チラ見えのはずのものが「無い」になる
 *   （実測：格子で 16 枚のうち 4 枚が 12×3px で消えた／岸に貼った一覧では 16 枚のうち
 *   12 枚が消え、残ったのは 2 枚だけだった）。だからここだけ下限を下げる。
 * ★ **片方の軸だけの魚眼にも効かせる。** 初めは格子（両方の軸が魚眼）だけにしていたが、
 *   横・縦の coverflow でも、箱が小さいと端から順に消えて「中身が消えた」に見える。
 *   消えるかどうかを決めているのはレンズなので、掛かっている軸が 1 つでも同じ扱いにする。
 * ★ 0 にはしない ── 割り切ってしまうと数だけ増えて画面には出ない。
 *   0.4px なら、ブラウザは髪の毛 1 本の線として塗る（消えはしない）。
 */
export const LENS_DRAW_MIN = 0.4;

/**
 * **魚眼の掛かった空間での、中身を描く下限。**
 *
 * ★ 枠が残っても中身が消えると、端は**空の白い箱**になる ── 「小さいけれど同じ札がある」が
 *   読めない。魚眼では端まで中身を描いて、潰れた札のままでいさせる。
 *   ふつうの下限（{@link CONTENT_MIN} ＝ 0.25）は、遠い泡の中身を描かないための値で、
 *   「端ほど潰れる」が売りの並べ方には強すぎる。
 */
export const LENS_CONTENT_MIN = 0.04;

/**
 * ★ 描く下限：短辺が drawMin を切った泡に印を付ける（lab.html 838-860 行 markTiny）。
 *   入れ物が消えたら中身も消える。見えない親は、描く子が1つも無くなったら消える。
 *   `vis` には触らない ── vis はレンズの答え（domain）で、ここは ui が重ねる別の旗。
 *
 * ★ **下限は空間ごと。** 魚眼の格子だけ下げる（{@link LENS_DRAW_MIN}）。
 */
export function markTiny(
  world: BubbleWorld,
  layout: Layout,
  drawMin: number,
): ReadonlySet<BubbleId> {
  const tiny = new Set<BubbleId>();
  if (drawMin <= 0) {
    // 下限なしでも「並びの中身が全部消えたら枠も消す」は効かせない（消える泡が無いので同じ）
    return tiny;
  }
  /** その泡がいる空間での下限 ── 魚眼が掛かっていれば、小さくても描く */
  const minIn = (space: SpaceId): number => {
    const V = viewOfSpace(world, space);
    return V.x.lens === 'fisheye' || V.y.lens === 'fisheye'
      ? Math.min(drawMin, LENS_DRAW_MIN)
      : drawMin;
  };
  const memo = new Map<SpaceId, boolean>();
  const shown = (id: SpaceId): boolean => {
    const known = memo.get(id);
    if (known !== undefined) return known;
    const p = layout.byId.get(id);
    if (!p) return true; // 外の空間（root）は入れ物ではない
    memo.set(id, true); // 念のため輪を切る（木なので回らない）
    const v = Math.min(p.w, p.h) >= minIn(p.space) && shown(p.space);
    memo.set(id, v);
    return v;
  };
  for (const p of layout.order) if (!shown(p.id)) tiny.add(p.id);
  // ③ 中身が全部消えたら、並びの枠だけ残さない（子は親より後ろに並ぶので、後ろから）
  for (let i = layout.order.length - 1; i >= 0; i--) {
    const p = layout.order[i];
    if (!p.b.state.implicit || tiny.has(p.id)) continue;
    const alive = world
      .kidsOf(p.id)
      .some((k) => {
        const q = layout.byId.get(k.id);
        return !!q && q.vis > 0 && !tiny.has(k.id);
      });
    if (!alive) tiny.add(p.id);
  }
  return tiny;
}

/** 中身の仮の行の本数（canvas 版と同じ式。lab.html 1029 行） */
export function rowsOf(boxHeight: number): number {
  return Math.max(0, Math.min(6, Math.floor((boxHeight - HEADER - 12) / 11)));
}

/** 1フレームぶん描く */
export function drawField(input: DrawInput): FieldDraw {
  const { world, layout, viewport, measureText } = input;
  const drawMin = input.drawMin ?? DRAW_MIN;
  const selectedId = input.selectedId ?? null;
  const hoverRing = input.hoverRing ?? null;
  const skip = input.skipGrab ?? null;
  const tiny = markTiny(world, layout, drawMin);

  const items: BubbleDraw[] = [];
  const tinyIds: BubbleId[] = [];
  let handle: HandleDraw | null = null;
  /** 帯を引くのに要る「描かれた矩形」。描かなかった泡は入れない */
  const shown = new Map<BubbleId, Placement>();

  for (let i = 0; i < layout.order.length; i++) {
    const p = layout.order[i];
    const isTiny = tiny.has(p.id);
    if (isTiny) tinyIds.push(p.id);
    const item = drawBubble(p, i, isTiny, {
      world,
      layout,
      viewport,
      selectedId,
      hoverRing,
      skip,
      grabbed: input.grabbedId ?? null,
      noTween: input.noTween ?? null,
      measureText,
    });
    items.push(item);
    if (item.style['display'] === '') shown.set(p.id, p);
    // ③ 見えない親に角は無い。描いてある泡にだけ、その泡と同じ z（＝描く順）で角を出す
    if (p.id === selectedId && !p.b.state.implicit && item.style['display'] === '') {
      handle = {
        transform: `translate(${(p.x + p.w - 12).toFixed(2)}px,${(p.y + p.h - 12).toFixed(2)}px)`,
        zIndex: zOf(i),
      };
    }
  }
  return {
    items,
    bands: bandsOf(
      input.openerOf ?? null, input.originOf ?? null, input.originSpotOf ?? null,
      input.hoveredId ?? null, layout, shown,
    ),
    handle,
    tinyIds,
  };
}

/**
 * **前後の数。** 泡は偶数、帯は 1 つ下の奇数に置く。
 *
 * 帯は「開いた先の泡のすぐ下」に居てほしい ── 泡と同じ数にすると、どちらが手前かは
 * DOM の並びで決まってしまう。ところが DOM の並びは id で固定してあって
 * 描く順とは関係がない（{@link BubbleField} の註）ので、同じ数にしてはいけない。
 */
const zOf = (i: number): number => i * 2;

/**
 * **どこから開いたかの帯を引く。**
 *
 * ★ 引くのは**同じ海にいるものどうし**だけ。窓や一覧の中と外は `bl-hold` で切られるので、
 *   またいで引いた帯は縁で切れて途中で消える ── 窓そのものが持つ帯が、その続きを言う。
 * ★ 太さは持たない。帯は 2 つの矩形から作る**面**なので、魚眼で小さく写る泡へ伸びれば
 *   勝手に細くなる。
 * ★ 位置は世界に書かない。毎回その時の矩形から引き直す（焦点が動けば帯も動く）。
 */
function bandsOf(
  openerOf: ReadonlyMap<BubbleId, BubbleId | null> | null,
  originOf: ReadonlyMap<BubbleId, BubbleId | null> | null,
  originSpotOf: ReadonlyMap<BubbleId, BandSpot> | null,
  hoveredId: BubbleId | null,
  layout: Layout,
  shown: ReadonlyMap<BubbleId, Placement>,
): BandDraw[] {
  if (!openerOf || openerOf.size === 0) return [];
  /**
   * **触れているとみなすもの。** 触れている泡そのものと、**それが入っている空間**。
   * 一覧の札に触れたら一覧に触れたことにする ── 開いたときに親を一覧へ読み替えたのと同じ読み。
   */
  const hovered = new Set<BubbleId>();
  if (hoveredId) {
    hovered.add(hoveredId);
    const hp = shown.get(hoveredId);
    if (hp) hovered.add(hp.space);
  }
  const bands: BandDraw[] = [];
  for (let i = 0; i < layout.order.length; i++) {
    const p = layout.order[i];
    const openerId = openerOf.get(p.id) ?? null;
    if (!openerId) continue;
    const op = shown.get(openerId);
    const me = shown.get(p.id);
    if (!op || !me) continue;
    if (op.space !== me.space) continue; // 海をまたぐ帯は引かない（上の註）
    /**
     * ★ **出どころは押されたもの。** 一覧の札から開いたなら札から出す（札も泡なので矩形がある）。
     *   海をまたぐかどうかは**開いた元**（一覧）で見る ── 札は一覧の中に居るので、
     *   札で見ると必ずまたいでしまう。帯は層の兄弟として描くので切られない。
     */
    const originId = originOf?.get(p.id) ?? null;
    const from = (originId ? shown.get(originId) : null) ?? op;
    const band = frustumBand(spotRect(from, originSpotOf?.get(p.id) ?? null), rectOf(me));
    if (!band) continue; // 一方が他方を含んでいる ── 帯は無い
    bands.push({
      id: p.id, openerId, path: band.path, hue: from.b.state.hue ?? 0,
      zIndex: zOf(i) - 1, on: hovered.has(p.id) || hovered.has(openerId) || hovered.has(from.id),
    });
  }
  return bands;
}

const rectOf = (p: Placement) => ({ left: p.x, top: p.y, right: p.x + p.w, bottom: p.y + p.h });

/**
 * 出どころの矩形。中の一点が分かっていれば、そのぶんだけ狭める。
 * 割合で来るので、レンズで泡が大きくなろうと小さくなろうと同じ所を指す。
 */
const spotRect = (p: Placement, spot: BandSpot | null) => {
  if (!spot) return rectOf(p);
  const left = p.x + spot.x * p.w;
  const top = p.y + spot.y * p.h;
  return { left, top, right: left + spot.w * p.w, bottom: top + spot.h * p.h };
};

interface Ctx {
  readonly world: BubbleWorld;
  readonly layout: Layout;
  readonly viewport: Viewport;
  readonly selectedId: BubbleId | null;
  readonly hoverRing: BubbleId | null;
  readonly skip: ReadonlySet<BubbleId> | null;
  readonly grabbed: BubbleId | null;
  readonly noTween: ReadonlySet<BubbleId> | null;
  readonly measureText: MeasureText;
}

function drawBubble(p: Placement, i: number, isTiny: boolean, c: Ctx): BubbleDraw {
  const b = p.b;
  const st = b.state;
  const s = p.scale;
  /**
   * **自分の海の中での縮み。** `p.scale` は入れ子を掛け合わせた画面の倍率なので、
   * その空間ぶんを割り戻す（{@link CONTENT_MIN} の註）。
   */
  const here = c.layout.spaces.get(p.space);
  const sHere = here ? s / Math.max(1e-9, hostScale(here.host)) : s;
  const bw = Math.max(1, p.box.w);
  const bh = Math.max(1, p.box.h);

  const vis = p.vis > 0; // ★ レンズの答え（補間しない）
  const draw = vis && !isTiny; // ★ 描く下限を切った泡は描かない
  const grab = draw && !(c.skip ? c.skip.has(b.id) : false); // → 掴めない（pointer-events:none）
  const out =
    p.x > c.viewport.w + OUT_PAD ||
    p.y > c.viewport.h + OUT_PAD ||
    p.x + p.w < -OUT_PAD ||
    p.y + p.h < -OUT_PAD ||
    p.w < 2;

  const style: Record<string, string | number> = {
    width: bw.toFixed(2) + 'px',
    height: bh.toFixed(2) + 'px',
    zIndex: zOf(i), // 4 描く順 ＝ z-index（帯が 1 つ下に入れるよう 2 つ刻み）
    '--k': (1 / s).toFixed(4), // 3 逆 scale
    '--h': st.hue == null ? 210 : st.hue,
    '--rows': rowsOf(bh),
  };
  // ★ 装いが出入りする泡は補間しない（上の註）。動かないのだから、補間するものが無い
  if (c.noTween?.has(b.id)) style['transition'] = 'none';

  /**
   * ★ **一覧の中身は、一覧の箱の中にだけ描く。**
   *
   *   札は一覧の泡の**外の層**に描かれている（DOM は平らなので兄弟）ので、
   *   一覧の箱では切り取れない ── はみ出したぶんが海の上に出てしまう
   *   （実測：箱 350 の一覧から札が左へ 749px、右へ 441px はみ出した）。
   *
   * ★ **切り取りは「箱の側」に置く。** 札に `clip-path` を掛けるやり方は捨てた。
   *   切れ目は札の中の座標で書くので、札が動くたびに**書き直さなければならない**。
   *   札の動き（transform）は合成の側で進むのに、切れ目の塗り直しは主たる流れの側なので、
   *   手を速く左右に振ると塗りが追いつかず、その隙に箱の外へ出る（実測で残った）。
   *   **箱と同じ大きさの入れもの（`bl-hold`）に入れて `overflow:hidden` で切る**と、
   *   切り取りは箱に貼り付いたままになり、追いつく相手がそもそも居なくなる。
   *   ふつうの web の入れもの（スクロールする箱）と同じ仕組み。
   *
   * ★ **留めるのは「1 つの泡に 1 枚」。** 空間ごとにまとめない ── DOM は平ら
   *   （泡は層の兄弟）のままにしておかないと、中の泡が親の兄弟より手前に出られない。
   *   留めが持つのは重なりの順（z-index）だけなので、並び順はこれまでどおり。
   *
   * ★ **空けてある所（`reserve`）より内側で切る。**
   *   一覧の口（＋新規）のぶんを空けているのに箱の縁で切ると、送った札が
   *   **口の並びまで出てきて被る**。隠れ始めるのは口の下。
   *
   * ★ **掴んでいる札は留めない。** 箱から外へ出すのがドラッグなので、
   *   留めたままだと掴んだ札が箱の縁で切れて、どこへ運んでいるのか見えなくなる。
   *   ★ ただし**掴んだ泡そのものだけ**。前は「掴んだ泡とその中身」で見ていたので、
   *     **窓を掴んだ瞬間に中の札の留めが外れて**いた ── 送って隠してあった札が
   *     箱の外へ現れ、離すと戻る（実測）。中身は運ばれる側であって、掴まれていない。
   *
   * ★ **奥行きに重ねる並びは切らない。** そちらは箱の外へ伸びていく絵で、
   *   切ると「奥に続いている」が読めなくなる。
   */
  const home = c.layout.spaces.get(p.space);
  /**
   * ★ **魚眼の掛かった空間では、中身も端まで描く**（{@link LENS_CONTENT_MIN}）。
   *   端が空の白い箱になると「小さいけれど同じ札がある」が読めない。
   */
  const contentMin =
    home && (home.view.x.lens === 'fisheye' || home.view.y.lens === 'fisheye')
      ? LENS_CONTENT_MIN
      : CONTENT_MIN;
  const held = !!home && home.id !== 'root' && home.view.z.dim === 'none' && b.id !== c.grabbed;
  /** 留めの原点（画面の座標）。留めないときは画面そのもの（0,0） */
  let ox = 0;
  let oy = 0;
  const hold: Record<string, string | number> = { zIndex: zOf(i) };
  if (held && home) {
    const h = home.host;
    const rLeft = (home.view.x.reserve ?? 0) * h.scale;
    const rTop = (home.view.y.reserve ?? 0) * h.scale;
    ox = h.cx - (h.w / 2) * h.scale + rLeft;
    oy = h.cy - (h.h / 2) * h.scale + rTop;
    hold['width'] = Math.max(0, h.w * h.scale - rLeft).toFixed(2) + 'px';
    hold['height'] = Math.max(0, h.h * h.scale - rTop).toFixed(2) + 'px';
    hold['transform'] = `translate(${ox.toFixed(2)}px,${oy.toFixed(2)}px)`;
    hold['overflow'] = 'hidden';
  }
  /**
   * ★ 泡の置き場所は**留めからの相対**。留めと泡はどちらも transform なので、
   *   同じ曲線で動けば合成の側で足し合わされる ── 途中のどの絵でも辻褄が合う。
   */
  style['transform'] =
    `translate(${(p.x - ox).toFixed(2)}px,${(p.y - oy).toFixed(2)}px) scale(${s.toFixed(5)})`;

  let className: string;
  let op: number;
  let label: string | null = null;
  let mark: string | null = null;

  if (st.implicit) {
    op = clamp(p.alpha, 0, 1);
    style['display'] = !draw || op <= 0.02 || out ? 'none' : '';
    label = '見えない親 · ' + implicitWord(c.world, b.id);
    className =
      'bub imp' +
      (grab ? '' : ' off') +
      (b.id === c.selectedId ? ' sel' : '') +
      (b.id === c.selectedId || c.hoverRing === b.id ? ' on' : '') +
      (p.y + p.h + 21 <= c.viewport.h ? '' : ' lbup'); // 札は枠の下。入らなければ上
  } else {
    /**
     * 霞み ── **前後ではなく「写った大きさ」で薄くする**。手前かどうかは見ていない。
     * ラボは `0.3 + 0.7 × 倍率`（lab.html 1054 行）だったが、これだと魚眼で縮んだ泡が
     * 何にも隠れていないのに沈んで見える（実測：倍率 0.17 で opacity 0.42、
     * 隣に居る原寸の泡が 1.0 なので「一番手前なのに暗い」と映る）。
     * 霞ませ方を弱めて `0.5 + 0.5 × 倍率` にした。
     *
     * ★ **この薄め方そのものが良くない（2026-09-23 に申し送り）。**
     *   「小さい＝薄い」を一本の式で決めているせいで、
     *   「遠いから霞む」と「触っていないから沈む」が混ざっている。
     *   どちらを見せたいのかを決め直してから、式ごと作り替えること。
     *   いまの 0.5 は**繋ぎの値**であって、決まりではない。
     */
    op = clamp(p.alpha, 0, 1) * clamp(0.5 + 0.5 * Math.min(1, s), 0.15, 1);
    style['display'] = out || isTiny || (op < 0.02 && !vis) ? 'none' : '';
    const chip = p.box.h <= 34;
    const host = c.world.isHost(b.id);
    let mcls = '';
    if (host) {
      const S = spaceSummary(c.world, b.id);
      mark = '中は別の空間 · ' + S.short;
      const mw = c.measureText(mark, 10);
      const tw = c.measureText(st.title, 12);
      const under = !(mw + tw + 27 <= bw); // 題名の右に入らなければヘッダの下へ
      // ★ ヘッダの下でも入らなければ字を縮める（canvas 版の drawSpaceMark と同じ式）。
      //   縮めないと印が泡の外へはみ出して、隣の泡や点線の上に字が乗る
      const fs = under ? Math.min(9, (10 * (bw - 18)) / Math.max(1, mw)) : 10;
      style['--mkfs'] = fs.toFixed(3) + 'px';
      mcls =
        (S.cls === 'move' ? '' : ' mfix') +
        (fs * s < MARK_MIN || chip ? ' nm' : '') + // 字の下限 6.5px を切ったら出さない
        (under ? ' mk2' : '');
    }
    className =
      'bub' +
      (grab ? '' : ' off') +
      (b.id === c.selectedId ? ' sel' : '') +
      (chip ? ' chip' : '') +
      (host ? ' host' : '') +
      (12 * s < MARK_MIN ? ' nt' : '') +   // 題名：字の下限 6.5px を切ったら出さない
      (sHere < contentMin ? ' nc' : '') + // 中身：題名より奥まで描く（自分の海の中での縮みで見る）
      (s <= 0.2 ? ' nb' : '') +
      mcls;
  }
  style['opacity'] = Math.round(op * 1000) / 1000;

  return {
    id: b.id,
    implicit: st.implicit,
    hue: st.hue == null ? 210 : st.hue,
    title: st.title,
    className,
    style,
    hold,
    tiny: isTiny,
    grab,
    label,
    mark,
  };
}

/** 見えない親の札の言葉（lab.html 1048 行そのまま） */
function implicitWord(world: BubbleWorld, id: SpaceId): string {
  const V = viewOfSpace(world, id);
  return verbOf(V.x.dim) === 'reorder' ? '横に並べる'
       : verbOf(V.y.dim) === 'reorder' ? '縦に並べる'
       : '並べる';
}
