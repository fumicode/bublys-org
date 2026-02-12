'use client';

import React, { createContext, useContext } from 'react';

// ============================================================================
// 型レジストリ — 型ごとのシリアライズ/デシリアライズ設定
// ============================================================================

export interface CasTypeConfig<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  class?: new (...args: any[]) => T;
  fromJSON: (json: unknown) => T;
  toJSON: (obj: T) => unknown;
  getId: (obj: T) => string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CasRegistry = Record<string, CasTypeConfig<any>>;

// ============================================================================
// Context
// ============================================================================

interface CasContextValue {
  registry: CasRegistry;
}

const CasContext = createContext<CasContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface CasProviderProps {
  registry: CasRegistry;
  children: React.ReactNode;
}

export function CasProvider({ registry, children }: CasProviderProps) {
  return (
    <CasContext.Provider value={{ registry }}>
      {children}
    </CasContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useCas(): CasContextValue {
  const context = useContext(CasContext);
  if (!context) {
    throw new Error('useCas must be used within a CasProvider');
  }
  return context;
}
