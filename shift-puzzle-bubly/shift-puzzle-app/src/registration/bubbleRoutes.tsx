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
  ShiftPlanManager,
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

// シフトパズル - 局員絞り込み検索バブル
const ShiftPuzzleMemberFilterBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const queryIndex = bubble.url.indexOf('?');
  const query = queryIndex >= 0 ? bubble.url.slice(queryIndex + 1) : '';
  const initialFilter = parseMemberFilter(query);

  return <MemberFilter initialFilter={initialFilter} />;
};

// シフトパズル - 局員一覧バブル（フィルター付き）
const ShiftPuzzleMembersBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const handleMemberSelect = (memberId: string) => {
    openBubble(`shift-puzzle/members/${memberId}`, bubble.id);
  };

  const queryIndex = bubble.url.indexOf('?');
  const query = queryIndex >= 0 ? bubble.url.slice(queryIndex + 1) : '';
  const filter = parseMemberFilter(query);

  return <MemberCollection filter={filter} onMemberSelect={handleMemberSelect} />;
};

// シフトパズル - 局員詳細バブル
const ShiftPuzzleMemberBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const handleOpenAvailability = (memberId: string) => {
    openBubble(`shift-puzzle/members/${memberId}/availableShifts`, bubble.id);
  };
  return <MemberDetail memberId={bubble.params.memberId} onOpenAvailability={handleOpenAvailability} />;
};

// シフトパズル - 局員参加可能シフトバブル
const ShiftPuzzleMemberAvailabilityBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const queryIndex = bubble.url.indexOf('?');
  const query = queryIndex >= 0 ? bubble.url.slice(queryIndex + 1) : '';
  const shiftPlanId = new URLSearchParams(query).get('shiftPlanId') ?? undefined;
  return <MemberAvailability memberId={bubble.params.memberId} shiftPlanId={shiftPlanId} />;
};

// シフトパズル - シフト配置表バブル（単一シフト案）
const ShiftPuzzlePlanEditorBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const shiftPlanId = bubble.params.shiftPlanId;

  const handleAssignmentClick = (assignmentId: string) => {
    openBubble(`shift-puzzle/shift-plans/${shiftPlanId}/assignments/${assignmentId}/evaluation`, bubble.id, "origin-side");
  };

  const handleMemberViewClick = () => {
    openBubble(`shift-puzzle/shift-plans/${shiftPlanId}/member-view`, bubble.id, "origin-side");
  };

  /** シフトIDから局員フィルターURLを構築 */
  const buildFilterUrl = (shiftId: string): string => {
    const filter: MemberFilterType = {
      availableFor: [shiftId],
    };
    const query = stringifyMemberFilter(filter);
    const originCell = `&originCell=${shiftId}`;
    return `shift-puzzle/members${query}${originCell}`;
  };

  const handleCellClick = (shiftId: string) => {
    const url = buildFilterUrl(shiftId);
    openBubble(url, bubble.id, "origin-side");
  };

  return (
    <ShiftPlanEditor
      shiftPlanId={shiftPlanId}
      onAssignmentClick={handleAssignmentClick}
      onCellClick={handleCellClick}
      onMemberViewClick={handleMemberViewClick}
      buildCellUrl={buildFilterUrl}
    />
  );
};

// シフトパズル - シフト案マネージャー（複数シフト案）
const ShiftPuzzlePlanManagerBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);

  const handleAssignmentClick = (shiftPlanId: string, assignmentId: string) => {
    openBubble(`shift-puzzle/shift-plans/${shiftPlanId}/assignments/${assignmentId}/evaluation`, bubble.id, "origin-side");
  };

  const handleMemberViewClick = (shiftPlanId: string) => {
    openBubble(`shift-puzzle/shift-plans/${shiftPlanId}/member-view`, bubble.id, "origin-side");
  };

  /** シフトIDから局員フィルターURLを構築 */
  const buildFilterUrl = (shiftId: string): string => {
    const filter: MemberFilterType = {
      availableFor: [shiftId],
    };
    const query = stringifyMemberFilter(filter);
    const originCell = `&originCell=${shiftId}`;
    return `shift-puzzle/members${query}${originCell}`;
  };

  const handleCellClick = (shiftId: string) => {
    const url = buildFilterUrl(shiftId);
    openBubble(url, bubble.id, "origin-side");
  };

  return (
    <ShiftPlanManager
      onAssignmentClick={handleAssignmentClick}
      onCellClick={handleCellClick}
      buildCellUrl={buildFilterUrl}
      onMemberViewClick={handleMemberViewClick}
    />
  );
};

