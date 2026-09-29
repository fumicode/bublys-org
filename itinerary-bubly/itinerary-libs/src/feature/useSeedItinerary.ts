'use client';
/**
 * 最初の旅程を撒く ── 箱根 1 泊 2 日。
 *
 * ★ `spotId` / `activityId` は地図・アクティビティが撒くものと同じ文字列。
 *   食い違うと、地図に道が引けず、指しても光らない。
 */
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import type { ItineraryPlain } from "../domain/Itinerary.domain.js";
import { selectItineraries, setItineraryList } from "../slice/itinerary-slice.js";

/** 見本の旅程の ID（ランチャーから直に開けるように固定にする） */
export const SAMPLE_ITINERARY_ID = "hakone-1n2d";

const hm = (h: number, m: number) => h * 60 + m;

const sampleItinerary = (): ItineraryPlain => ({
  id: SAMPLE_ITINERARY_ID,
  title: "箱根 1泊2日",
  days: [
    {
      date: "2026-05-17",
      items: [
        { id: "d1-1", startMin: hm(8, 30), endMin: hm(10, 5), title: "新宿 → 箱根湯本", kind: "move", cost: 2480, spotId: "hakone-yumoto" },
        { id: "d1-2", startMin: hm(10, 20), endMin: hm(11, 20), title: "箱根湯本 散策", kind: "sightseeing", cost: 0, spotId: "hakone-yumoto", activityId: "yumoto-stroll" },
        { id: "d1-3", startMin: hm(11, 30), endMin: hm(12, 30), title: "昼食（温泉街周辺）", kind: "meal", cost: 1500, spotId: "yumoto-shokudo" },
        { id: "d1-4", startMin: hm(13, 30), endMin: hm(15, 0), title: "芦ノ湖遊覧船", kind: "sightseeing", cost: 1500, spotId: "motohakone", activityId: "ashinoko-cruise" },
        { id: "d1-5", startMin: hm(16, 30), endMin: hm(17, 0), title: "箱根チェックイン", kind: "stay", cost: 0, costNote: "宿泊費別", spotId: "lakeside-hotel" },
        { id: "d1-6", startMin: hm(18, 30), endMin: hm(20, 0), title: "夕食（地元の食事処）", kind: "meal", cost: 2600, spotId: "lakeside-cafe" },
      ],
    },
    {
      date: "2026-05-18",
      items: [
        { id: "d2-1", startMin: hm(9, 30), endMin: hm(10, 30), title: "箱根神社", kind: "sightseeing", cost: 0, spotId: "hakone-jinja", activityId: "hakone-jinja-visit" },
        { id: "d2-2", startMin: hm(11, 0), endMin: hm(12, 0), title: "カフェ休憩", kind: "meal", cost: 1200, spotId: "lakeside-cafe" },
        { id: "d2-3", startMin: hm(13, 30), endMin: hm(15, 5), title: "箱根湯本 → 新宿", kind: "move", cost: 2480, spotId: "hakone-yumoto" },
      ],
    },
  ],
});

export function useSeedItinerary(): void {
  const dispatch = useAppDispatch();
  const itineraries = useAppSelector(selectItineraries);
  useEffect(() => {
    if (itineraries.length === 0) dispatch(setItineraryList([sampleItinerary()]));
  }, [dispatch, itineraries.length]);
}
