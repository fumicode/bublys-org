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
import { BubbleSpace, LIST_GAP } from "./BubbleSpace.js";
import { useBubbleSpace, useCurrentBubble } from "./context.js";
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
  /** 1 件の幅。口が横の余白に収まるかを測るのに使う */
  readonly itemWidth?: number;
  /** 並びの上に置く口（「新しく作る」など）。並びの外なので、泡にはならない */
  readonly head?: ReactNode;
};

/** 口を置く帯の高さの既定（実際は測る）。右端からの隙間も込みで見る */
const HEAD_HEIGHT = 39;   // ★ 口は 1.5 倍（26 × 1.5）
const HEAD_MARGIN = 8;
/**
 * 一覧の板。**白い札より少し沈んだ明るい面**。
 *
 * ★ 明るいものが重なる向きは 1 つ ── **海 → 窓 → この板 → 札**。
 *   海がいちばん濃く、窓（`WINDOW_SKY`）がその上に浮き、この板がさらに上、札がいちばん明るい。
 */
export const LIST_PANEL = 'linear-gradient(180deg,#c4cad9 0%,#b6bdce 100%)';

/** 口を置く高さ（中身の箱の上から） */
const HEAD_TOP = 2;
/**
 * 枠が中身に取る余白（space-css の .bl-body の左右）。口の右の余白を札とそろえるのに要る。
 */
const BODY_INSET = 7;
/** 口の右の余白 ── **札と同じ**（枠から `METRICS.PAD`）。中身の箱はもう `BODY_INSET` ぶん内側にいる */
const HEAD_RIGHT = Math.max(0, METRICS.PAD - BODY_INSET);
/**
 * 口の下に空ける隙間。**見えている隙間は 10px** ──
 * 枠の CSS（.bl-body の上 27px）と模型のヘッダ（24px）の差 3px を込みにしてある。
 */
const HEAD_GAP = 13;

/**
 * 並びの上に空けておく量 ── **口の底＋隙間まで**（枠の余白のぶんは、並びの側でもう空いている）。
 * 並びはこのすぐ下から積む（View の軸の reserve）。
 */
const reserveFor = (headBox: { readonly h: number } | null): number =>
  headBox ? Math.max(0, HEAD_TOP + headBox.h + HEAD_GAP - METRICS.PAD) : 0;

/**
 * 一覧の箱の既定。バブリはどれも同じ大きさの一覧を出す。
 *
 * ★ 高さは「**縦に並べるか、奥行きに重ねるか**」の境目でもある ── 箱は詰める軸で中身が入るまで
 *   伸びるので、伸びたあとで測ると「収まる」がいつも真になる。だから境目は**自前の大きさ**で見る。
 * ★ 520 → 540。口の下に隙間（{@link HEAD_GAP}）を空けたぶん、同じ枚数が入るように足した。
 */
export const LIST_BOX = { width: 420, height: 540 } as const;

/**
 * 一覧の中の札の幅 ── **箱の中身いっぱい**。
 *
 * ★ 左右に残るのは枠の余白（`METRICS.PAD`）だけ。前は札を 280 にしていたので、
 *   420 の箱の中で **左右に 70px ずつ空いていた**（札の隙間は 4 なのに）。
 *   広く取ってあったのは「右の余白に口（＋新規）を収める」ためだったが、
 *   口の幅（60 ＋ 隙間 8）に対して余白は 56 しかなく**そもそも収まっていない**
 *   ── 口は上の帯へ回っていた（`pickPreset` の `needsBand`）。つまり余白は誰の役にも立っていない。
 */
export const LIST_CARD_WIDTH = LIST_BOX.width - METRICS.PAD * 2;

/**
 * 透視（奥行きに重ねる）のときだけ、札を左右にこれだけ細くする。
 *
 * ★ **後ろの札の肩を出すため。** 子の空間の消失点は「自分の中身の箱の左上の角」なので、
 *   奥へ行った札の左端は `cx + vp.x·(1−m) − (幅/2)·m`。**幅がちょうど中身の箱いっぱい**だと
 *   `幅/2 = |vp.x|` で `m` の項が消え、**奥も手前も左端がぴたりと揃う**（実測：どの札も 84.0）。
 *   揃うと手前の札が後ろをまっすぐ覆ってしまうので、透視では細くして階段に戻す。
 *   ずれの幅はそのままこの値（前と同じ 56px ＝ 札 280 のときの階段）。
 */
export const LIST_DEPTH_INSET = 56;
/** 透視のときの札の幅（既定の箱での値。実際は箱から測る ── {@link itemWidthFor}） */
export const LIST_DEPTH_CARD_WIDTH = LIST_CARD_WIDTH - LIST_DEPTH_INSET * 2;

