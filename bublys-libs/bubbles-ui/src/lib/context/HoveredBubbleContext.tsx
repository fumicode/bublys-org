"use client";
import { createContext, FC, ReactNode, useCallback, useContext, useMemo, useState } from "react";

export type HoveredBubbleContextType = {
  /** いまホバーされているバブル（浮いていても岸に着いていても）。無ければ null */
  hoveredBubbleId: string | null;
  /** ホバーに入った */
  enterBubble: (id: string) => void;
  /**
   * ホバーから出た（または要素が消えた）。その id がホバー中のときだけ解除する。
   * 別のバブルに移った後に古い leave が来ても、新しい方を消さないため
   */
  leaveBubble: (id: string) => void;
};

/**
 * 1 つの universe の中で「どのバブルにホバーしているか」を共有する。
 * 帯（リンク）は既定でホバー時だけ出すので、海のバブルと岸の帯の両方から
 * 同じ場所に書けるようにしてある。Provider は ShowreLayout（岸 + 海）が持つ。
 */
export const HoveredBubbleContext = createContext<HoveredBubbleContextType | null>(null);

export const useHoveredBubbleState = (): HoveredBubbleContextType => {
  const [hoveredBubbleId, setHoveredBubbleId] = useState<string | null>(null);
  const enterBubble = useCallback((id: string) => setHoveredBubbleId(id), []);
  const leaveBubble = useCallback(
    (id: string) => setHoveredBubbleId((prev) => (prev === id ? null : prev)),
    [],
  );
  return useMemo(() => ({ hoveredBubbleId, enterBubble, leaveBubble }), [hoveredBubbleId, enterBubble, leaveBubble]);
};

export const HoveredBubbleProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const value = useHoveredBubbleState();
  return <HoveredBubbleContext.Provider value={value}>{children}</HoveredBubbleContext.Provider>;
};

/** Provider の外なら null */
export const useHoveredBubble = (): HoveredBubbleContextType | null => useContext(HoveredBubbleContext);
