'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

/**
 * 最後にフォーカスしたオブジェクトIDを管理するコンテキスト
 */
interface FocusedObjectContextType {
  focusedObjectId: string | null;
  setFocusedObjectId: (objectId: string | null) => void;
}

const FocusedObjectContext = createContext<FocusedObjectContextType>({
  focusedObjectId: null,
  setFocusedObjectId: () => {},
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

