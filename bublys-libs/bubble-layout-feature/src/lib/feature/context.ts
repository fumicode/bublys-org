/**
 * 開く口。`ObjectView` はこれ1つしか知らない。
 * ★ `openingPosition` は無い ── どこに置くかは親の View が決める（DECISIONS.md）。
 */
import { createContext, useContext } from 'react';
import type { BubbleId, LensId, PlaneAxis } from '@bublys-org/bubble-layout';

export interface BubbleSpaceApi {
  /** その url の泡を、この泡の隣に開く。返るのは開いた泡の id */
  openBubble: (url: string, openerId?: BubbleId | null, title?: string) => BubbleId;
  closeBubble: (id: BubbleId) => void;
  urlOf: (id: BubbleId) => string | null;
  /** その url が開けるか（route が当たるか） */
  canOpen: (url: string) => boolean;
  /**
   * 外の空間の、その軸のレンズを変える ── **魚眼をどちらの向きに掛けるか**。
   * レンズは軸ごとに持つものなので、X と Y は別々に決まる（両方でも、どちらも平行でもよい）。
   */
  setLens: (axis: PlaneAxis, lens: LensId) => void;
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
  setLens: () => undefined,
  takeIn: () => '',
});
export const useBubbleSpace = (): BubbleSpaceApi => useContext(BubbleSpaceContext);

/** いま自分がどの泡の中にいるか（開くときの「元の泡」） */
export const CurrentBubbleContext = createContext<BubbleId | null>(null);
export const useCurrentBubble = (): BubbleId | null => useContext(CurrentBubbleContext);
