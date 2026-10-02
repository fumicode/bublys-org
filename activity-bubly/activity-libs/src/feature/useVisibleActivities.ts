'use client';
/**
 * **出すアクティビティ** ── いまは絞らず、持っているものをそのまま返す。
 *
 * ★ もとは地図の「この範囲で探す」が決めた範囲で絞っていた。その口は消えた
 *   （読み手がこのバブリ 1 つだけになり、旅の空間からも外れたため）ので、
 *   **絞る理由が無くなった**。絞らないと決めた以上、範囲を読む所も残さない
 *   ── 読まない値を読み続けると、どちらが本当か後から分からなくなる。
 * ★ 形（`filtered` / `total`）はそのまま残す。呼ぶ側はこれを見て
 *   「絞っている」と出し分けているので、いつも `false` と答えればよい。
 */
import { useAppSelector } from "@bublys-org/state-management";
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
  return { activities, filtered: false, total: activities.length };
}
