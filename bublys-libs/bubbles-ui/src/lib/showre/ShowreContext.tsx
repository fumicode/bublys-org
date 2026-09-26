"use client";
import { createContext, useContext } from "react";
import type { ShowreSide } from "./Showre.domain.js";

/**
 * 岸に貼り付いたバブルの中身に「自分がどの辺に貼り付いているか」を教える。
 * 貼り付いていなければ空。中身は普段これを知らなくてよい（見せ方を変えたいときだけ読む）。
 */
export const ShowreContext = createContext<readonly ShowreSide[]>([]);

/** 自分が貼り付いている辺。貼り付いていなければ空 */
export const useShowreEdges = (): readonly ShowreSide[] => useContext(ShowreContext);

/** 貼り付いているか */
export const useIsDocked = (): boolean => useShowreEdges().length > 0;
