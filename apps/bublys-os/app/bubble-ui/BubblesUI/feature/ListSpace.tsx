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
import { BubbleSpace, useBubbleSpace, useCurrentBubble } from "@bublys-org/bubble-layout-feature";
import type { BubbleRoute as LayoutRoute, BubbleSpaceApi } from "@bublys-org/bubble-layout-feature";
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
const HEAD_HEIGHT = 26;
const HEAD_MARGIN = 8;

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
   *   細くして右の余白が消えたときだけ、口の段を縦に空ける ── 詰める並びは箱の
   *   **中央**に来るので、上を 1 段空けるには上下に同じだけ（＝ 2 倍）余らせるしかない。
   */
  const sideRoom = (box.w - itemWidth) / 2 - METRICS.PAD;
  const needsBand = !!headBox && sideRoom < headBox.w + HEAD_MARGIN;
  const room = box.h - METRICS.PAD * 2 - (needsBand && headBox ? headBox.h * 2 : 0);
  // 詰める並びの要り高 ＝ 札の高さ × 枚数 ＋ 隙間 ×（枚数 − 1）
  const need = count * itemHeight + Math.max(0, count - 1) * METRICS.GAP;
  return need <= room ? "column" : "stackDepth";
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

  /**
   * ★ 世界に書くのは**この 1 箇所だけ**。顔ぶれと並べ方を一緒に渡す
   *   ── 別々に書くと、同じ描画のうちに後のほうが前のほうを握り潰す。
   *   足し引きも並べ方の変化も無ければ `setChildren` は何も書かないので、
   *   `space` が毎回新しくてもここで止まらなくなることはない。
   */
  useEffect(() => {
    if (me) space.setChildren(me, members, preset);
  }, [me, members, preset, space]);

  /**
   * 中身は口だけ。並びは**外の層**が描く（DOM は平らなので、札はこの div の兄弟になる ──
   * つまり札のほうが手前で、重なったら口は押せなくなる）。だから口は**右上の角**に置く。
   */
  return (
    <div ref={boxRef} style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
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
            position: "absolute", right: 4, top: 2, height: HEAD_HEIGHT,
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
