"use client";

import { useRef, useCallback } from "react";
import { useMagicWand } from "./MagicWandContext";
import { MagicWandActionCallback } from "../domain/MagicWandState";

const DRAG_THRESHOLD = 5; // 5px動いたらドラッグとみなす

type UseMagicWandBubbleOptions = {
  bubbleId: string;
  /** 通常クリック時のコールバック */
  onCloseClick?: () => void;
  /** MagicWandモードで実行するアクション */
  magicWandAction?: MagicWandActionCallback;
};

/**
 * バブル単位のMagicWand機能を提供するフック
 *
 * - ボタンのドラッグ検出
 * - ヘッダーホバー検出
 * - MagicWandターゲット判定
 */
export function useMagicWandBubble({
  bubbleId,
  onCloseClick,
  magicWandAction,
}: UseMagicWandBubbleOptions) {
  const {
    isActive: isMagicWandActive,
    hoveredBubbleId: magicWandHoveredBubbleId,
    onBubbleHeaderEnter,
    onBubbleHeaderLeave,
    startMagicWand,
  } = useMagicWand();

  // 削除ボタンのドラッグ検出用
  const closeButtonDragRef = useRef<{
    startX: number;
    startY: number;
    isDragging: boolean;
  } | null>(null);

  // ボタンのmousedownハンドラ
  const handleCloseMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      closeButtonDragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        isDragging: false,
      };

      const handleMouseMove = (moveE: MouseEvent) => {
        if (!closeButtonDragRef.current) return;
        const dx = moveE.clientX - closeButtonDragRef.current.startX;
        const dy = moveE.clientY - closeButtonDragRef.current.startY;

        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
          closeButtonDragRef.current.isDragging = true;
          if (magicWandAction) {
            startMagicWand(moveE, bubbleId, magicWandAction);
          }
          document.removeEventListener("mousemove", handleMouseMove);
        }
      };

      const handleMouseUp = () => {
        if (closeButtonDragRef.current && !closeButtonDragRef.current.isDragging) {
          // ドラッグしなかった = 通常クリック
          onCloseClick?.();
        }
        closeButtonDragRef.current = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [bubbleId, onCloseClick, startMagicWand, magicWandAction]
  );

  // MagicWandモード中のヘッダーホバー検出
  const handleHeaderMouseEnter = useCallback(() => {
    if (isMagicWandActive) {
      onBubbleHeaderEnter(bubbleId);
    }
  }, [isMagicWandActive, onBubbleHeaderEnter, bubbleId]);

  const handleHeaderMouseLeave = useCallback(() => {
    if (isMagicWandActive) {
      onBubbleHeaderLeave();
    }
  }, [isMagicWandActive, onBubbleHeaderLeave]);

  // MagicWandのターゲットかどうか
  const isMagicWandTarget = isMagicWandActive && magicWandHoveredBubbleId === bubbleId;

  return {
    handleCloseMouseDown,
    handleHeaderMouseEnter,
    handleHeaderMouseLeave,
    isMagicWandTarget,
  };
}
