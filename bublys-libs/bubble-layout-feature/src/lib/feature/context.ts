/**
 * 開く口。`ObjectView` はこれ1つしか知らない。
 * ★ `openingPosition` は無い ── どこに置くかは親の View が決める（DECISIONS.md）。
 */
import { createContext, useContext } from 'react';
import type { BubbleId } from '@bublys-org/bubble-layout';

export interface BubbleSpaceApi {
  /** その url の泡を、この泡の隣に開く。返るのは開いた泡の id */
  openBubble: (url: string, openerId?: BubbleId | null, title?: string) => BubbleId;
  closeBubble: (id: BubbleId) => void;
  urlOf: (id: BubbleId) => string | null;
  /** その url が開けるか（route が当たるか） */
  canOpen: (url: string) => boolean;
}

export const BubbleSpaceContext = createContext<BubbleSpaceApi>({
  openBubble: () => { console.warn('BubbleSpace の外で openBubble が呼ばれた'); return ''; },
  closeBubble: () => undefined,
  urlOf: () => null,
  canOpen: () => false,
});
export const useBubbleSpace = (): BubbleSpaceApi => useContext(BubbleSpaceContext);

/** いま自分がどの泡の中にいるか（開くときの「元の泡」） */
export const CurrentBubbleContext = createContext<BubbleId | null>(null);
export const useCurrentBubble = (): BubbleId | null => useContext(CurrentBubbleContext);
