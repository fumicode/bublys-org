"use client";
/**
 * 一覧の空間 ── **同一ドメインの並び**を、泡として並べる。
 *
 * ★ **入れ子の海ではない。**「同じ世界の中の、子の空間」にする ── 議事録（版）と同じ形。
 *   一覧の泡そのものが空間になり、対局 1 件はその**子の泡**になる。
 *   こうしないと、奥へ重ねたときのずれが出ない：
 *   奥へ行くほど左上へ退くのは**消失点**に寄るからで、消失点は
 *   「子の空間なら自分の箱の左上の角／root なら画面中心から (−130,−165)」。
 *   入れ子の海にすると中の海もまた root になり、消失点が箱と関係ない所に置かれる。
 *
 * ここがやるのは 2 つだけ（世界に書くのは `setChildren` の 1 回）:
 *   - **顔ぶれを合わせる**（`members`）。開いて増えるのではなく、中身がそのまま並ぶ
 *   - **並べ方を選ぶ**。縦に収まるうちは「縦に並べる」／収まらなくなったら「奥行きに重ねる」
 *
 * 「項目は外の海に開く」はここには無い ── `BubbleSpace` が
 * 「一覧の中の札から開いたら一覧の隣に開く」を引き受けている。
 *
 * ★ ただし**岸に貼られたときだけは、自分で小さな海を持つ**（下の `ShoreSea`）。
 */
import { FC, ReactNode, createContext, useContext, useEffect, useRef, useState } from "react";
import { BubbleSpace } from "./BubbleSpace.js";
import {
  LIST_DEPTH_INSET,
  colsFor,
  fitBoxFor,
  itemWidthFor,
  needsBand,
  usedFor,
  pickPreset,
  reserveFor,
  stepFor,
} from "./listArrange.js";
import { useBubbleSpace, useCurrentBubble, useViewChoice } from "./context.js";
import type { BubbleSpaceApi } from "./context.js";
import type { BubbleRoute as LayoutRoute } from "./routing.js";
import { METRICS } from "@bublys-org/bubble-layout";
import type { PresetId } from "@bublys-org/bubble-layout";

/** 新しい空間のルート一覧。どの泡からでも引けるように文脈で配る */
export const LayoutRoutesContext = createContext<readonly LayoutRoute[]>([]);
export const LayoutRoutesProvider: FC<{ routes: readonly LayoutRoute[]; children: ReactNode }> = ({
  routes,
  children,
}) => <LayoutRoutesContext.Provider value={routes}>{children}</LayoutRoutesContext.Provider>;

export type ListSpaceProps = {
  /** 並べる相手（url）。中身がそのまま顔ぶれになる */
  readonly members: readonly string[];
  /** 1 件のおおよその高さ。「縦に並べて収まるか」を測るのに使う */
  readonly itemHeight?: number;
  /**
   * 1 件の幅。**数**なら決め打ち、**関数**なら「並びに使える幅」を受けて札が自分で答える。
   *
   * ★ 札の大きさを決めるのは札（`itemWidthFor` の註）。ただし箱と折り合いを付けたい札もある
   *   ── 囲碁の札は「名前を理想 12 文字ぶん。箱が足りなければ 7 文字まで譲る」。
   *   **譲る規則を持つのは札のほう**なので、ここは空きを教えるだけにする。
   */
  readonly itemWidth?: number | ((room: number) => number);
  /** 並びの上に置く口（「新しく作る」など）。並びの外なので、泡にはならない */
  readonly head?: ReactNode;
};

/** 口を置く帯の高さの既定（実際は測る） */
const HEAD_HEIGHT = 39;   // ★ 口は 1.5 倍（26 × 1.5）
/** 口を置く高さ（中身の箱の上から）。空ける量のほうは `listArrange` が持つ */
const HEAD_TOP = 2;

/**
 * 枠が中身に取る余白（space-css の .bl-body の左右）。口の右の余白を札とそろえるのに要る。
 */
