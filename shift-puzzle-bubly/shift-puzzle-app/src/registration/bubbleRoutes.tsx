"use client";

import { useContext, useMemo } from "react";
import { BubbleRoute, BubblesContext } from "@bublys-org/bubbles-ui";
import { useAppSelector } from "@bublys-org/state-management";
import {
  MemberCollection,
  parseMemberFilter,
  stringifyMemberFilter,
  MemberFilterCriteria as MemberFilterType,
  MemberFilter,
  MemberDetail,
  MemberAvailability,
  ShiftPlanEditor,
  AssignmentEvaluation,
  MemberShiftTable,
  TaskCollection,
  TaskFilter,
  TaskDetail,
  MemberGanttEditor,
  PrimitiveGanttEditor,
  TaskGanttEditor,
  ShiftPlanWorldLineGraphView,
  ShiftPlanList,
  ShiftStatus,
  parseTaskFilter,
  stringifyTaskFilter,
  selectShiftPuzzlePlans,
  type DayType,
} from "@bublys-org/shift-puzzle-libs";

// --- URLヘルパー ---
const getQuery = (url: string): string => {
  const i = url.indexOf('?');
  return i >= 0 ? url.slice(i + 1) : '';
};

const buildMemberUrl = (memberId: string) => `shift-puzzle/members/${memberId}`;

// シフトパズル - 局員絞り込み検索バブル
const ShiftPuzzleMemberFilterBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const initialFilter = parseMemberFilter(getQuery(bubble.url));
  return <MemberFilter initialFilter={initialFilter} />;
};

// シフトパズル - 局員一覧バブル（フィルター付き）
const ShiftPuzzleMembersBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const filter = parseMemberFilter(getQuery(bubble.url));
  return <MemberCollection filter={filter} />;
};

// シフトパズル - 局員詳細バブル
const ShiftPuzzleMemberBubble: BubbleRoute["Component"] = ({ bubble }) => {
  return <MemberDetail memberId={bubble.params.memberId} />;
};

// シフトパズル - 局員参加可能シフトバブル
const ShiftPuzzleMemberAvailabilityBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const shiftPlanId = new URLSearchParams(getQuery(bubble.url)).get('shiftPlanId') ?? undefined;
  return <MemberAvailability memberId={bubble.params.memberId} shiftPlanId={shiftPlanId} />;
};

// シフトパズル - シフト配置表バブル（単一シフト案）
const ShiftPuzzlePlanEditorBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const shiftPlanId = bubble.params.shiftPlanId;

  const buildFilterUrl = (shiftId: string): string => {
    const filter: MemberFilterType = { availableFor: [shiftId] };
    return `shift-puzzle/members${stringifyMemberFilter(filter)}&originCell=${shiftId}`;
  };

  return (
    <ShiftPlanEditor
      shiftPlanId={shiftPlanId}
      onCellClick={(shiftId) => openBubble(buildFilterUrl(shiftId), bubble.id, 'origin-side')}
      onMemberViewClick={() => openBubble(`shift-puzzle/shift-plans/${shiftPlanId}/member-view`, bubble.id, 'origin-side')}
      buildCellUrl={buildFilterUrl}
    />
  );
};

// シフトパズル - 局員別シフト表バブル
const ShiftPuzzleMemberShiftTableBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const shiftPlanId = bubble.params.shiftPlanId;

  return (
    <MemberShiftTable
      shiftPlanId={shiftPlanId}
      onMemberClick={(memberId) => openBubble(buildMemberUrl(memberId), bubble.id, 'bubble-side')}
      onAssignmentClick={(planId, assignmentId) =>
        openBubble(`shift-puzzle/shift-plans/${planId}/assignments/${assignmentId}/evaluation`, bubble.id, 'origin-side')
      }
    />
  );
};

// シフトパズル - 配置評価バブル
const ShiftPuzzleAssignmentEvaluationBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { shiftPlanId, assignmentId } = bubble.params;
  return (
    <AssignmentEvaluation
      shiftPlanId={shiftPlanId}
      assignmentId={assignmentId}
      buildMemberDetailUrl={buildMemberUrl}
      buildMemberAvailabilityUrl={(memberId) => `shift-puzzle/members/${memberId}/availableShifts`}
    />
  );
};

// シフトパズル - 局員ガントビューバブル
const ShiftPuzzleGanttEditorBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const shiftPlanId = bubble.params.shiftPlanId;
  const initialDayType = (new URLSearchParams(getQuery(bubble.url)).get('dayType') ?? undefined) as DayType | undefined;

  const handleOpenTaskList = () => {
    const params = new URLSearchParams();
    if (initialDayType) params.set('dayTypes', initialDayType);
    params.set('shiftPlanId', shiftPlanId);
    openBubble(`shift-puzzle/tasks?${params.toString()}`, bubble.id, 'bubble-side');
  };

  return (
    <MemberGanttEditor
      shiftPlanId={shiftPlanId}
      initialDayType={initialDayType}
      onAssignmentClick={(assignmentId) =>
        openBubble(`shift-puzzle/shift-plans/${shiftPlanId}/assignments/${assignmentId}/evaluation`, bubble.id, 'origin-side')
      }
      onOpenTaskListClick={handleOpenTaskList}
      onTableViewClick={() => openBubble(`shift-puzzle/shift-plans/${shiftPlanId}`, bubble.id)}
    />
  );
};

