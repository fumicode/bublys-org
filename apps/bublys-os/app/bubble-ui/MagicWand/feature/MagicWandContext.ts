"use client";

import { createContext, useContext } from "react";
import { MagicWandActionCallback } from "../domain/MagicWandState";

export type MagicWandContextType = {
  /** MagicWandモードがアクティブかどうか */
  isActive: boolean;
  /** 現在ホバー中のバブルID */
  hoveredBubbleId: string | null;

  /** バブルヘッダーにホバー開始時に呼ぶ */
  onBubbleHeaderEnter: (bubbleId: string) => void;
  /** バブルヘッダーからホバー終了時に呼ぶ */
  onBubbleHeaderLeave: () => void;
  /** MagicWandモードを開始する（削除ボタンからドラッグ開始時） */
  startMagicWand: (e: MouseEvent, startingBubbleId: string, action: MagicWandActionCallback) => void;
};

const defaultContext: MagicWandContextType = {
  isActive: false,
  hoveredBubbleId: null,
  onBubbleHeaderEnter: () => {},
  onBubbleHeaderLeave: () => {},
  startMagicWand: (_e, _bubbleId, _action) => {
    /* no-op */
  },
};

export const MagicWandContext =
  createContext<MagicWandContextType>(defaultContext);

export const useMagicWand = () => useContext(MagicWandContext);
