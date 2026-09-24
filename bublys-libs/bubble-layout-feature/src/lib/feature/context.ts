/**
 * 開く口。`ObjectView` はこれ1つしか知らない。
 * ★ `openingPosition` は無い ── どこに置くかは親の View が決める（DECISIONS.md）。
 */
import { createContext, useContext } from 'react';
import type { BubbleId, LensId, PlaneAxis, PresetId } from '@bublys-org/bubble-layout';

/**
 * 子をどう並べるか ── **顔ぶれと一緒に渡すもの**（`setChildren`）。
 * どれも「見え方」ではなく**箱の大きさから決まる値**で、渡す側（一覧）が測って決める。
 */
export interface ChildrenLayout {
  readonly preset?: PresetId;
  /** 札の幅。並べ方で変わる（詰めるなら箱いっぱい、coverflow なら読める幅で頭打ち） */
  readonly itemWidth?: number;
  /** 並びの始端に空けておく量（一覧の口の場所） */
  readonly reserve?: number;
  /** 「等間隔」の刻み（送り幅）。軸ごとに、札の大きさから決まる */
  readonly step?: { readonly x?: number; readonly y?: number };
  /** **何列で折り返すか。** 渡すと、順序から行と列（`cell`）を書き直す */
  readonly cols?: number;
  /** **箱が中身に合わせて伸びるか**（既定は伸びる）。`false` なら自前のままで見切れる */
  readonly grow?: boolean;
}

export interface BubbleSpaceApi {
  /** その url の泡を、この泡の隣に開く。返るのは開いた泡の id */
  openBubble: (url: string, openerId?: BubbleId | null, title?: string) => BubbleId;
  closeBubble: (id: BubbleId) => void;
  urlOf: (id: BubbleId) => string | null;
  /** その url が開けるか（route が当たるか） */
  canOpen: (url: string) => boolean;
  /** その url の泡が、いまこの空間に居るか（居なくなったことに気づくのに使う） */
  hasUrl: (url: string) => boolean;
  /**
   * 外の空間の、その軸のレンズを変える ── **魚眼をどちらの向きに掛けるか**。
   * レンズは軸ごとに持つものなので、X と Y は別々に決まる（両方でも、どちらも平行でもよい）。
   */
  setLens: (axis: PlaneAxis, lens: LensId) => void;
  /**
   * 外の空間の**並べ方**を選ぶ（View のプリセット）。
   * 「開き方」は 1 つしかないので、見え方が変わるのはここだけ。
   */
  setPreset: (preset: PresetId, spaceId?: BubbleId) => void;
  /**
   * その泡の**中身（子の泡）**を、この url たちに合わせる ── 一覧の空間。
   * 議事録（版）と同じで、**同じ世界の中の子の空間**になる（入れ子の海ではない）。
   *
   * ★ 並べ方も**ここで一緒に**渡す。別々に呼ぶと、同じ描画のうちに後の書き込みが
   *   前の書き込みを握り潰して、顔ぶれか並べ方のどちらかが消える（実測で踏んだ）。
   *   **世界に書くのは1回**。顔ぶれも並べ方も変わらなければ、何も書かない。
   */
  setChildren: (hostId: BubbleId, urls: readonly string[], how?: ChildrenLayout) => void;
  /** その泡が入っている空間（＝ 親の泡）。子から「外へ開く」ときに要る */
  hostOf: (id: BubbleId) => BubbleId | null;
  /**
   * その泡が**自分で持っている大きさ**（中身で伸びる前・レンズを通す前）。
   * 一覧が「縦に並べて収まるか」を測るのに使う ── 伸びたあとの箱で測ると、
   * 伸びたぶん「収まる」がいつも真になって、並べ方が切り替わらない。
   */
  sizeOf: (id: BubbleId) => { readonly w: number; readonly h: number } | null;
  /**
   * 岸から海へ返す ── **画面のその矩形に見えるように**置く。
   *
   * 「どこに置くか」は親の View が決める、が原則。ここで場所を渡してよいのは、
   * これが**掴んで動かすのと同じ書き方**（自由座標に書く）だからで、
   * 岸で見えていた所からそのまま海へ戻るのが「剥がす」の意味になる。
   */
  takeIn: (url: string, rect: { x: number; y: number; w: number; h: number }) => BubbleId;
}