// シフトパズル - シフト表リストバブル
const ShiftPuzzleShiftPlanListBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const buildPlanUrl = (planId: string) => `shift-puzzle/shift-plans/${planId}/primitive-gantt`;
  return (
    <ShiftPlanList
      onOpen={(planId) => openBubble(buildPlanUrl(planId), bubble.id, 'bubble-side')}
      buildPlanUrl={buildPlanUrl}
    />
  );
};

// シフトパズル - プリミティブガントエディタバブル（セルグリッド型・BlockListベース）
const ShiftPuzzlePrimitiveGanttEditorBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const shiftPlanId = bubble.params.shiftPlanId;

  const buildRunUrl = (shiftId: string) =>
    `shift-puzzle/shift-plans/${shiftPlanId}/shifts/${shiftId}/status`;
  const buildHistoryUrl = () => `shift-puzzle/shift-plans/${shiftPlanId}/history`;
  const buildTaskGanttUrl = () => `shift-puzzle/shift-plans/${shiftPlanId}/task-gantt`;

  return (
    <PrimitiveGanttEditor
      shiftPlanId={shiftPlanId}
      buildRunUrl={buildRunUrl}
      onAssignedRunOpen={(shiftId) => openBubble(buildRunUrl(shiftId), bubble.id, 'origin-side')}
      buildHistoryUrl={buildHistoryUrl}
      onHistoryOpen={() => openBubble(buildHistoryUrl(), bubble.id, 'bubble-side')}
      buildTaskGanttUrl={buildTaskGanttUrl}
      onTaskGanttOpen={() => openBubble(buildTaskGanttUrl(), bubble.id, 'bubble-side')}
      buildMemberUrl={buildMemberUrl}
      onMemberClick={(memberId) => openBubble(buildMemberUrl(memberId), bubble.id, 'bubble-side')}
    />
  );
};

// シフトパズル - シフト配置状況バブル（親：A+Bカード内包）
const ShiftPuzzleShiftStatusBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const { shiftPlanId, shiftId } = bubble.params;

  const buildMemberAvailabilityUrl = (memberId: string) =>
    `shift-puzzle/members/${memberId}/availableShifts?shiftPlanId=${shiftPlanId}`;

  return (
    <ShiftStatus
      shiftPlanId={shiftPlanId}
      shiftId={shiftId}
      variant="full"
      onExpandMembers={() =>
        openBubble(`shift-puzzle/shift-plans/${shiftPlanId}/shifts/${shiftId}/status/members`, bubble.id)
      }
      onExpandCoverage={() =>
        openBubble(`shift-puzzle/shift-plans/${shiftPlanId}/shifts/${shiftId}/status/coverage`, bubble.id)
      }
      buildMemberUrl={buildMemberUrl}
      buildMemberAvailabilityUrl={buildMemberAvailabilityUrl}
    />
  );
};

// シフトパズル - 配置メンバー単独バブル（Aの昇格先）
const ShiftPuzzleShiftStatusMembersBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { shiftPlanId, shiftId } = bubble.params;

  const buildMemberAvailabilityUrl = (memberId: string) =>
    `shift-puzzle/members/${memberId}/availableShifts?shiftPlanId=${shiftPlanId}`;

  return (
    <ShiftStatus
      shiftPlanId={shiftPlanId}
      shiftId={shiftId}
      variant="members-only"
      buildMemberUrl={buildMemberUrl}
      buildMemberAvailabilityUrl={buildMemberAvailabilityUrl}
    />
  );
};

// シフトパズル - 人数充足テトリス単独バブル（Bの昇格先）
const ShiftPuzzleShiftStatusCoverageBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { shiftPlanId, shiftId } = bubble.params;
  return <ShiftStatus shiftPlanId={shiftPlanId} shiftId={shiftId} variant="coverage-only" />;
};

// シフトパズル - タスク絞り込み検索バブル
const ShiftPuzzleTaskFilterBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const initialFilter = parseTaskFilter(getQuery(bubble.url));
  return <TaskFilter initialFilter={initialFilter} />;
};

// シフトパズル - タスク一覧バブル
const ShiftPuzzleTasksBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const query = getQuery(bubble.url);
  const shiftPlanId = new URLSearchParams(query).get('shiftPlanId') ?? undefined;
  const filter = parseTaskFilter(query);
  return <TaskCollection filter={filter} shiftPlanId={shiftPlanId} />;
};

// シフトパズル - タスク詳細バブル
const ShiftPuzzleTaskBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const plans = useAppSelector(selectShiftPuzzlePlans);

  // shiftId → planId の逆引きマップ（複数プランに同じshiftがある場合は最初のプランを優先）
  const shiftToPlanId = useMemo(() => {
    const map = new Map<string, string>();
    for (const plan of plans) {
      for (const shift of plan.shifts) {
        if (!map.has(shift.id)) map.set(shift.id, plan.id);
      }
    }
    return map;
  }, [plans]);

  const buildStatusUrl = (shiftId: string) => {
    const planId = shiftToPlanId.get(shiftId);
    return planId
      ? `shift-puzzle/shift-plans/${planId}/shifts/${shiftId}/status`
      : undefined;
  };

  return <TaskDetail taskId={bubble.params.taskId} buildStatusUrl={buildStatusUrl} />;
};

