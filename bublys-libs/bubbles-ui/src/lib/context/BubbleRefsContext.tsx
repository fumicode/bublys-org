"use client";
import { createContext, useContext, useRef, useCallback, ReactNode, FC } from "react";
import { SmartRect, CoordinateSystem } from "@bublys-org/bubbles-ui-util";
import { getElementRect } from "../utils/get-origin-rect.js";
import { measureViewportForElement } from "../utils/measure-viewport.js";

type CachedRect = {
  rect: SmartRect;
  timestamp: number;
};

type BubbleRefsContextType = {
  registerBubbleRef: (bubbleId: string, element: HTMLElement) => void;
  unregisterBubbleRef: (bubbleId: string) => void;
  getBubbleRef: (bubbleId: string) => HTMLElement | undefined;

  registerOriginRef: (url: string, element: HTMLElement) => void;
  unregisterOriginRef: (url: string) => void;
  getOriginRef: (url: string) => HTMLElement | undefined;

  // キャッシュ付きrect取得（強制リフローを最小化）
  getOriginRectCached: (url: string) => SmartRect | undefined;
  invalidateOriginRectCache: (url: string) => void;
  invalidateAllOriginRectCache: () => void;
};

const BubbleRefsContext = createContext<BubbleRefsContextType | null>(null);

// キャッシュの有効期限（ms）- アニメーション完了後に無効化されるので長めでOK
const CACHE_TTL = 5000;

export const BubbleRefsProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // Mapはミュータブルなので、refで保持すれば再レンダリングを引き起こさない
  const bubbleRefs = useRef<Map<string, HTMLElement>>(new Map());
  const originRefs = useRef<Map<string, HTMLElement>>(new Map());
  const originRectCache = useRef<Map<string, CachedRect>>(new Map());

  const registerBubbleRef = useCallback((bubbleId: string, element: HTMLElement) => {
    bubbleRefs.current.set(bubbleId, element);
  }, []);

  const unregisterBubbleRef = useCallback((bubbleId: string) => {
    bubbleRefs.current.delete(bubbleId);
  }, []);

  const getBubbleRef = useCallback((bubbleId: string) => {
    return bubbleRefs.current.get(bubbleId);
  }, []);

  const registerOriginRef = useCallback((url: string, element: HTMLElement) => {
    originRefs.current.set(url, element);
    // 要素が登録されたらキャッシュを無効化
    originRectCache.current.delete(url);
  }, []);

  const unregisterOriginRef = useCallback((url: string) => {
    originRefs.current.delete(url);
    originRectCache.current.delete(url);
  }, []);

  const getOriginRef = useCallback((url: string) => {
    return originRefs.current.get(url);
  }, []);

  // キャッシュ付きでorigin rectを取得（強制リフローを最小化）
  const getOriginRectCached = useCallback((url: string): SmartRect | undefined => {
    const now = Date.now();

    // キャッシュをチェック
    const cached = originRectCache.current.get(url);
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      return cached.rect;
    }

    // キャッシュがない or 期限切れの場合、DOMから取得
    const originEl = originRefs.current.get(url);
    if (!originEl) return undefined;

    // screen 座標 → universe 座標に補正してから SmartRect 化
    // （SmartRect.GLOBAL は universe 座標系を表す。変換は Viewport に委譲）
    const screenRect = getElementRect(originEl);
    // origin 要素が属する universe（ネストでは最寄り）を基準に screen→universe 変換。
    // Viewport は親 CSS scale も吸収するので、ネストで奥のレイヤーに居る universe
    // 内の origin でも universe 単位で正しく取れる。
    const viewport = measureViewportForElement(originEl);
    const topLeft = viewport
      ? viewport.screenToUniverse({ x: screenRect.x, y: screenRect.y })
      : { x: screenRect.x, y: screenRect.y };
    const universeSize = viewport
      ? viewport.screenSizeToUniverse({ width: screenRect.width, height: screenRect.height })
      : { width: screenRect.width, height: screenRect.height };
    const universeRect = new DOMRect(
      topLeft.x,
      topLeft.y,
      universeSize.width,
      universeSize.height,
    );
    // 親サイズ = SmartRect の空きスペース計算の基準。ネスト時はその universe の
    // 可視サイズを使い、Provider 外なら window を使う（useMyRect と同じ方針）。
    const parentSize = viewport
      ? viewport.size
      : { width: window.innerWidth, height: window.innerHeight };
    const smartRect = new SmartRect(universeRect, parentSize, CoordinateSystem.GLOBAL.toData());

    // キャッシュに保存
    originRectCache.current.set(url, { rect: smartRect, timestamp: now });

    return smartRect;
  }, []);

  const invalidateOriginRectCache = useCallback((url: string) => {
    originRectCache.current.delete(url);
  }, []);

  const invalidateAllOriginRectCache = useCallback(() => {
    originRectCache.current.clear();
  }, []);

  return (
    <BubbleRefsContext.Provider
      value={{
        registerBubbleRef,
        unregisterBubbleRef,
        getBubbleRef,
        registerOriginRef,
        unregisterOriginRef,
        getOriginRef,
        getOriginRectCached,
        invalidateOriginRectCache,
        invalidateAllOriginRectCache,
      }}
    >
      {children}
    </BubbleRefsContext.Provider>
  );
};

export const useBubbleRefs = (): BubbleRefsContextType => {
  const context = useContext(BubbleRefsContext);
  if (!context) {
    throw new Error("useBubbleRefs must be used within BubbleRefsProvider");
  }
  return context;
};

export const useBubbleRefsOptional = (): BubbleRefsContextType | null => {
  return useContext(BubbleRefsContext);
};
