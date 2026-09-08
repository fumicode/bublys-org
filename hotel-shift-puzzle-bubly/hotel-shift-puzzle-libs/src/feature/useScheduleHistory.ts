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

  /**
   * そのノードへ移動し、状態をアプリ全体リポジトリへ反映する。
   *
   * 解決に resolveObjectsAt を使うのが要点。メモリ上の CAS は上限つきで古いものから
   * 追い出されるので、同期に読むと「追い出されたぶんは黙って読めない」ことになる
   * （＝時間移動したのに勤務表が古いまま）。永続ストアからの取得を待ってから反映する。
   */
  const restore = async (nodeId: string) => {
    scope.moveTo(nodeId);

    // このローカル世界線に属する「全オブジェクト」（Schedule + ScheduleEditLog 等）を
    // その時点の状態でアプリ全体スコープへ反映する（まとめて巻き戻し）。
    const resolved = await scope.resolveObjectsAt(nodeId);
    for (const { type, obj } of resolved) {
      commitToScope(store, APP_SCOPE_ID, type, obj);
    }

    const refs = scope.graph.getStateRefsAt(nodeId);
    // 勤務表そのものがこのノードに載っていなければ、戻すものが無い。表示は前のまま残るので、
    // 黙って通すと「時間移動したのに変わらない」になる。世界線の記録が欠けている印。
    if (!refs.some((r) => r.type === SCHEDULE_TYPE && r.id === scheduleId)) {
      console.warn(
        `世界線: ノード ${nodeId} には勤務表が記録されていないため、勤務表は戻せません` +
          `（この世界線の起点より前の時点か、起点の記録が欠けています）。`
      );
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
