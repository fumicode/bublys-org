"use client";

import {
  FC,
  ReactNode,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { FloatModeState } from "../domain/FloatModeState";
import { FloatModeContext } from "./FloatModeContext";
import { FeatherEffectOverlay, FeatherEffectOverlayHandle } from "../ui/FeatherEffectOverlay";

type FloatModeProviderProps = {
  children: ReactNode;
};

/**
 * FloatMode機能を提供するProvider
 *
 * バブルを2回以上移動するとFloatModeに入り、全バブルが泡に包まれる。
 * 背景クリックまたはEscキーで解除。
 */
export const FloatModeProvider: FC<FloatModeProviderProps> = ({ children }) => {
  const [floatModeState, setFloatModeState] = useState(() =>
    FloatModeState.initial()
  );
  const featherRef = useRef<FeatherEffectOverlayHandle>(null);

  // FloatMode開始
  const activateFloatMode = useCallback(() => {
    setFloatModeState((prev) => prev.activate());
  }, []);

  // FloatMode終了
  const deactivateFloatMode = useCallback(() => {
    setFloatModeState((prev) => prev.deactivate());
  }, []);

  // カーソル位置更新（羽エフェクト用）
  const updateCursorPosition = useCallback((x: number, y: number) => {
    featherRef.current?.updatePosition(x, y);
  }, []);

  // Escキーでモード解除
  useEffect(() => {
    if (!floatModeState.isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        deactivateFloatMode();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [floatModeState.isActive, deactivateFloatMode]);

  // FloatMode中はマウス移動を追跡
  useEffect(() => {
    if (!floatModeState.isActive) return;

    const handleMouseMove = (e: MouseEvent) => {
      updateCursorPosition(e.clientX, e.clientY);
    };

    document.addEventListener("mousemove", handleMouseMove);
    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, [floatModeState.isActive, updateCursorPosition]);

  // Context値をメモ化
  const contextValue = useMemo(
    () => ({
      isActive: floatModeState.isActive,
      activateFloatMode,
      deactivateFloatMode,
      updateCursorPosition,
    }),
    [floatModeState.isActive, activateFloatMode, deactivateFloatMode, updateCursorPosition]
  );

  return (
    <FloatModeContext.Provider value={contextValue}>
      {children}
      <FeatherEffectOverlay ref={featherRef} isActive={floatModeState.isActive} />
    </FloatModeContext.Provider>
  );
};
