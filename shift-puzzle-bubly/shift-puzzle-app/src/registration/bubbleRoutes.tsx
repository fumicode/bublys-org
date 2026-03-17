"use client";

import { useContext } from "react";
import { BubbleRoute, BubblesContext } from "@bublys-org/bubbles-ui";
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
    openBubble(`shift-puzzle/members/${memberId}/availableTimeSlots`, bubble.id);
  };
  return <MemberDetail memberId={bubble.params.memberId} onOpenAvailability={handleOpenAvailability} />;
};

// シフトパズル - 局員参加可能時間帯バブル
const ShiftPuzzleMemberAvailabilityBubble: BubbleRoute["Component"] = ({ bubble }) => {
  return <MemberAvailability memberId={bubble.params.memberId} />;
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

  /** タスクと時間帯から局員フィルターURLを構築 */
  const buildFilterUrl = (timeSlotId: string, taskId: string): string => {
    const filter: MemberFilterType = {
      availableAt: [timeSlotId],
    };
    const query = stringifyMemberFilter(filter);
    const originCell = `&originCell=${timeSlotId}_${taskId}`;
    return `shift-puzzle/members${query}${originCell}`;
  };

  const handleCellClick = (timeSlotId: string, taskId: string) => {
    const url = buildFilterUrl(timeSlotId, taskId);
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

  /** タスクと時間帯から局員フィルターURLを構築 */
  const buildFilterUrl = (timeSlotId: string, taskId: string): string => {
    const filter: MemberFilterType = {
      availableAt: [timeSlotId],
    };
    const query = stringifyMemberFilter(filter);
    const originCell = `&originCell=${timeSlotId}_${taskId}`;
    return `shift-puzzle/members${query}${originCell}`;
  };

  const handleCellClick = (timeSlotId: string, taskId: string) => {
    const url = buildFilterUrl(timeSlotId, taskId);
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

  const handleTimeSlotClick = (memberId: string) => {
    openBubble(`shift-puzzle/members/${memberId}/availableTimeSlots`, bubble.id, "bubble-side");
  };

  const buildMemberDetailUrl = (memberId: string) => `shift-puzzle/members/${memberId}`;
  const buildMemberAvailabilityUrl = (memberId: string) => `shift-puzzle/members/${memberId}/availableTimeSlots`;

  return (
    <AssignmentEvaluation
      shiftPlanId={shiftPlanId}
      assignmentId={assignmentId}
      onMemberClick={handleMemberClick}
      onTimeSlotClick={handleTimeSlotClick}
      buildMemberDetailUrl={buildMemberDetailUrl}
      buildMemberAvailabilityUrl={buildMemberAvailabilityUrl}
    />
  );
};

/** シフトパズル機能のバブルルート定義 */
export const shiftPuzzleBubbleRoutes: BubbleRoute[] = [
  { pattern: "shift-puzzle/members/filter", type: "member-filter", Component: ShiftPuzzleMemberFilterBubble },
  { pattern: "shift-puzzle/members/:memberId/availableTimeSlots", type: "member-availability", Component: ShiftPuzzleMemberAvailabilityBubble },
  { pattern: "shift-puzzle/members/:memberId", type: "member", Component: ShiftPuzzleMemberBubble },
  { pattern: "shift-puzzle/members", type: "member-list", Component: ShiftPuzzleMembersBubble },
  { pattern: "shift-puzzle/shift-plans/:shiftPlanId/member-view", type: "member-shift-table", Component: ShiftPuzzleMemberShiftTableBubble },
  { pattern: "shift-puzzle/shift-plans/:shiftPlanId/assignments/:assignmentId/evaluation", type: "assignment-evaluation", Component: ShiftPuzzleAssignmentEvaluationBubble },
  { pattern: "shift-puzzle/shift-plans", type: "shift-plan-list", Component: ShiftPuzzlePlanManagerBubble },
  { pattern: "shift-puzzle/shift-plans/:shiftPlanId", type: "shift-plan", Component: ShiftPuzzlePlanEditorBubble },
];
