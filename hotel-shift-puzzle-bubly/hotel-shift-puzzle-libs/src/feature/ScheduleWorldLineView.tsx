'use client';

/**
 * ScheduleWorldLineView — 勤務表ごとのローカル世界線（canvas版）
 *
 * 勤務表専用のローカル世界線スコープ（schedule:${id}）を描く。
 * ノードをクリック / 矢印キーでその時点の勤務表状態へ時間移動する（restore で
 * アプリ全体リポジトリへ反映するので、グリッドの表示も戻る）。
 * 各ノードの要約には勤務表の割当件数を表示する。
 * （Cmd+Z はデータ undo 用に予約のため使わない。矢印キーのみ）
 */
import { FC, useEffect, useMemo } from "react";
import { WorldLinesCanvasView } from "@bublys-org/bubbles-ui";
import { MonthlyStaffSchedule } from "@bublys-org/hotel-shift-puzzle-model";
import { useScheduleHistory } from "./useScheduleHistory.js";
import { SCHEDULE_TYPE } from "../objects/hotelObjects.js";

type Props = {
  scheduleId: string;
};

export const ScheduleWorldLineView: FC<Props> = ({ scheduleId }) => {
  const { scope, restore } = useScheduleHistory(scheduleId);
  const apexId = scope.graph.getApex()?.id ?? null;

  // ノードごとの要約（割当件数）
  const summaries = useMemo(() => {
    const map = new Map<string, string>();
    for (const id of Object.keys(scope.graph.state.nodes)) {
      const s = scope.getObjectAt<MonthlyStaffSchedule>(id, SCHEDULE_TYPE, scheduleId);
      map.set(id, s ? `${s.assignments.length}件` : "");
    }
    return map;
  }, [scope.graph, scope.getObjectAt, scheduleId]);

  // 矢印キーで時間移動（← 親 / → 子 / ↑↓ 分岐の兄弟切替）。すべて restore 経由。
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const apex = scope.graph.getApex();
      if (!apex) return;
      let target: string | undefined;
      if (e.key === "ArrowLeft") {
        target = apex.parentId ?? undefined;
      } else if (e.key === "ArrowRight") {
        target = (scope.graph.getChildrenMap()[apex.id] ?? [])[0];
      } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        if (apex.parentId === null) return;
        const siblings = scope.graph.getChildrenMap()[apex.parentId] ?? [];
        const idx = siblings.indexOf(apex.id);
        if (idx >= 0) target = siblings[idx + (e.key === "ArrowUp" ? -1 : 1)];
      } else {
        return;
      }
      if (target) {
        e.preventDefault();
        restore(target);
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [scope, restore]);

  if (!scope.graph.state.rootNodeId) {
    return (
      <div style={{ padding: 24, color: "#888", fontSize: "0.85em" }}>
        履歴がありません。勤務表を編集すると記録されます。
      </div>
    );
  }

  return (
    <div style={{ width: 600, height: 360, maxWidth: "80vw", maxHeight: "70vh" }}>
      <WorldLinesCanvasView
        graph={scope.graph}
        apexNodeId={apexId}
        getNodeSummary={(id) => summaries.get(id) ?? ""}
        onSelectNode={restore}
        background="rgba(15,18,28,0.9)"
      />
    </div>
  );
};