// シフトパズル - 局員別シフト表バブル
const ShiftPuzzleMemberShiftTableBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const shiftPlanId = bubble.params.shiftPlanId;

  const handleMemberClick = (memberId: string) => {
    openBubble(`shift-puzzle/members/${memberId}`, bubble.id, "bubble-side");
  };

  const handleAssignmentClick = (shiftPlanId: string, assignmentId: string) => {
    openBubble(`shift-puzzle/shift-plans/${shiftPlanId}/assignments/${assignmentId}/evaluation`, bubble.id, "origin-side");
  };

  return (
    <MemberShiftTable
      shiftPlanId={shiftPlanId}
      onMemberClick={handleMemberClick}
      onAssignmentClick={handleAssignmentClick}
    />
  );
};

// シフトパズル - 配置評価バブル
const ShiftPuzzleAssignmentEvaluationBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const { shiftPlanId, assignmentId } = bubble.params;

  const handleMemberClick = (memberId: string) => {
    openBubble(`shift-puzzle/members/${memberId}`, bubble.id, "bubble-side");
  };

  const handleShiftClick = (memberId: string) => {
    openBubble(`shift-puzzle/members/${memberId}/availableShifts`, bubble.id, "bubble-side");
  };

  const buildMemberDetailUrl = (memberId: string) => `shift-puzzle/members/${memberId}`;
  const buildMemberAvailabilityUrl = (memberId: string) => `shift-puzzle/members/${memberId}/availableShifts`;

  return (
    <AssignmentEvaluation
      shiftPlanId={shiftPlanId}
      assignmentId={assignmentId}
      onMemberClick={handleMemberClick}
      onTimeSlotClick={handleShiftClick}
      buildMemberDetailUrl={buildMemberDetailUrl}
      buildMemberAvailabilityUrl={buildMemberAvailabilityUrl}
    />
  );
};

// シフトパズル - 局員ガントビューバブル
const ShiftPuzzleGanttEditorBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const shiftPlanId = bubble.params.shiftPlanId;

  const queryIndex = bubble.url.indexOf('?');
  const query = queryIndex >= 0 ? bubble.url.slice(queryIndex + 1) : '';
  const params = new URLSearchParams(query);
  const initialDayType = (params.get('dayType') ?? undefined) as DayType | undefined;

  const handleAssignmentClick = (assignmentId: string) => {
    openBubble(
      `shift-puzzle/shift-plans/${shiftPlanId}/assignments/${assignmentId}/evaluation`,
      bubble.id,
      'origin-side',
    );
  };

  const handleOpenTaskList = () => {
    const params = new URLSearchParams();
    if (initialDayType) params.set('dayTypes', initialDayType);
    params.set('shiftPlanId', shiftPlanId);
    openBubble(`shift-puzzle/tasks?${params.toString()}`, bubble.id, 'bubble-side');
  };

  const handleTableView = () => {
    openBubble(`shift-puzzle/shift-plans/${shiftPlanId}`, bubble.id);
  };

  return (
    <MemberGanttEditor
      shiftPlanId={shiftPlanId}
      initialDayType={initialDayType}
      onAssignmentClick={handleAssignmentClick}
      onOpenTaskListClick={handleOpenTaskList}
      onTableViewClick={handleTableView}
    />
  );
};

// シフトパズル - シフト表リストバブル
const ShiftPuzzleShiftPlanListBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const buildPlanUrl = (planId: string) => `shift-puzzle/shift-plans/${planId}/primitive-gantt`;
  const handleOpen = (planId: string) => {
    openBubble(buildPlanUrl(planId), bubble.id, 'bubble-side');
  };
  return <ShiftPlanList onOpen={handleOpen} buildPlanUrl={buildPlanUrl} />;
};

