'use client';

/**
 * ScheduleWorldLineView — 勤務表の世界線（canvas版）
 *
 * useCasScope で勤務表スコープの DAG を読み、WorldLinesCanvasView（canvas）で描画する。
 * ノードをクリック / 矢印キーで過去・分岐の状態に時間移動する。
 * （Cmd+Z はデータ undo 用に予約のため使わない。矢印キーのみ）
 */
import { FC, useEffect, useMemo } from "react";
import { useCasScope } from "@bublys-org/world-line-graph";
import { WorldLinesCanvasView } from "@bublys-org/bubbles-ui";
import { MonthlyStaffSchedule } from "@bublys-org/hotel-shift-puzzle-model";
import { scheduleScopeId, SCHEDULE_OBJECT_TYPE } from "./ScheduleWorldLineProvider.js";

type Props = {
  scheduleId: string;
};

export const ScheduleWorldLineView: FC<Props> = ({ scheduleId }) => {
  const scope = useCasScope(scheduleScopeId(scheduleId));
  const apexId = scope.graph.getApex()?.id ?? null;

  // ノードごとの要約（割当件数）
  const summaries = useMemo(() => {
    const map = new Map<string, string>();
    for (const id of Object.keys(scope.graph.state.nodes)) {
      const s = scope.getObjectAt<MonthlyStaffSchedule>(
        id,
        SCHEDULE_OBJECT_TYPE,
        scheduleId
      );
      map.set(id, s ? `${s.assignments.length}件` : "");
    }
    return map;
  }, [scope.graph, scope.getObjectAt, scheduleId]);

  // 矢印キーで時間移動（← 戻る / → 進む / ↑↓ 分岐の兄弟切替）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        scope.moveBack();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        scope.moveForward();
      } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        const apex = scope.graph.getApex();
        if (!apex || apex.parentId === null) return;
        const siblings = scope.graph.getChildrenMap()[apex.parentId] ?? [];
        const idx = siblings.indexOf(apex.id);
        if (idx < 0) return;
        const next = siblings[idx + (e.key === "ArrowUp" ? -1 : 1)];
        if (next) {
          e.preventDefault();
          scope.moveTo(next);
        }
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [scope]);

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
        onSelectNode={scope.moveTo}
        background="rgba(15,18,28,0.9)"
      />
    </div>
  );
};
