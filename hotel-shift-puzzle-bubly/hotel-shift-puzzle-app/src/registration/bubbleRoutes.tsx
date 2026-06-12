"use client";

import { useContext, useMemo } from "react";
import { BubbleRoute, BubblesContext } from "@bublys-org/bubbles-ui";
import { useAppSelector } from "@bublys-org/state-management";
import {
  MemberCollection,
  parseMemberFilter,
  MemberFilter,
  MemberDetail,
  MemberAvailability,
  TaskCollection,
  TaskFilter,
  TaskDetail,
  PrimitiveGanttEditor,
  TaskGanttEditor,
  ShiftPlanWorldLineGraphView,
  ShiftPlanList,
  ShiftStatus,
  parseTaskFilter,
  stringifyTaskFilter,
  selectHotelShiftPuzzlePlans,
} from "@bublys-org/hotel-shift-puzzle-libs";

// --- URLヘルパー ---
const getQuery = (url: string): string => {
  const i = url.indexOf('?');
  return i >= 0 ? url.slice(i + 1) : '';
};

const buildMemberUrl = (memberId: string) => `hotel-shift-puzzle/members/${memberId}`;

// シフトパズル - 局員絞り込み検索バブル
const HotelShiftPuzzleMemberFilterBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const initialFilter = parseMemberFilter(getQuery(bubble.url));
  return <MemberFilter initialFilter={initialFilter} />;
};

// シフトパズル - 局員一覧バブル（フィルター付き）
const HotelShiftPuzzleMembersBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const filter = parseMemberFilter(getQuery(bubble.url));
  return <MemberCollection filter={filter} />;
};

// シフトパズル - 局員詳細バブル
const HotelShiftPuzzleMemberBubble: BubbleRoute["Component"] = ({ bubble }) => {
  return <MemberDetail memberId={bubble.params.memberId} />;
};

// シフトパズル - 局員参加可能シフトバブル
const HotelShiftPuzzleMemberAvailabilityBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const shiftPlanId = new URLSearchParams(getQuery(bubble.url)).get('shiftPlanId') ?? undefined;
  return <MemberAvailability memberId={bubble.params.memberId} shiftPlanId={shiftPlanId} />;
};

// シフトパズル - シフト表リストバブル
const HotelShiftPuzzleShiftPlanListBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const buildPlanUrl = (planId: string) => `hotel-shift-puzzle/shift-plans/${planId}/primitive-gantt`;
  return (
    <ShiftPlanList
      onOpen={(planId) => openBubble(buildPlanUrl(planId), bubble.id, 'bubble-side')}
      buildPlanUrl={buildPlanUrl}
    />
  );
};

// シフトパズル - プリミティブガントエディタバブル（セルグリッド型・BlockListベース）
const HotelShiftPuzzlePrimitiveGanttEditorBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const shiftPlanId = bubble.params.shiftPlanId;

  const buildRunUrl = (shiftId: string) =>
    `hotel-shift-puzzle/shift-plans/${shiftPlanId}/shifts/${shiftId}/status`;
  const buildHistoryUrl = () => `hotel-shift-puzzle/shift-plans/${shiftPlanId}/history`;
  const buildTaskGanttUrl = () => `hotel-shift-puzzle/shift-plans/${shiftPlanId}/task-gantt`;

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
const HotelShiftPuzzleShiftStatusBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const { shiftPlanId, shiftId } = bubble.params;

  const buildMemberAvailabilityUrl = (memberId: string) =>
    `hotel-shift-puzzle/members/${memberId}/availableShifts?shiftPlanId=${shiftPlanId}`;

  return (
    <ShiftStatus
      shiftPlanId={shiftPlanId}
      shiftId={shiftId}
      variant="full"
      onExpandMembers={() =>
        openBubble(`hotel-shift-puzzle/shift-plans/${shiftPlanId}/shifts/${shiftId}/status/members`, bubble.id)
      }
      onExpandCoverage={() =>
        openBubble(`hotel-shift-puzzle/shift-plans/${shiftPlanId}/shifts/${shiftId}/status/coverage`, bubble.id)
      }
      buildMemberUrl={buildMemberUrl}
      buildMemberAvailabilityUrl={buildMemberAvailabilityUrl}
    />
  );
};

// シフトパズル - 配置メンバー単独バブル（Aの昇格先）
const HotelShiftPuzzleShiftStatusMembersBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { shiftPlanId, shiftId } = bubble.params;

  const buildMemberAvailabilityUrl = (memberId: string) =>
    `hotel-shift-puzzle/members/${memberId}/availableShifts?shiftPlanId=${shiftPlanId}`;

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
const HotelShiftPuzzleShiftStatusCoverageBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { shiftPlanId, shiftId } = bubble.params;
  return <ShiftStatus shiftPlanId={shiftPlanId} shiftId={shiftId} variant="coverage-only" />;
};

