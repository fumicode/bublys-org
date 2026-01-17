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
import { MagicWandState, MagicWandActionCallback } from "../domain/MagicWandState";
import { MagicWandContext } from "./MagicWandContext";
import { FlameEffectOverlay, FlameEffectOverlayHandle } from "../ui/FlameEffectOverlay";

type MagicWandProviderProps = {
  children: ReactNode;
};

/**
 * MagicWand機能を提供するProvider
 *
 * ドラッグを開始すると、カーソル周りに炎が表示され、
 * バブルのヘッダーを100ms滞在するとアクションが実行される。
 */
export const MagicWandProvider: FC<MagicWandProviderProps> = ({
  children,
}) => {
  const [magicWandState, setMagicWandState] = useState(() =>
    MagicWandState.initial()
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(magicWandState);
  stateRef.current = magicWandState;

  // 炎エフェクトへのref（DOM直接操作用）
  const flameRef = useRef<FlameEffectOverlayHandle>(null);

  // 100msタイマーでアクション実行チェック
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

    timerRef.current = setTimeout(() => {
      const currentState = stateRef.current;
      if (currentState.shouldExecuteAction()) {
        const bubbleId = currentState.state.hoveredBubbleId!;
        const action = currentState.action;
        if (action) {
          action(bubbleId);
        }
        setMagicWandState((prev) => prev.markBubbleProcessed(bubbleId));
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
  ]);

  // MagicWand開始（ドラッグ開始時に呼ばれる）
  const startMagicWand = useCallback((e: MouseEvent, startingBubbleId: string, action: MagicWandActionCallback) => {
    setMagicWandState((prev) =>
      prev.activate(action).startHoverOnBubble(startingBubbleId)
    );
    // 初期位置を設定（次フレームで実行）
    requestAnimationFrame(() => {
      flameRef.current?.updatePosition(e.clientX, e.clientY);
    });
  }, []);

  // MagicWand終了（mouseup時）
  const endMagicWand = useCallback(() => {
    setMagicWandState((prev) => prev.deactivate());
  }, []);

  // カーソル移動（DOM直接操作でパフォーマンス向上）
  const updateCursor = useCallback((e: MouseEvent) => {
    flameRef.current?.updatePosition(e.clientX, e.clientY);
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
      hoveredBubbleId: magicWandState.state.hoveredBubbleId,
      onBubbleHeaderEnter,
      onBubbleHeaderLeave,
      startMagicWand,
    }),
    [
      magicWandState.isActive,
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
        ref={flameRef}
        isActive={magicWandState.isActive}
      />
    </MagicWandContext.Provider>
  );
};
