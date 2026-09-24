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
  readonly measureText: MeasureText;
}

/** 1つの泡を描くのに要るものぜんぶ */
export interface BubbleDraw {
  readonly id: BubbleId;
  readonly implicit: boolean;
  readonly hue: number;
  readonly title: string;
  readonly className: string;
  readonly style: Readonly<Record<string, string | number>>;
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

export interface FieldDraw {
  readonly items: readonly BubbleDraw[];
  readonly handle: HandleDraw | null;
  /** 短辺が下限を切って描かなかった泡（ツールバーの読みに出す） */
  readonly tinyIds: readonly BubbleId[];
}

/**
 * ★ 描く下限：短辺が drawMin を切った泡に印を付ける（lab.html 838-860 行 markTiny）。
 *   入れ物が消えたら中身も消える。見えない親は、描く子が1つも無くなったら消える。
 *   `vis` には触らない ── vis はレンズの答え（domain）で、ここは ui が重ねる別の旗。
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
  const memo = new Map<SpaceId, boolean>();
  const shown = (id: SpaceId): boolean => {
    const known = memo.get(id);
    if (known !== undefined) return known;
    const p = layout.byId.get(id);
    if (!p) return true; // 外の空間（root）は入れ物ではない
    memo.set(id, true); // 念のため輪を切る（木なので回らない）
    const v = Math.min(p.w, p.h) >= drawMin && shown(p.space);
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
      measureText,
    });
    items.push(item);
    // ③ 見えない親に角は無い。描いてある泡にだけ、その泡と同じ z（＝描く順）で角を出す
    if (p.id === selectedId && !p.b.state.implicit && item.style['display'] === '') {
      handle = {
        transform: `translate(${(p.x + p.w - 12).toFixed(2)}px,${(p.y + p.h - 12).toFixed(2)}px)`,
        zIndex: i,
      };
    }
  }
  return { items, handle, tinyIds };
}

interface Ctx {
  readonly world: BubbleWorld;
  readonly layout: Layout;
  readonly viewport: Viewport;
  readonly selectedId: BubbleId | null;
  readonly hoverRing: BubbleId | null;
  readonly skip: ReadonlySet<BubbleId> | null;
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
    transform: `translate(${p.x.toFixed(2)}px,${p.y.toFixed(2)}px) scale(${s.toFixed(5)})`,
    zIndex: i, // 4 描く順 ＝ z-index
    '--k': (1 / s).toFixed(4), // 3 逆 scale
    '--h': st.hue == null ? 210 : st.hue,
    '--rows': rowsOf(bh),
  };

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
      (sHere < CONTENT_MIN ? ' nc' : '') + // 中身：題名より奥まで描く（自分の海の中での縮みで見る）
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