// シフトパズル - タスク絞り込み検索バブル
const HotelShiftPuzzleTaskFilterBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const initialFilter = parseTaskFilter(getQuery(bubble.url));
  return <TaskFilter initialFilter={initialFilter} />;
};

// シフトパズル - タスク一覧バブル
const HotelShiftPuzzleTasksBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const query = getQuery(bubble.url);
  const shiftPlanId = new URLSearchParams(query).get('shiftPlanId') ?? undefined;
  const filter = parseTaskFilter(query);
  return <TaskCollection filter={filter} shiftPlanId={shiftPlanId} />;
};

// シフトパズル - タスク詳細バブル
const HotelShiftPuzzleTaskBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const plans = useAppSelector(selectHotelShiftPuzzlePlans);

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
      ? `hotel-shift-puzzle/shift-plans/${planId}/shifts/${shiftId}/status`
      : undefined;
  };

  return <TaskDetail taskId={bubble.params.taskId} buildStatusUrl={buildStatusUrl} />;
};

// シフトパズル - タスクガントエディタバブル（タスク軸×時間軸・メンバー配置）
const HotelShiftPuzzleTaskGanttEditorBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const shiftPlanId = bubble.params.shiftPlanId;

  const buildRunUrl = (shiftId: string) =>
    `hotel-shift-puzzle/shift-plans/${shiftPlanId}/shifts/${shiftId}/status`;
  const buildHistoryUrl = () => `hotel-shift-puzzle/shift-plans/${shiftPlanId}/history`;
  const buildTaskUrl = (taskId: string) => `hotel-shift-puzzle/tasks/${taskId}`;

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
const HotelShiftPuzzleShiftPlanHistoryBubble: BubbleRoute["Component"] = ({ bubble }) => {
  return <ShiftPlanWorldLineGraphView planId={bubble.params.shiftPlanId} />;
};

/** シフトパズル機能のバブルルート定義 */
export const hotelShiftPuzzleBubbleRoutes: BubbleRoute[] = [
  { pattern: "hotel-shift-puzzle/members/filter", type: "member-filter", Component: HotelShiftPuzzleMemberFilterBubble },
  { pattern: "hotel-shift-puzzle/members/:memberId/availableShifts", type: "member-availability", Component: HotelShiftPuzzleMemberAvailabilityBubble },
  { pattern: "hotel-shift-puzzle/members/:memberId", type: "member", Component: HotelShiftPuzzleMemberBubble },
  { pattern: "hotel-shift-puzzle/members", type: "member-list", Component: HotelShiftPuzzleMembersBubble },
  { pattern: "hotel-shift-puzzle/shift-plans/:shiftPlanId/primitive-gantt", type: "primitive-gantt-editor", Component: HotelShiftPuzzlePrimitiveGanttEditorBubble },
  { pattern: "hotel-shift-puzzle/shift-plans/:shiftPlanId/task-gantt", type: "task-gantt-editor", Component: HotelShiftPuzzleTaskGanttEditorBubble },
  { pattern: "hotel-shift-puzzle/shift-plans/:shiftPlanId/history", type: "shift-plan-history", Component: HotelShiftPuzzleShiftPlanHistoryBubble },
  { pattern: "hotel-shift-puzzle/shift-plans", type: "shift-plan-list", Component: HotelShiftPuzzleShiftPlanListBubble },
  { pattern: "hotel-shift-puzzle/shift-plans/:shiftPlanId/shifts/:shiftId/status/members", type: "shift-status-members", Component: HotelShiftPuzzleShiftStatusMembersBubble },
  { pattern: "hotel-shift-puzzle/shift-plans/:shiftPlanId/shifts/:shiftId/status/coverage", type: "shift-status-coverage", Component: HotelShiftPuzzleShiftStatusCoverageBubble },
  { pattern: "hotel-shift-puzzle/shift-plans/:shiftPlanId/shifts/:shiftId/status", type: "shift-status", Component: HotelShiftPuzzleShiftStatusBubble },
  { pattern: "hotel-shift-puzzle/tasks/filter", type: "task-filter", Component: HotelShiftPuzzleTaskFilterBubble },
  { pattern: "hotel-shift-puzzle/tasks/:taskId", type: "task", Component: HotelShiftPuzzleTaskBubble },
  { pattern: "hotel-shift-puzzle/tasks", type: "task-list", Component: HotelShiftPuzzleTasksBubble },
];
