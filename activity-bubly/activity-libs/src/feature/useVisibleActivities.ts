'use client';
/**
 * **この地図で探す** ── 地図が決めた範囲の中にあるアクティビティだけを返す。
 *
 * ★ ルールは 1 行：「開催場所が、探す範囲の中に入っているか」。
 *   範囲が決まっていなければ絞らない（全部返す）。
 * ★ 読むのは地図の**探す範囲**であって、映している範囲ではない
 *   ── 映している範囲を読むと、地図を少し動かしただけで一覧が入れ替わる。
 */
import { useAppSelector } from "@bublys-org/state-management";
import { selectSearchBounds, selectSpots } from "@bublys-org/map-libs";
import { Activity_アクティビティ } from "../domain/Activity.domain.js";
import { selectActivities } from "../slice/activity-slice.js";

export type VisibleActivities = {
  activities: Activity_アクティビティ[];
  /** 範囲で絞っているか（絞っていることを画面に出すため） */
  filtered: boolean;
  /** 絞る前の件数 */
  total: number;
};

export function useVisibleActivities(): VisibleActivities {
  const activities = useAppSelector(selectActivities);
  const spots = useAppSelector(selectSpots);
  const bounds = useAppSelector(selectSearchBounds);

  if (!bounds) return { activities, filtered: false, total: activities.length };

  const visible = activities.filter((a) => {
    const spot = a.place ? spots.find((s) => s.id === a.place?.id) : undefined;
    return spot ? bounds.contains(spot.lat, spot.lng) : false;
  });
  return { activities: visible, filtered: true, total: activities.length };
}
