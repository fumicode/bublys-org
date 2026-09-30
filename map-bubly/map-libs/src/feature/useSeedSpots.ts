'use client';
/**
 * 最初の地点を撒く。
 *
 * ★ **ID は固定の文字列**（`crypto.randomUUID()` ではない）。アクティビティも旅程も
 *   `spotId` でここを指すので、開くたびに ID が変わると指が外れる。
 * ★ 撒くのは**ひと組ずつ、1 度きり**（`seedSpots`）。箱根の見本はデモが指しているので
 *   残し、越後の調べ物はその上に足す ── 消した地点は戻ってこない。
 */
import { useEffect } from "react";
import { useAppDispatch } from "@bublys-org/state-management";
import type { SpotPlain } from "../domain/Spot.domain.js";
import { ECHIGO } from "../data/echigo-spots.js";
import { seedSpots } from "../slice/map-slice.js";

export const HAKONE_SPOTS: SpotPlain[] = [
  { id: "hakone-yumoto", name: "箱根湯本駅", category: "station", lat: 35.2325, lng: 139.1063 },
  { id: "gora", name: "強羅駅", category: "station", lat: 35.2494, lng: 139.0468 },
  { id: "chokoku-no-mori", name: "彫刻の森美術館", category: "sightseeing", lat: 35.2445, lng: 139.0505 },
  { id: "owakudani", name: "大涌谷", category: "sightseeing", lat: 35.2437, lng: 139.0193 },
  { id: "togendai", name: "桃源台港", category: "port", lat: 35.2276, lng: 139.0128 },
  { id: "motohakone", name: "元箱根港", category: "port", lat: 35.2023, lng: 139.0269 },
  { id: "hakone-jinja", name: "箱根神社", category: "sightseeing", lat: 35.2049, lng: 139.0257 },
  { id: "lakeside-hotel", name: "箱根レイクサイドホテル", category: "lodging", lat: 35.2101, lng: 139.018 },
  { id: "terrace-inn", name: "箱根テラスイン", category: "lodging", lat: 35.233, lng: 139.104 },
  { id: "satoview", name: "箱根里ビュー旅館", category: "lodging", lat: 35.24, lng: 139.049 },
  { id: "yumoto-shokudo", name: "湯本の食事処", category: "food", lat: 35.2338, lng: 139.1029 },
  { id: "lakeside-cafe", name: "湖畔のカフェ", category: "food", lat: 35.2066, lng: 139.0261 },
];

export function useSeedSpots(): void {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(seedSpots({ name: "hakone", spots: HAKONE_SPOTS }));
    dispatch(seedSpots({ name: "echigo", spots: ECHIGO }));
  }, [dispatch]);
}
