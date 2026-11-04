/**
 * confirmedVersion — この勤務表が持っている確定版（#231）
 *
 * 確定版は店舗×月で1つ。それを持つ勤務表は高々1つで、勤務表から見れば「自分の版のどれかが
 * その月の確定版か」になる。持っていれば、勤務表は自分の振り返りを見せ、世界線はそのノードに
 * 節目の旗を立てる。
 *
 * 確定版は世界に属さない（external）ので、どの世界の中から読んでもグローバルの最新を見る。
 * 時間移動しても「いまの確定版」は変わらない。
 */
import { useMemo } from "react";
import type { ConfirmedSchedule } from "@bublys-org/hotel-shift-puzzle-model";
import { useObjects } from "../objects/repository.js";
import { CONFIRMED_SCHEDULE_TYPE } from "../objects/hotelObjects.js";

/** その勤務表が持っている確定版（無ければ undefined。純粋） */
export function confirmedVersionOf(
  reports: readonly ConfirmedSchedule[],
  scheduleId: string | undefined
): ConfirmedSchedule | undefined {
  if (!scheduleId) return undefined;
  return reports.find((r) => r.scheduleId === scheduleId);
}

/** その勤務表が持っている確定版 */
export function useConfirmedVersion(scheduleId: string | undefined): ConfirmedSchedule | undefined {
  const reports = useObjects<ConfirmedSchedule>(CONFIRMED_SCHEDULE_TYPE);
  return useMemo(() => confirmedVersionOf(reports, scheduleId), [reports, scheduleId]);
}

const NO_MILESTONES: ReadonlySet<string> = new Set();

/** 世界線の節目（確定版のノード）。世界線ビューと成果木に渡す */
export function useConfirmedMilestones(scheduleId: string | undefined): ReadonlySet<string> {
  const confirmed = useConfirmedVersion(scheduleId);
  const nodeId = confirmed?.worldLineNodeId;
  return useMemo(() => (nodeId ? new Set([nodeId]) : NO_MILESTONES), [nodeId]);
}
