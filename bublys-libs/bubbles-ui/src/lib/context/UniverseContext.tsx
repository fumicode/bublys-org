"use client";
import { createContext, useContext, RefObject } from "react";

export type UniverseContextType = {
  universeRef: RefObject<HTMLDivElement | null>;
};

export const UniverseContext = createContext<UniverseContextType | null>(null);

export const useUniverseContext = (): UniverseContextType | null => {
  return useContext(UniverseContext);
};
