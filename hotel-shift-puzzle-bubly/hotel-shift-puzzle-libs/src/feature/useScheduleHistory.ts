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
import { ScheduleEditLog } from "@bublys-org/hotel-shift-puzzle-model";
import { APP_SCOPE_ID, localScopeId, commitToScope } from "../objects/commit.js";
import { SCHEDULE_TYPE, SCHEDULE_EDIT_LOG_TYPE } from "../objects/hotelObjects.js";

export function useScheduleHistory(scheduleId: string) {
  const scope = useCasScope(localScopeId(SCHEDULE_TYPE, scheduleId));
  const store = useAppStore();

  const restore = (nodeId: string) => {
    scope.moveTo(nodeId);
    // このローカル世界線に属する「全オブジェクト」（Schedule + ScheduleAvailability 等）を
    // その時点の状態でアプリ全体スコープへ反映する（まとめて巻き戻し）。
    const refs = scope.graph.getStateRefsAt(nodeId);
    for (const ref of refs) {
      const obj = scope.getObjectAt<unknown>(nodeId, ref.type, ref.id);
      if (obj !== null && obj !== undefined) {
        commitToScope(store, APP_SCOPE_ID, ref.type, obj);
      }
    }
    // EditLog がそのノードにまだ無い（初回記録より前）なら、空ログを APP へ戻す。
    // そうしないと子ノードのログが APP に残り、操作履歴パネルが時間移動とずれる。
    const hasEditLog = refs.some(
      (r) => r.type === SCHEDULE_EDIT_LOG_TYPE && r.id === scheduleId
    );
    if (!hasEditLog) {
      commitToScope(
        store,
        APP_SCOPE_ID,
        SCHEDULE_EDIT_LOG_TYPE,
        ScheduleEditLog.empty(scheduleId)
      );
    }
  };

  return { scope, restore };
}