// シフトパズル - プリミティブガントエディタバブル（セルグリッド型・BlockListベース）
const ShiftPuzzlePrimitiveGanttEditorBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const shiftPlanId = bubble.params.shiftPlanId;

  const buildRunUrl = (shiftId: string) =>
    `shift-puzzle/shift-plans/${shiftPlanId}/shifts/${shiftId}/status`;

  const handleAssignedRunOpen = (shiftId: string) => {
    openBubble(buildRunUrl(shiftId), bubble.id, 'origin-side');
  };

  const buildHistoryUrl = () => `shift-puzzle/shift-plans/${shiftPlanId}/history`;

  const handleHistoryOpen = () => {
    openBubble(buildHistoryUrl(), bubble.id, 'bubble-side');
  };

  const buildTaskGanttUrl = () => `shift-puzzle/shift-plans/${shiftPlanId}/task-gantt`;

  const handleTaskGanttOpen = () => {
    openBubble(buildTaskGanttUrl(), bubble.id, 'bubble-side');
  };

  const buildMemberUrl = (memberId: string) => `shift-puzzle/members/${memberId}`;

  const handleMemberClick = (memberId: string) => {
    openBubble(buildMemberUrl(memberId), bubble.id, 'bubble-side');
  };

  return (
    <PrimitiveGanttEditor
      shiftPlanId={shiftPlanId}
      onAssignedRunOpen={handleAssignedRunOpen}
      buildRunUrl={buildRunUrl}
      onHistoryOpen={handleHistoryOpen}
      buildHistoryUrl={buildHistoryUrl}
      onTaskGanttOpen={handleTaskGanttOpen}
      buildTaskGanttUrl={buildTaskGanttUrl}
      onMemberClick={handleMemberClick}
      buildMemberUrl={buildMemberUrl}
    />
  );
};

// シフトパズル - シフト配置状況バブル（親：A+Bカード内包）
const ShiftPuzzleShiftStatusBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const { shiftPlanId, shiftId } = bubble.params;

  const handleExpandMembers = () => {
    openBubble(
      `shift-puzzle/shift-plans/${shiftPlanId}/shifts/${shiftId}/status/members`,
      bubble.id,
    );
  };
  const handleExpandCoverage = () => {
    openBubble(
      `shift-puzzle/shift-plans/${shiftPlanId}/shifts/${shiftId}/status/coverage`,
      bubble.id,
    );
  };
  const buildMemberUrl = (memberId: string) => `shift-puzzle/members/${memberId}`;
  const buildMemberAvailabilityUrl = (memberId: string) =>
    `shift-puzzle/members/${memberId}/availableShifts?shiftPlanId=${shiftPlanId}`;
  const handleMemberClick = (memberId: string) => {
    openBubble(buildMemberUrl(memberId), bubble.id, 'bubble-side');
  };
  const handleAvailabilityClick = (memberId: string) => {
    openBubble(buildMemberAvailabilityUrl(memberId), bubble.id, 'bubble-side');
  };

  return (
    <ShiftStatus
      shiftPlanId={shiftPlanId}
      shiftId={shiftId}
      variant="full"
      onExpandMembers={handleExpandMembers}
      onExpandCoverage={handleExpandCoverage}
      buildMemberUrl={buildMemberUrl}
      buildMemberAvailabilityUrl={buildMemberAvailabilityUrl}
      onMemberClick={handleMemberClick}
      onAvailabilityClick={handleAvailabilityClick}
    />
  );
};

// シフトパズル - 配置メンバー単独バブル（Aの昇格先）
const ShiftPuzzleShiftStatusMembersBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const { shiftPlanId, shiftId } = bubble.params;

  const buildMemberUrl = (memberId: string) => `shift-puzzle/members/${memberId}`;
  const buildMemberAvailabilityUrl = (memberId: string) =>
    `shift-puzzle/members/${memberId}/availableShifts?shiftPlanId=${shiftPlanId}`;
  const handleMemberClick = (memberId: string) => {
    openBubble(buildMemberUrl(memberId), bubble.id, 'bubble-side');
  };
  const handleAvailabilityClick = (memberId: string) => {
    openBubble(buildMemberAvailabilityUrl(memberId), bubble.id, 'bubble-side');
  };

  return (
    <ShiftStatus
      shiftPlanId={shiftPlanId}
      shiftId={shiftId}
      variant="members-only"
      buildMemberUrl={buildMemberUrl}
      buildMemberAvailabilityUrl={buildMemberAvailabilityUrl}
      onMemberClick={handleMemberClick}
      onAvailabilityClick={handleAvailabilityClick}
    />
  );
};