const BODY_INSET = 7;
/** 口の右の余白 ── **札と同じ**（枠から `METRICS.PAD`）。中身の箱はもう `BODY_INSET` ぶん内側にいる */
const HEAD_RIGHT = Math.max(0, METRICS.PAD - BODY_INSET);

/**
 * 一覧の板。**白い札より少し沈んだ明るい面**。
 *
 * ★ 明るいものが重なる向きは 1 つ ── **海 → 窓 → この板 → 札**。
 *   海がいちばん濃く、窓（`WINDOW_SKY`）がその上に浮き、この板がさらに上、札がいちばん明るい。
 */
export const LIST_PANEL = 'linear-gradient(180deg,#c4cad9 0%,#b6bdce 100%)';

/**
 * 並べ方・札の形・箱の寸法は `listArrange.ts`（寸法だけの世界）にある。
 * ここから出しているのは、外（アプリ）が箱と札の大きさを揃えるため。
 */
export {
  LIST_BOX,
  LIST_CARD_WIDTH,
  LIST_DEPTH_INSET,
  LIST_DEPTH_CARD_WIDTH,
} from "./listArrange.js";

/** 要素の大きさを**レイアウトの px**（倍率の掛かる前の側）で見張る */
const useBoxSize = (ref: React.RefObject<HTMLElement | null>) => {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (w > 0 && h > 0) setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
};

