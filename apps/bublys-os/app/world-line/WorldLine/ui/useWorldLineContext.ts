import { useContext } from "react";
import { WorldLineContext } from "../domain/WorldLineContext";

/**
 * WorldLineContextを使用するためのカスタムフック
 */
export const useWorldLineContext = () => {
  const context = useContext(WorldLineContext);
  if (!context) {
    throw new Error('useWorldLineContext must be used within a WorldLineManager');
  }
  return context;
};
