'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

/**
 * 最後にフォーカスしたオブジェクトIDを管理するコンテキスト
 */
interface FocusedObjectContextType {
  focusedObjectId: string | null;
  setFocusedObjectId: (objectId: string | null) => void;
}

/** 親が居ないときの既定 ── 覚える所が無いので、書こうとしても何も起きない */
const FocusedObjectContext = createContext<FocusedObjectContextType>({
  focusedObjectId: null,
  setFocusedObjectId: (): void => undefined,
});

/**
 * FocusedObjectContextのProvider
 */
export function FocusedObjectProvider({ children }: { children: ReactNode }) {
  const [focusedObjectId, setFocusedObjectId] = useState<string | null>(null);

  return (
    <FocusedObjectContext.Provider value={{ focusedObjectId, setFocusedObjectId }}>
      {children}
    </FocusedObjectContext.Provider>
  );
}

/**
 * FocusedObjectContextを使用するフック
 */
export function useFocusedObject() {
  return useContext(FocusedObjectContext);
}