export const ListSpace: FC<ListSpaceProps> = ({
  members,
  itemHeight = 104,
  itemWidth = 280,
  head,
}) => {
  const space = useBubbleSpace();
  const me = useCurrentBubble();

  const boxRef = useRef<HTMLDivElement | null>(null);
  const headRef = useRef<HTMLDivElement | null>(null);
  /** 口の実寸。決め打ちにすると、口を差し替えたときに判定だけ古くなる */
  const headSize = useBoxSize(headRef);
  /** 自分の中身の箱（岸ではこれが並びの入れもの） */
  const panel = useBoxSize(boxRef);

  /**
   * ★ 見せ方は**数**で決まる ── ただし件数の決め打ちではなく「**縦に並べて収まるか**」。
   *
   * ★ 海にいるときに測るのは**自前の大きさ**（`sizeOf`）であって、いま写っている箱ではない。
   *   「縦に並べる」は詰める並べ方なので、箱は中身が入るまで**伸びる** ──
   *   伸びたあとの箱で測ると「収まる」がいつも真になり、いつまでも切り替わらない。
   *   岸にいるときは伸びようがないので、そのまま自分の中身の箱で測る。
   */
  const own = me ? space.sizeOf(me) : null;
  /**
   * ★ 泡が持っているのは**中身の大きさ**（`chrome.ts`）なので、ここは引き算しない。
   *   前は `own.h − ヘッダ24` と引いていた ── `size` が装い込みの箱だったころの名残。
   */
  const box = own ? { w: own.w, h: own.h } : panel;
  const headBox = head ? { w: headSize.w || 60, h: headSize.h || HEAD_HEIGHT } : null;
  /**
   * 札に教える「並びに使える幅」＝ 中身の箱から、並びの左右の余白を引いたぶん。
   * 札が数で答えるならそのまま使う。
   */
  const room = Math.max(0, box.w - METRICS.PAD * 2);
  const itemW = typeof itemWidth === 'function' ? itemWidth(room) : itemWidth;
  /**
   * ★ **留まっている並べ方があれば、そちらが勝つ。** 一覧は箱と中身から自分で決めるが、
   *   決めたのが人ならその答えを使う ── **列数も札の幅も送り幅も、ここから出る**ので、
   *   ここで受け取らないと「格子を選んでも列数が渡らない」（実測で踏んだ）。
   */
  const view = useViewChoice();
  const chosen = view.chosen(me ?? '');
  /** 箱と並べ方が追いかけ合うか（見る側が選ぶ）。留めるなら、箱を変えても並べ方は変わらない */
  const follows = view.follows(me ?? '');
  /** いまの箱なら、どう並べるのが良いか（誰も留めていないときの答え） */
  const auto = pickPreset(box, members.length, itemW, itemHeight, headBox);
  const preset = chosen ?? auto;
  /**
   * 口の場所は、並びの**始端に空けておく**（並びはそのすぐ下から積む）。
   *
   * ★ **どの並べ方でも空ける。** 前は「縦に並べる」のときだけだったので、
   *   格子や魚眼に切り替えた途端、札が **＋新規の口の下に潜り込んで**いた（実測）。
   *   空けないのは、並びが帯を作らない並べ方（奥行きに重ねる）だけ
   *   ── そこは模型の側が「動かせない」と判断して、ひとりでに何もしない。
   */
  /**
   * ★ **見るのは「並びが実際に使う大きさ」**（`usedFor`）。札 1 枚ぶんで見ていたころは、
   *   横へ並べる並べ方（格子・横に並べる）で**右上の角がとっくに埋まっているのに
   *   「余白がある」と判断して**いた ── 口の段が空かず、札が ＋新規 の下に潜り込んだ。
   *   折り返す数は取り分が決まらないと出せないので、まず取り分なしで数えて大きさを見る
   *   （取り分は縦にしか効かないので、幅の答えは変わらない）。
   */
  const cardW0 = itemWidthFor(preset, itemW);
  const colsNoBand = colsFor(preset, box, cardW0, members.length, itemHeight);
  const used = usedFor(preset, box, { w: cardW0, h: itemHeight }, members.length, colsNoBand);
  const reserve = needsBand(box, used, headBox) ? reserveFor(headBox) : 0;
  /**
   * その並べ方のときの札の形と、送り幅・折り返す列数。
   *
   * ★ **札の幅は札のもの**（`itemWidth`）── 箱から出さない。
   *   出していたころは、窓を横に伸ばすと札まで太った（`itemWidthFor` の註）。
   *   箱から決まるのは「何列で折り返すか」だけ。
   */
  /**
   * ★ **細くするのは「狭い所に置く」と札に伝えること。引き算ではない。**
   *
   *   透視は後ろの札の肩を出すために、札を左右 {@link LIST_DEPTH_INSET} ずつ狭い所に置く。
   *   前はここで**幅から引いて**いたが、引き算は**札の下限を知らない** ──
   *   囲碁の札は名前 7 文字（243）が下限なのに 196 まで削られて、字が縦に折り返していた。
   *   狭さを渡して、どこまで譲れるかは札に決めさせる。
   * ★ 譲れなくて入らないぶんは**はみ出す**。透視は枠からはみ出してよい並び
   *   （切らない・送らない）なので、はみ出したまま階段になる。
   */
  const cardRoom = preset === 'stackDepth' ? Math.max(0, room - LIST_DEPTH_INSET * 2) : room;
  const cardWidth =
    typeof itemWidth === 'function' ? itemWidth(cardRoom) : itemWidthFor(preset, itemWidth);
  /**
   * ★ 刻みは**箱と枚数も見る** ── 箱に対して刻みが大きいと、外側は数学的に 0 になって
   *   下限をいくら下げても出てこない（`fitStep` の註）。
   */
  const stepX = stepFor(preset, { w: cardWidth, h: itemHeight }, box, members.length)?.x;
  const stepY = stepFor(preset, { w: cardWidth, h: itemHeight }, box, members.length)?.y;
  /**
   * ★ 折り返す数を「箱の形」から出すときは、**口のぶん（`reserve`）を引いた形**で見る
   *   ── 引かないと縦長に見えて、列が足りなくなる（実測：正方形の箱なのに 5 列が 3 列になった）。
   */
  const cols = colsFor(
    preset,
    { w: box.w, h: Math.max(1, box.h - reserve) },
    cardWidth,
    members.length,
    itemHeight,
  );

  /**
   * **箱と並べ方の追いかけ合い。**
   *
   * ```
   * 留める（follows が偽）  いま写っている並べ方を焼き付ける。箱を変えても選び直さない
   * 追いかけ合う（真）      人が箱を変えたら、留めていた答えを解く ＝ また箱から決まる
   * ```
   *
   * ★ 見分けるのは「**箱が変わったのは誰のせいか**」── 自分で書いた大きさ
   *   （並べ方に合わせて `setSize` したぶん）は人の操作ではないので、解かない。
   *   ここを見ないと、並べ方を選ぶ → 箱が変わる → その箱から選び直す、で**選んだ答えが
   *   すぐ捨てられる**（横に並べるは `pickPreset` が返さない並べ方なので、選んだ瞬間に戻る）。
   */
  const wrote = useRef<{ w: number; h: number } | null>(null);
  const lastBox = useRef<string>('');
  const boxKey = `${Math.round(box.w)}x${Math.round(box.h)}`;
  useEffect(() => {
    if (!me) return;
    const changed = lastBox.current !== '' && lastBox.current !== boxKey;
    const mine =
      !!wrote.current && `${Math.round(wrote.current.w)}x${Math.round(wrote.current.h)}` === boxKey;
    lastBox.current = boxKey;
    if (!follows) {
      if (!chosen) view.choose(me, auto);
      return;
    }
    if (changed && !mine && chosen) view.choose(me, null);
  }, [me, follows, chosen, auto, boxKey, view]);

  /**
   * **並べ方を選んだら、その並べ方に合う大きさへ**（追いかけ合うときだけ）。
   *
   * ★ 大きさは「**並びの広がりが、ちょうど入る**」から出る（`fitBoxFor`）。
   *   広がりは刻みで測るので、魚眼は平行な兄弟より少し小さい箱になり、透視は
   *   「手前の札＋奥へ逃げるぶん」になる ── **7 つとも大きさが出る**。
   * ★ 書くのは**大きさだけ**。場所は人のもの（角を掴んだときと同じ書き方）。
   */
  useEffect(() => {
    if (!me || !follows || !chosen) return;
    const want = fitBoxFor(
      chosen,
      members.length,
      { w: cardWidth, h: itemHeight },
      reserve,
      space.roomOf(me),
    );
    if (!want) return;
    wrote.current = want;
    space.setSize(me, want);
  }, [me, follows, chosen, members.length, cardWidth, itemHeight, reserve, space]);

  /**
   * ★ 世界に書くのは**この 1 箇所だけ**。顔ぶれと並べ方を一緒に渡す
   *   ── 別々に書くと、同じ描画のうちに後のほうが前のほうを握り潰す。
   *   足し引きも並べ方の変化も無ければ `setChildren` は何も書かないので、
   *   `space` が毎回新しくてもここで止まらなくなることはない。
   */
  useEffect(() => {
    /**
     * ★ **箱は伸ばさない**（`grow: false`）── 箱の大きさは人のもの。
     *   「並べ方に合わせて箱を変える」は伸ばしっぱなしにすることではなく、
     *   選んだ一度だけ大きさを書くこと（上の `setSize`）。伸ばしっぱなしにすると、
     *   箱が**中身より小さくできない**ものになる（実測で踏んだ：横に縮まらない一覧）。
     */
    if (me) space.setChildren(me, members, { preset, itemWidth: cardWidth, reserve, step: { x: stepX, y: stepY }, cols, grow: false });
  }, [me, members, preset, space, cardWidth, reserve, stepX, stepY, cols]);

  /**
   * 中身は口だけ。並びは**外の層**が描く（DOM は平らなので、札はこの div の兄弟になる ──
   * つまり札のほうが手前で、重なったら口は押せなくなる）。だから口は**右上の角**に置く。
   */
  return (
    <div
      ref={boxRef}
      /**
       * ★ **一覧は自分で板を敷く。** 札はこの div の**兄弟**として層に描かれるので、
       *   ここに地を敷けば札はその上に浮く ── 「明るい板の上に札が並ぶ」になる。
       *   白い札より少し沈ませてある（真っ白にすると札との境目が消える）。
       * ★ ルートの地の種類は増やしていない。一覧かどうかは一覧が知っていればよく、
       *   窓でも岸でも同じように板が敷かれる。
       */
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        borderRadius: "inherit",
        background: LIST_PANEL,
        color: "#1b2029",
      }}
    >
      {/* 岸に貼られたときだけ、自分で小さな海を持つ（下の註） */}
      {!me && panel.w > 0 && (
        <ShoreSea
          members={members}
          preset={preset}
          cardWidth={cardWidth}
          stepX={stepX}
          stepY={stepY}
          cols={cols}
          viewport={panel}
          outer={space}
        />
      )}
      {head && (
        <div
          ref={headRef}
          /**
           * ★ ここで止める。空間を持つ泡の**中身の箱は「その空間の背景」**なので、
           *   押すと層がポインタを捕まえて焦点のドラッグを始める ── 捕まったら
           *   ボタンはもう離した所を受け取れず、**クリックが成立しない**。
           *   口は海の背景ではないので、押したことをそこで止める（`bl-close` と同じ）。
           */
          onPointerDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute", right: HEAD_RIGHT, top: HEAD_TOP, height: HEAD_HEIGHT,
            display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6,
            boxSizing: "border-box", pointerEvents: "auto", zIndex: 5,
          }}
        >
          {head}
        </div>
      )}
    </div>
  );
};

