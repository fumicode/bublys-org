'use client';

/**
 * useScheduleHistory — 勤務表ごとのローカル世界線
 *
 * 全オブジェクトはアプリ全体スコープに載るが、勤務表は「個別単位で戻したい」ので
 * 勤務表ごとに専用のローカル世界線スコープ（schedule:${id}）も持つ。
 *
 * - record(schedule): 編集をローカル世界線にも記録（空なら最初のノードを作る）
 * - restore(nodeId): ローカル世界線のノードへ移動し、その状態をアプリ全体リポジトリへ反映
 *   （グリッド等はアプリ全体スコープを読むため、これで表示が戻る）
 * - scope: ローカル世界線スコープ（ビュー描画用）
 */
import { useCasScope } from "@bublys-org/world-line-graph";
import { MonthlyStaffSchedule } from "@bublys-org/hotel-shift-puzzle-model";
import { useObjectRepo } from "../objects/repository.js";
import { SCHEDULE_TYPE } from "../objects/hotelObjects.js";

/** 勤務表ごとのローカル世界線スコープID */
export const scheduleScopeId = (scheduleId: string): string => `schedule:${scheduleId}`;

export function useScheduleHistory(scheduleId: string) {
  const scope = useCasScope(scheduleScopeId(scheduleId));
  const repo = useObjectRepo<MonthlyStaffSchedule>(SCHEDULE_TYPE);

  /** 編集をこの勤務表のローカル世界線に記録する */
  const record = (schedule: MonthlyStaffSchedule) => {
    scope.addObject(SCHEDULE_TYPE, schedule);
  };

  /** 空ならローカル世界線を現在状態で初期化する（最初のノード） */
  const seed = (schedule: MonthlyStaffSchedule) => {
    if (!scope.graph.state.rootNodeId) scope.addObject(SCHEDULE_TYPE, schedule);
  };

  /** ローカル世界線のノードへ移動し、その状態をアプリ全体リポジトリへ反映 */
  const restore = (nodeId: string) => {
    const schedule = scope.getObjectAt<MonthlyStaffSchedule>(
      nodeId,
      SCHEDULE_TYPE,
      scheduleId
    );
    scope.moveTo(nodeId);
    if (schedule) repo.save(schedule);
  };

  return { scope, record, seed, restore };
}