// シフトパズル - 人数充足テトリス単独バブル（Bの昇格先）
const ShiftPuzzleShiftStatusCoverageBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { shiftPlanId, shiftId } = bubble.params;
  return (
    <ShiftStatus
      shiftPlanId={shiftPlanId}
      shiftId={shiftId}
      variant="coverage-only"
    />
  );
};

// シフトパズル - タスク絞り込み検索バブル
const ShiftPuzzleTaskFilterBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const queryIndex = bubble.url.indexOf('?');
  const query = queryIndex >= 0 ? bubble.url.slice(queryIndex + 1) : '';
  const initialFilter = parseTaskFilter(query);
  return <TaskFilter initialFilter={initialFilter} />;
};

// シフトパズル - タスク一覧バブル
const ShiftPuzzleTasksBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);

  const queryIndex = bubble.url.indexOf('?');
  const query = queryIndex >= 0 ? bubble.url.slice(queryIndex + 1) : '';
  const shiftPlanId = new URLSearchParams(query).get('shiftPlanId') ?? undefined;
  const filter = parseTaskFilter(query); // shiftPlanId は parseTaskFilter に無視される

  const handleTaskSelect = (taskId: string) => {
    const suffix = shiftPlanId ? `?shiftPlanId=${shiftPlanId}` : '';
    openBubble(`shift-puzzle/tasks/${taskId}${suffix}`, bubble.id);
  };

  return (
    <TaskCollection filter={filter} shiftPlanId={shiftPlanId} onTaskSelect={handleTaskSelect} />
  );
};

// シフトパズル - タスク詳細バブル
const ShiftPuzzleTaskBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const plans = useAppSelector(selectShiftPuzzlePlans);

  // shiftId → planId の逆引きマップ（全プランを検索、複数プランに同じshiftがある場合は最初のプランを優先）
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

  const handleSlotClick = (shiftId: string) => {
    const planId = shiftToPlanId.get(shiftId);
    if (!planId) return;
    openBubble(
      `shift-puzzle/shift-plans/${planId}/shifts/${shiftId}/status`,
      bubble.id,
      'origin-side',
    );
  };

  return (
    <TaskDetail
      taskId={bubble.params.taskId}
      buildStatusUrl={buildStatusUrl}
      onSlotClick={handleSlotClick}
    />
  );
};

// シフトパズル - タスクガントエディタバブル（タスク軸×時間軸・メンバー配置）
const ShiftPuzzleTaskGanttEditorBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const shiftPlanId = bubble.params.shiftPlanId;

  const buildRunUrl = (shiftId: string) =>
    `shift-puzzle/shift-plans/${shiftPlanId}/shifts/${shiftId}/status`;

  const handleAssignedRunOpen = (shiftId: string) => {
    openBubble(buildRunUrl(shiftId), bubble.id, 'origin-side');
  };

  const buildHistoryUrl = () => `shift-puzzle/shift-plans/${shiftPlanId}/history`;
  const handleHistoryOpen = () => {
    openBubble(buildHistoryUrl(), bubble.id, 'bubble-side');
  };

  const buildTaskUrl = (taskId: string) => `shift-puzzle/tasks/${taskId}`;
  const handleTaskClick = (taskId: string) => {
    openBubble(buildTaskUrl(taskId), bubble.id, 'bubble-side');
  };

  const buildMemberUrl = (memberId: string) => `shift-puzzle/members/${memberId}`;
  const handleMemberClick = (memberId: string) => {
    openBubble(buildMemberUrl(memberId), bubble.id, 'bubble-side');
  };

  return (
    <TaskGanttEditor
      shiftPlanId={shiftPlanId}
      onAssignedRunOpen={handleAssignedRunOpen}
      buildRunUrl={buildRunUrl}
      onTaskClick={handleTaskClick}
      buildTaskUrl={buildTaskUrl}
      onHistoryOpen={handleHistoryOpen}
      buildHistoryUrl={buildHistoryUrl}
      onMemberClick={handleMemberClick}
      buildMemberUrl={buildMemberUrl}
    />
  );
};

// シフトパズル - 世界線履歴バブル
const ShiftPuzzleShiftPlanHistoryBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const shiftPlanId = bubble.params.shiftPlanId;
  return <ShiftPlanWorldLineGraphView planId={shiftPlanId} />;
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
