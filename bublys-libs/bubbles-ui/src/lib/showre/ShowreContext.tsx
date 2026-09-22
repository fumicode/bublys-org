"use client";
import { createContext, useContext } from "react";
import type { ShowreSide } from "./Showre.domain.js";

export type ShowreContextType = {
  /** このバブルが着いている岸 */
  side: ShowreSide;
  /** その岸を持つ universe */
  universeId: string;
};

/**
 * 岸に着いたバブルの中身に「自分は今どの岸に居るか」を教える。
 * Provider の外（＝海に浮いている）なら null。
 *
 * 中身のコンポーネントは浮いているときと同じものを使う。見せ方を変えたければ
 * {@link useShowreSide} で分岐する（帯ならアイコンだけ、浮いていれば一覧、など）。
 */
export const ShowreContext = createContext<ShowreContextType | null>(null);

/** 自分が着いている岸。浮いていれば undefined */
export const useShowreSide = (): ShowreSide | undefined =>
  useContext(ShowreContext)?.side;
