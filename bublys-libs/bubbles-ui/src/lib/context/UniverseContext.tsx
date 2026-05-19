"use client";
import { createContext, useContext, RefObject } from "react";
import { Point2 } from "@bublys-org/bubbles-ui-util";

export type UniverseContextType = {
  universeRef: RefObject<HTMLDivElement | null>;
};

export const UniverseContext = createContext<UniverseContextType | null>(null);

export const useUniverseContext = (): UniverseContextType | null => {
  return useContext(UniverseContext);
};

/**
 * viewport（スクロール容器）の現在のスクロール量を返す。
 * = 「viewport 左上の universe 座標」。
 *
 * universe(StyledUniverse)の親がスクロール容器(StyledViewport)。
 * UniverseContext の外側（BublyApp/BubblesUI 等）からも使えるよう DOM 経由で取得する。
 */
export const getUniverseScrollOffset = (): Point2 => {
  if (typeof document === "undefined") return { x: 0, y: 0 };
  const universeEl = document.querySelector('[data-bubble-universe]');
  const scrollEl = universeEl?.parentElement;
  return {
    x: scrollEl?.scrollLeft ?? 0,
    y: scrollEl?.scrollTop ?? 0,
  };
};
