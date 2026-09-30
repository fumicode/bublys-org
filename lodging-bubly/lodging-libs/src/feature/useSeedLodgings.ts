'use client';
/**
 * 最初の宿を撒く ── 越後の調べ物 1,516 軒。
 *
 * ★ 撒くのは**1 度きり**（`seedLodgings`）。消した宿は戻ってこない。
 * ★ ID は名前と緯度経度から作ってあるので、調べ物を作り直しても指が外れない
 *   （`tools/echigo/build.mjs`）。
 */
import { useEffect } from "react";
import { useAppDispatch } from "@bublys-org/state-management";
import { ECHIGO } from "../data/echigo-lodgings.js";
import { seedLodgings } from "../slice/lodging-slice.js";

export function useSeedLodgings(): void {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(seedLodgings({ name: "echigo", lodgings: ECHIGO }));
  }, [dispatch]);
}
