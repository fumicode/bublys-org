'use client';

/**
 * useScheduleHistory — 勤務表ごとのローカル世界線（ビュー用）
 *
 * 記録は repository（シェルの save）が自動で行うため、ここは「読む・戻す」だけ:
 * - scope:   ローカル世界線スコープ（canvas 描画用）
 * - restore(nodeId): そのノードへ移動し、状態をアプリ全体リポジトリへ反映（グリッドに戻る）
 *
 * restore はローカル世界線を moveTo するだけで、新しいローカルノードは増やさない。
 * アプリ全体へは「巻き戻した状態」を1件記録する（アプリ全体は変更の平坦なログ）。
 */
import { useCasScope } from "@bublys-org/world-line-graph";
import { useAppStore } from "@bublys-org/state-management";
import { MonthlyStaffSchedule } from "@bublys-org/hotel-shift-puzzle-model";
import {
  APP_SCOPE_ID,
  localScopeId,
  commitToScope,
} from "../objects/commit.js";
import { SCHEDULE_TYPE } from "../objects/hotelObjects.js";

export function useScheduleHistory(scheduleId: string) {
  const scope = useCasScope(localScopeId(SCHEDULE_TYPE, scheduleId));
  const store = useAppStore();

  const restore = (nodeId: string) => {
    const schedule = scope.getObjectAt<MonthlyStaffSchedule>(
      nodeId,
      SCHEDULE_TYPE,
      scheduleId
    );
    scope.moveTo(nodeId);
    // アプリ全体スコープのみに反映（ローカルには追記しない）
    if (schedule) commitToScope(store, APP_SCOPE_ID, SCHEDULE_TYPE, schedule);
  };

  return { scope, restore };
}