/**
 * 岸に貼られた一覧 ── **自分で小さな海を持つ**。
 *
 * 札を描いているのは外の層（`BubbleField`）なので、岸へ出た泡には描き手がいない
 * ── 口だけが残って中身が空になる（岸は泡ではないので `useCurrentBubble` も無い）。
 * そのときだけ、この中に海を 1 つ作って顔ぶれを並べる。
 * 開くのは**外の海**へ回す ── 狭い岸の中に詳細が生えても仕方がない。
 */
const ShoreSea: FC<{
  readonly members: readonly string[];
  readonly preset: PresetId;
  /** その並べ方のときの札の幅と送り幅。**海に居るときと同じものを渡す** ── 岸でだけ
   *  札が箱いっぱいのまま、送り幅もプリセットのまま、になっていた（実測で踏んだ：
   *  coverflow の札が 3 枚ともほぼ同じ所に重なった） */
  readonly cardWidth: number;
  readonly stepX?: number;
  readonly stepY?: number;
  readonly cols?: number;
  readonly viewport: { readonly w: number; readonly h: number };
  readonly outer: BubbleSpaceApi;
}> = ({ members, preset, cardWidth, stepX, stepY, cols, viewport, outer }) => {
  const routes = useContext(LayoutRoutesContext);
  return (
    <BubbleSpace
      routes={routes}
      viewport={viewport}
      openOutside={(url) => outer.openBubble(url, null)}
      style={{ position: "absolute", left: 0, top: 0 }}
    >
      <ShoreMembers
        members={members}
        preset={preset}
        cardWidth={cardWidth}
        stepX={stepX}
        stepY={stepY}
        cols={cols}
      />
    </BubbleSpace>
  );
};

/** 小さな海の中で、顔ぶれと並べ方を合わせる（書くのはここ 1 箇所） */
const ShoreMembers: FC<{
  readonly members: readonly string[];
  readonly preset: PresetId;
  readonly cardWidth: number;
  readonly stepX?: number;
  readonly stepY?: number;
  readonly cols?: number;
}> = ({ members, preset, cardWidth, stepX, stepY, cols }) => {
  const space = useBubbleSpace();
  useEffect(() => {
    space.setChildren("root", members, {
      preset,
      itemWidth: cardWidth,
      reserve: 0,
      step: { x: stepX, y: stepY },
      cols,
    });
  }, [space, members, preset, cardWidth, stepX, stepY, cols]);
  return null;
};
