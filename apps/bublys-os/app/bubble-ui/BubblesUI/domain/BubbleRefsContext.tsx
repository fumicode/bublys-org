"use client";
import { createContext, useContext, useRef, useCallback, ReactNode, FC } from "react";

type BubbleRefsContextType = {
  registerBubbleRef: (bubbleId: string, element: HTMLElement) => void;
  unregisterBubbleRef: (bubbleId: string) => void;
  getBubbleRef: (bubbleId: string) => HTMLElement | undefined;

  registerOriginRef: (url: string, element: HTMLElement) => void;
  unregisterOriginRef: (url: string) => void;
  getOriginRef: (url: string) => HTMLElement | undefined;
};

const BubbleRefsContext = createContext<BubbleRefsContextType | null>(null);

export const BubbleRefsProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // Mapはミュータブルなので、refで保持すれば再レンダリングを引き起こさない
  const bubbleRefs = useRef<Map<string, HTMLElement>>(new Map());
  const originRefs = useRef<Map<string, HTMLElement>>(new Map());

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
  }, []);

  const unregisterOriginRef = useCallback((url: string) => {
    originRefs.current.delete(url);
  }, []);

  const getOriginRef = useCallback((url: string) => {
    return originRefs.current.get(url);
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