/** 箱の大きさから並べ方を決める（海でも岸でも同じ式） */
const pickPreset = (
  box: { readonly w: number; readonly h: number },
  count: number,
  itemWidth: number,
  itemHeight: number,
  headBox: { readonly w: number; readonly h: number } | null,
): PresetId => {
  /**
   * ★ **口が居られるかも判定に入れる。**
   *   口は右上の角に置く。札は横に中央ぞろえなので、箱が札より十分広ければ
   *   右の余白に収まり、縦の場所取りは要らない（下までいっぱいに詰められる）。
   *   細くして右の余白が消えたときだけ、口の段を縦に空ける。
   */
  const sideRoom = (box.w - itemWidth) / 2 - METRICS.PAD;
  const needsBand = !!headBox && sideRoom < headBox.w + HEAD_MARGIN;
  /**
   * ★ 取り分は「**口の底まで**」ちょうど 1 回ぶん。
   *
   *   札は「空けた量のすぐ下」から積む（View の軸の reserve。resolve.ts が当てる）ので、
   *   要るのは 口の底 − PAD だけ。前は中央ぞろえのまま空けようとして**口の高さの 2 倍**を
   *   取っており、**最後の札と縁のあいだに余白が残っているのに奥行きへ切り替わって**いた。
   */
  const room = box.h - METRICS.PAD * 2 - reserveFor(needsBand ? headBox : null);
  // 詰める並びの要り高 ＝ 札の高さ × 枚数 ＋ 隙間 ×（枚数 − 1）
  //   ★ 隙間は**一覧の隙間**（`LIST_GAP`）で測る。既定の GAP（14）で測っていたので、
  //     実際より高く見積もって**早く奥行きへ切り替わって**いた
  const need = count * itemHeight + Math.max(0, count - 1) * LIST_GAP;
  return need <= room ? "column" : "stackDepth";
};

/**
 * その並べ方のときの札の幅。**箱から測る**ので、箱の大きさを変えてもついてくる。
 *
 * - 詰める並び：箱の中身いっぱい（左右に残るのは枠の余白だけ）
 * - 透視：そこから左右 {@link LIST_DEPTH_INSET} ずつ細く ── **必ず階段になる**。
 *   幅が中身の箱いっぱいだと `幅/2 = |消失点|` で奥行きの項が消えて**左端が揃い**、
 *   後ろの札が上からしか覗かない。細くしておけば、左からも覗く。
 *
 * ★ 並べ方を決めるほう（`pickPreset`）には**いつも詰めるときの幅**を渡す ── 幅が並べ方を
 *   決め、並べ方が幅を決める、と回らないように。
 */
const itemWidthFor = (preset: PresetId, boxWidth: number): number => {
  const full = Math.max(1, boxWidth - METRICS.PAD * 2);
  return preset === 'stackDepth' ? Math.max(1, full - LIST_DEPTH_INSET * 2) : full;
};

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
  const box = own ? { w: own.w, h: own.h - METRICS.HEADER } : panel;
  const headBox = head ? { w: headSize.w || 60, h: headSize.h || HEAD_HEIGHT } : null;
  const preset = pickPreset(box, members.length, itemWidth, itemHeight, headBox);
  /** 口の場所は、並びの**始端に空けておく**（並びはそのすぐ下から積む） */
  const reserve = preset === 'column' ? reserveFor(headBox) : 0;

  /**
   * ★ 世界に書くのは**この 1 箇所だけ**。顔ぶれと並べ方を一緒に渡す
   *   ── 別々に書くと、同じ描画のうちに後のほうが前のほうを握り潰す。
   *   足し引きも並べ方の変化も無ければ `setChildren` は何も書かないので、
   *   `space` が毎回新しくてもここで止まらなくなることはない。
   */
  useEffect(() => {
    if (me) space.setChildren(me, members, preset, itemWidthFor(preset, box.w), reserve);
  }, [me, members, preset, space, box.w, reserve]);

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
        <ShoreSea members={members} preset={preset} viewport={panel} outer={space} />
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
  readonly viewport: { readonly w: number; readonly h: number };
  readonly outer: BubbleSpaceApi;
}> = ({ members, preset, viewport, outer }) => {
  const routes = useContext(LayoutRoutesContext);
  return (
    <BubbleSpace
      routes={routes}
      viewport={viewport}
      openOutside={(url) => outer.openBubble(url, null)}
      style={{ position: "absolute", left: 0, top: 0 }}
    >
      <ShoreMembers members={members} preset={preset} />
    </BubbleSpace>
  );
};

/** 小さな海の中で、顔ぶれと並べ方を合わせる（書くのはここ 1 箇所） */
const ShoreMembers: FC<{ readonly members: readonly string[]; readonly preset: PresetId }> = ({
  members,
  preset,
}) => {
  const space = useBubbleSpace();
  useEffect(() => {
    space.setChildren("root", members, preset);
  }, [space, members, preset]);
  return null;
};
