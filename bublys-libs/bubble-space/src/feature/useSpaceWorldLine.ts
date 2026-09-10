"use client";
import { useEffect, useRef } from "react";
import { useCasScope } from "@bublys-org/world-line-graph";
import { Space } from "../domain/space.js";
import {
  BubbleSpaceSnapshot,
  BUBBLE_SPACE_ID,
  BUBBLE_SPACE_TYPE,
  spaceFingerprint,
} from "../domain/snapshot.js";

export type UseSpaceWorldLineOptions = {
  /** 世界線スコープ ID。勤務表ごとなら `space:<scheduleId>` のように分ける。 */
  scopeId: string;
  space: Space;
  setSpace: (s: Space) => void;
  /**
   * 記録までの待ち時間(ms)。席の譲り合いは毎フレーム Space を作り替えるので、
   * 落ち着いてから1回だけ記録する。
   */
  debounceMs?: number;
  enabled?: boolean;
};

/**
 * 空間の配置を世界線に commit し、現在ノード(apex)が動いたら復元する。
 *
 * 勤務表やメモと同じ CAS スコープに載せるので、「戻る」で**配置ごと**巻き戻る。
 * 自分が書いた値で自分を書き戻さないよう、直近に往復した指紋を覚えておく。
 */
export function useSpaceWorldLine({
  scopeId, space, setSpace, debounceMs = 350, enabled = true,
}: UseSpaceWorldLineOptions) {
  const scope = useCasScope(scopeId);
  const shell = scope.getShell<BubbleSpaceSnapshot>(BUBBLE_SPACE_TYPE, BUBBLE_SPACE_ID);
  const snapshot = shell?.object;
  /** 直近に世界線と往復した配置。これと同じなら何もしない。 */
  const syncedRef = useRef<string | null>(null);
  const setSpaceRef = useRef(setSpace);
  setSpaceRef.current = setSpace;

  // ── 復元：世界線の現在値が変わったら空間へ反映する ──────────────
  useEffect(() => {
    if (!enabled || !snapshot) return;
    const fp = JSON.stringify(snapshot.toJSON());
    if (fp === syncedRef.current) return;
    syncedRef.current = fp;
    setSpaceRef.current(snapshot.toSpace());
  }, [enabled, snapshot]);

  // ── 記録：配置が変わって落ち着いたら世界線へ ────────────────
  useEffect(() => {
    if (!enabled) return;
    const fp = spaceFingerprint(space);
    if (fp === syncedRef.current) return;
    const timer = setTimeout(() => {
      syncedRef.current = fp;
      scope.addObject(BUBBLE_SPACE_TYPE, BubbleSpaceSnapshot.of(space));
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [enabled, space, scope, debounceMs]);

  return {
    /** まだ一度も記録されていないか（初期配置を書き込むべきか） */
    isEmpty: !snapshot,
  };
}
