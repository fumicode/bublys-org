'use client';
/**
 * 最初のアクティビティを撒く。
 *
 * ★ `place` の id は地図バブリの撒く地点と同じ文字列（`HAKONE_SPOTS`）。
 *   型も一緒に持つので、アクティビティは地図を import せずに名前を引ける。
 */
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import type { ActivityPlain } from "../domain/Activity.domain.js";
import { selectActivities, setActivityList } from "../slice/activity-slice.js";

export const HAKONE_ACTIVITIES: ActivityPlain[] = [
  {
    id: "ashinoko-cruise",
    name: "芦ノ湖遊覧船",
    place: { type: "Spot", id: "motohakone" },
    durationMin: 60,
    price: 1500,
    rating: 4.4,
    reviewCount: 120,
    description: "芦ノ湖の美しい景色を楽しめる遊覧船。定期便・貸切便も利用可能。",
  },
  {
    id: "chokoku-museum",
    name: "彫刻の森美術館",
    place: { type: "Spot", id: "chokoku-no-mori" },
    durationMin: 120,
    price: 1600,
    rating: 4.5,
    reviewCount: 340,
    description: "屋外に彫刻が点在する野外美術館。晴れた日に歩いて回るのが気持ちよい。",
  },
  {
    id: "owakudani-walk",
    name: "大涌谷 散策",
    place: { type: "Spot", id: "owakudani" },
    durationMin: 45,
    price: 0,
    rating: 4.2,
    reviewCount: 210,
    description: "噴煙の上がる谷を歩く。黒たまごが名物。",
  },
  {
    id: "hakone-jinja-visit",
    name: "箱根神社 参拝",
    place: { type: "Spot", id: "hakone-jinja" },
    durationMin: 60,
    price: 0,
    rating: 4.6,
    reviewCount: 480,
    description: "湖のほとりに平和の鳥居が立つ。朝のうちが静か。",
  },
  {
    id: "yumoto-stroll",
    name: "箱根湯本 温泉街 散策",
    place: { type: "Spot", id: "hakone-yumoto" },
    durationMin: 60,
    price: 0,
    rating: 4.0,
    reviewCount: 95,
    description: "駅前から続く温泉街。土産物と食べ歩き。",
  },
];

export function useSeedActivities(): void {
  const dispatch = useAppDispatch();
  const activities = useAppSelector(selectActivities);
  useEffect(() => {
    if (activities.length === 0) dispatch(setActivityList(HAKONE_ACTIVITIES));
  }, [dispatch, activities.length]);
}