export const BubbleSpaceContext = createContext<BubbleSpaceApi>({
  openBubble: () => { console.warn('BubbleSpace の外で openBubble が呼ばれた'); return ''; },
  closeBubble: () => undefined,
  urlOf: () => null,
  canOpen: () => false,
  hasUrl: () => false,
  setLens: () => undefined,
  setPreset: () => undefined,
  setChildren: () => undefined,
  hostOf: () => null,
  sizeOf: () => null,
  takeIn: () => '',
});
export const useBubbleSpace = (): BubbleSpaceApi => useContext(BubbleSpaceContext);

/** いま自分がどの泡の中にいるか（開くときの「元の泡」） */
/**
 * **画面2** ── 海の像を、そっくりそのまま1枚の平面として見ているところ。
 *
 * ★ **1枚しか無い。** 入れ子の海（窓の中・岸に貼った一覧）は画面1 が深くなっただけで、
 *   平面はいちばん外のひとつきり。海ごとに寄りを持たせると**掛け算になる**
 *   （実測で踏んだ：窓の中で1回まわすと、窓の海と外の海が別々に 2 倍になって 4 倍に写った）。
 *   だから内側の海は自分では持たず、これを通して外の画面へ渡す。
 */
export interface ScreenZoom {
  readonly zoom: number;
  readonly setZoom: (zoom: number) => void;
}

/** null ＝ 自分がいちばん外の画面（＝ 画面2 は自分の世界が持つ） */
export const ScreenZoomContext = createContext<ScreenZoom | null>(null);
export const useScreenZoom = (): ScreenZoom | null => useContext(ScreenZoomContext);

/**
 * **人が選んだ並べ方。**
 *
 * ★ 並べ方を決めるのは**一覧**（箱と中身から自分で決める）。人が口から選んだら、
 *   そちらが勝つ ── 決めたのは人のほうなので。
 * ★ 選んだ答えは**一覧まで届かないといけない**。折り返す列数も札の幅も送り幅も、
 *   並べ方から出るので、口の側だけで持っていると
 *   「格子を選んでも列数が渡らず、札が全部 (0,0) に積まれる」（実測で踏んだ）。
 */
export interface ViewChoice {
  readonly chosen: (hostId: BubbleId) => PresetId | undefined;
  readonly choose: (hostId: BubbleId, preset: PresetId) => void;
  /**
   * **箱も中身に合わせて広がるか**（既定）。`false` なら箱はそのままで、
   * 入らないぶんは見切れる（動かして見に行く）。
   */
  readonly grows: (hostId: BubbleId) => boolean;
  readonly toggleGrows: (hostId: BubbleId) => void;
}

export const ViewChoiceContext = createContext<ViewChoice>({
  chosen: () => undefined,
  choose: () => undefined,
  grows: () => true,
  toggleGrows: () => undefined,
});
export const useViewChoice = (): ViewChoice => useContext(ViewChoiceContext);

export const CurrentBubbleContext = createContext<BubbleId | null>(null);
export const useCurrentBubble = (): BubbleId | null => useContext(CurrentBubbleContext);

/**
 * いま**触られている泡**（最後に押された泡）。
 *
 * ② 触るのは見ることなので、模型には書かない ── だから世界ではなくこの層が持つ。
 * キーボードを受け取るのは誰か、を中身に伝えるのに要る（旧 `bubbles-ui` の
 * 「キーボードはフォーカス中のバブルが受け取る」を、新しい海の上でも成り立たせる）。
 */
export const SelectedBubbleContext = createContext<BubbleId | null>(null);
export const useSelectedBubble = (): BubbleId | null => useContext(SelectedBubbleContext);