// シフトパズル - タスクガントエディタバブル（タスク軸×時間軸・メンバー配置）
const ShiftPuzzleTaskGanttEditorBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const shiftPlanId = bubble.params.shiftPlanId;

  const buildRunUrl = (shiftId: string) =>
    `shift-puzzle/shift-plans/${shiftPlanId}/shifts/${shiftId}/status`;
  const buildHistoryUrl = () => `shift-puzzle/shift-plans/${shiftPlanId}/history`;
  const buildTaskUrl = (taskId: string) => `shift-puzzle/tasks/${taskId}`;

  return (
    <TaskGanttEditor
      shiftPlanId={shiftPlanId}
      buildRunUrl={buildRunUrl}
      onAssignedRunOpen={(shiftId) => openBubble(buildRunUrl(shiftId), bubble.id, 'origin-side')}
      buildTaskUrl={buildTaskUrl}
      onTaskClick={(taskId) => openBubble(buildTaskUrl(taskId), bubble.id, 'bubble-side')}
      buildHistoryUrl={buildHistoryUrl}
      onHistoryOpen={() => openBubble(buildHistoryUrl(), bubble.id, 'bubble-side')}
      buildMemberUrl={buildMemberUrl}
      onMemberClick={(memberId) => openBubble(buildMemberUrl(memberId), bubble.id, 'bubble-side')}
    />
  );
};

// シフトパズル - 世界線履歴バブル
const ShiftPuzzleShiftPlanHistoryBubble: BubbleRoute["Component"] = ({ bubble }) => {
  return <ShiftPlanWorldLineGraphView planId={bubble.params.shiftPlanId} />;
};

/** シフトパズル機能のバブルルート定義 */
export const shiftPuzzleBubbleRoutes: BubbleRoute[] = [
  { pattern: "shift-puzzle/members/filter", type: "member-filter", Component: ShiftPuzzleMemberFilterBubble },
  { pattern: "shift-puzzle/members/:memberId/availableShifts", type: "member-availability", Component: ShiftPuzzleMemberAvailabilityBubble },
  { pattern: "shift-puzzle/members/:memberId", type: "member", Component: ShiftPuzzleMemberBubble },
  { pattern: "shift-puzzle/members", type: "member-list", Component: ShiftPuzzleMembersBubble },
  { pattern: "shift-puzzle/shift-plans/:shiftPlanId/member-view", type: "member-shift-table", Component: ShiftPuzzleMemberShiftTableBubble },
  { pattern: "shift-puzzle/shift-plans/:shiftPlanId/assignments/:assignmentId/evaluation", type: "assignment-evaluation", Component: ShiftPuzzleAssignmentEvaluationBubble },
  // ガントビュー（:shiftPlanIdの前に配置して優先マッチ）
  { pattern: "shift-puzzle/shift-plans/:shiftPlanId/gantt", type: "gantt-editor", Component: ShiftPuzzleGanttEditorBubble },
  { pattern: "shift-puzzle/shift-plans/:shiftPlanId/primitive-gantt", type: "primitive-gantt-editor", Component: ShiftPuzzlePrimitiveGanttEditorBubble },
  { pattern: "shift-puzzle/shift-plans/:shiftPlanId/task-gantt", type: "task-gantt-editor", Component: ShiftPuzzleTaskGanttEditorBubble },
  { pattern: "shift-puzzle/shift-plans/:shiftPlanId/history", type: "shift-plan-history", Component: ShiftPuzzleShiftPlanHistoryBubble },
  { pattern: "shift-puzzle/shift-plans", type: "shift-plan-list", Component: ShiftPuzzleShiftPlanListBubble },
  { pattern: "shift-puzzle/shift-plans/:shiftPlanId/shifts/:shiftId/status/members", type: "shift-status-members", Component: ShiftPuzzleShiftStatusMembersBubble },
  { pattern: "shift-puzzle/shift-plans/:shiftPlanId/shifts/:shiftId/status/coverage", type: "shift-status-coverage", Component: ShiftPuzzleShiftStatusCoverageBubble },
  { pattern: "shift-puzzle/shift-plans/:shiftPlanId/shifts/:shiftId/status", type: "shift-status", Component: ShiftPuzzleShiftStatusBubble },
  { pattern: "shift-puzzle/shift-plans/:shiftPlanId", type: "shift-plan", Component: ShiftPuzzlePlanEditorBubble },
  { pattern: "shift-puzzle/tasks/filter", type: "task-filter", Component: ShiftPuzzleTaskFilterBubble },
  { pattern: "shift-puzzle/tasks/:taskId", type: "task", Component: ShiftPuzzleTaskBubble },
  { pattern: "shift-puzzle/tasks", type: "task-list", Component: ShiftPuzzleTasksBubble },
];
