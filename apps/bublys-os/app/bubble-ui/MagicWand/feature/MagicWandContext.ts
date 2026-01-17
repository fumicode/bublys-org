"use client";

import { createContext, useContext } from "react";

export type MagicWandContextType = {
  /** MagicWandモードがアクティブかどうか */
  isActive: boolean;
  /** カーソルの現在位置 */
  cursorPosition: { x: number; y: number } | null;
  /** 現在ホバー中のバブルID */
  hoveredBubbleId: string | null;

  /** バブルヘッダーにホバー開始時に呼ぶ */
  onBubbleHeaderEnter: (bubbleId: string) => void;
  /** バブルヘッダーからホバー終了時に呼ぶ */
  onBubbleHeaderLeave: () => void;
  /** MagicWandモードを開始する（削除ボタンからドラッグ開始時） */
  startMagicWand: (e: MouseEvent, startingBubbleId: string) => void;
};

const defaultContext: MagicWandContextType = {
  isActive: false,
  cursorPosition: null,
  hoveredBubbleId: null,
  onBubbleHeaderEnter: () => {},
  onBubbleHeaderLeave: () => {},
  startMagicWand: () => { /* no-op */ },
};

export const MagicWandContext =
  createContext<MagicWandContextType>(defaultContext);

export const useMagicWand = () => useContext(MagicWandContext);
