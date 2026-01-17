"use client";

import {
  FC,
  ReactNode,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { MagicWandState } from "../domain/MagicWandState";
import { MagicWandContext } from "./MagicWandContext";
import { FlameEffectOverlay } from "../ui/FlameEffectOverlay";

type MagicWandProviderProps = {
  children: ReactNode;
  /** バブル削除時に呼ばれるコールバック */
  onDeleteBubble: (bubbleId: string) => void;
};

/**
 * MagicWand機能を提供するProvider
 *
 * 削除ボタンからドラッグを開始すると、カーソル周りに炎が表示され、
 * バブルのヘッダーを100ms滞在すると削除される。
 */
export const MagicWandProvider: FC<MagicWandProviderProps> = ({
  children,
  onDeleteBubble,
}) => {
  const [magicWandState, setMagicWandState] = useState(() =>
    MagicWandState.initial()
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(magicWandState);
  stateRef.current = magicWandState;

  // 100msタイマーで削除チェック
  useEffect(() => {
    if (
      !magicWandState.state.hoveredBubbleId ||
      !magicWandState.state.hoverStartTime
    ) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    console.log('[MagicWand] Starting timer for bubble:', magicWandState.state.hoveredBubbleId);
    timerRef.current = setTimeout(() => {
      const currentState = stateRef.current;
      console.log('[MagicWand] Timer fired, checking delete:', {
        hoveredBubbleId: currentState.state.hoveredBubbleId,
        hoverStartTime: currentState.state.hoverStartTime,
        shouldDelete: currentState.shouldDeleteHoveredBubble(),
      });
      if (currentState.shouldDeleteHoveredBubble()) {
        const bubbleId = currentState.state.hoveredBubbleId!;
        console.log('[MagicWand] Deleting bubble:', bubbleId);
        onDeleteBubble(bubbleId);
        setMagicWandState((prev) => prev.markBubbleDeleted(bubbleId));
      }
    }, 100);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [
    magicWandState.state.hoveredBubbleId,
    magicWandState.state.hoverStartTime,
    onDeleteBubble,
  ]);

  // MagicWand開始（削除ボタンからドラッグ開始時に呼ばれる）
  const startMagicWand = useCallback((e: MouseEvent, startingBubbleId: string) => {
    setMagicWandState((prev) =>
      prev
        .activate({ x: e.clientX, y: e.clientY })
        .startHoverOnBubble(startingBubbleId)
    );
  }, []);

  // MagicWand終了（mouseup時）
  const endMagicWand = useCallback(() => {
    setMagicWandState((prev) => prev.deactivate());
  }, []);

  // カーソル移動
  const updateCursor = useCallback((e: MouseEvent) => {
    setMagicWandState((prev) =>
      prev.updateCursorPosition({ x: e.clientX, y: e.clientY })
    );
  }, []);

  // グローバルmouseup/mousemoveリスナー
  useEffect(() => {
    if (!magicWandState.isActive) return;

    const handleMouseMove = (e: MouseEvent) => updateCursor(e);
    const handleMouseUp = () => endMagicWand();

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [magicWandState.isActive, updateCursor, endMagicWand]);

  // Contextコールバック
  const onBubbleHeaderEnter = useCallback((bubbleId: string) => {
    setMagicWandState((prev) => prev.startHoverOnBubble(bubbleId));
  }, []);

  const onBubbleHeaderLeave = useCallback(() => {
    setMagicWandState((prev) => prev.endHoverOnBubble());
  }, []);

  // Context値をメモ化
  const contextValue = useMemo(
    () => ({
      isActive: magicWandState.isActive,
      cursorPosition: magicWandState.state.cursorPosition,
      hoveredBubbleId: magicWandState.state.hoveredBubbleId,
      onBubbleHeaderEnter,
      onBubbleHeaderLeave,
      startMagicWand,
    }),
    [
      magicWandState.isActive,
      magicWandState.state.cursorPosition,
      magicWandState.state.hoveredBubbleId,
      onBubbleHeaderEnter,
      onBubbleHeaderLeave,
      startMagicWand,
    ]
  );

  return (
    <MagicWandContext.Provider value={contextValue}>
      {children}
      <FlameEffectOverlay
        cursorPosition={magicWandState.state.cursorPosition}
        isActive={magicWandState.isActive}
      />
    </MagicWandContext.Provider>
  );
};
