"use client";

import { useContext } from "react";
import { BubbleRoute, BubblesContext } from "@bublys-org/bubbles-ui";
import {
  StaffCollection,
  parseStaffFilter,
  stringifyStaffFilter,
  StaffFilterCriteria as StaffFilterType,
  Role_係,
  StaffFilter,
  StaffDetail,
  StaffAvailability,
  ShiftPlanEditor,
  ShiftPlanManager,
  AssignmentEvaluation,
  StaffShiftTable,
} from "@bublys-org/shift-puzzle-libs";

// シフトパズル - スタッフ絞り込み検索バブル
const ShiftPuzzleStaffFilterBubble: BubbleRoute["Component"] = ({ bubble }) => {
  // URLからクエリ文字列を抽出してフィルターをパース（既存の条件を復元）
  const queryIndex = bubble.url.indexOf('?');
  const query = queryIndex >= 0 ? bubble.url.slice(queryIndex + 1) : '';
  const initialFilter = parseStaffFilter(query);

  return <StaffFilter initialFilter={initialFilter} />;
};

// シフトパズル - スタッフ一覧バブル（フィルター付き）
const ShiftPuzzleStaffsBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const handleStaffSelect = (staffId: string) => {
    openBubble(`shift-puzzle/staffs/${staffId}`, bubble.id);
  };

  // URLからクエリ文字列を抽出してフィルターをパース
  const queryIndex = bubble.url.indexOf('?');
  const query = queryIndex >= 0 ? bubble.url.slice(queryIndex + 1) : '';
  const filter = parseStaffFilter(query);

  return <StaffCollection filter={filter} onStaffSelect={handleStaffSelect} />;
};

// シフトパズル - スタッフ詳細バブル
const ShiftPuzzleStaffBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const handleOpenAvailability = (staffId: string) => {
    openBubble(`shift-puzzle/staffs/${staffId}/availableTimeSlots`, bubble.id);
  };
  return <StaffDetail staffId={bubble.params.staffId} onOpenAvailability={handleOpenAvailability} />;
};

// シフトパズル - スタッフ参加可能時間帯バブル
const ShiftPuzzleStaffAvailabilityBubble: BubbleRoute["Component"] = ({ bubble }) => {
  return <StaffAvailability staffId={bubble.params.staffId} />;
};

// シフトパズル - シフト配置表バブル（単一シフト案）
const ShiftPuzzlePlanEditorBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const shiftPlanId = bubble.params.shiftPlanId;
  const roles = Role_係.createDefaultRoles();

  const handleAssignmentClick = (assignmentId: string) => {
    openBubble(`shift-puzzle/shift-plans/${shiftPlanId}/assignments/${assignmentId}/evaluation`, bubble.id, "origin-side");
  };

  const handleStaffViewClick = () => {
    openBubble(`shift-puzzle/shift-plans/${shiftPlanId}/staff-view`, bubble.id, "origin-side");
  };

  /** 係と時間帯からフィルターURLを構築（originCell付きで一意にする） */
  const buildFilterUrl = (timeSlotId: string, roleId: string): string => {
    const role = roles.find((r) => r.id === roleId);

    const filter: StaffFilterType = {};
    if (role) {
      const requirements = role.requirements;
      if (requirements.minPcSkill) {
        filter.pc = { level: requirements.minPcSkill, operator: '>=' };
      }
      if (requirements.minZoomSkill) {
        filter.zoom = { level: requirements.minZoomSkill, operator: '>=' };
      }
      if (requirements.requireEnglish) {
        filter.english = true;
      }
      if (requirements.requireEventExperience) {
        filter.eventExperience = true;
      }
    }
    filter.availableAt = [timeSlotId];

    const query = stringifyStaffFilter(filter);
    // originCellを追加してURLを一意にする（getOriginRect用）
    const originCell = `&originCell=${timeSlotId}_${roleId}`;
    return `shift-puzzle/staffs${query}${originCell}`;
  };

  const handleCellClick = (timeSlotId: string, roleId: string) => {
    const url = buildFilterUrl(timeSlotId, roleId);
    openBubble(url, bubble.id, "origin-side");
  };

  return (
    <ShiftPlanEditor
      shiftPlanId={shiftPlanId}
      onAssignmentClick={handleAssignmentClick}
      onCellClick={handleCellClick}
      onStaffViewClick={handleStaffViewClick}
      buildCellUrl={buildFilterUrl}
    />
  );
};

// シフトパズル - シフト案マネージャー（複数シフト案）
const ShiftPuzzlePlanManagerBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const roles = Role_係.createDefaultRoles();

  const handleAssignmentClick = (shiftPlanId: string, assignmentId: string) => {
    openBubble(`shift-puzzle/shift-plans/${shiftPlanId}/assignments/${assignmentId}/evaluation`, bubble.id, "origin-side");
  };

  const handleStaffViewClick = (shiftPlanId: string) => {
    openBubble(`shift-puzzle/shift-plans/${shiftPlanId}/staff-view`, bubble.id, "origin-side");
  };

  /** 係と時間帯からフィルターURLを構築（originCell付きで一意にする） */
  const buildFilterUrl = (timeSlotId: string, roleId: string): string => {
    const role = roles.find((r) => r.id === roleId);

    const filter: StaffFilterType = {};
    if (role) {
      const requirements = role.requirements;
      if (requirements.minPcSkill) {
        filter.pc = { level: requirements.minPcSkill, operator: '>=' };
      }
      if (requirements.minZoomSkill) {
        filter.zoom = { level: requirements.minZoomSkill, operator: '>=' };
      }
      if (requirements.requireEnglish) {
        filter.english = true;
      }
      if (requirements.requireEventExperience) {
        filter.eventExperience = true;
      }
    }
    filter.availableAt = [timeSlotId];

    const query = stringifyStaffFilter(filter);
    // originCellを追加してURLを一意にする（getOriginRect用）
    const originCell = `&originCell=${timeSlotId}_${roleId}`;
    return `shift-puzzle/staffs${query}${originCell}`;
  };

  const handleCellClick = (timeSlotId: string, roleId: string) => {
    const url = buildFilterUrl(timeSlotId, roleId);
    openBubble(url, bubble.id, "origin-side");
  };

  return (
    <ShiftPlanManager
      onAssignmentClick={handleAssignmentClick}
      onCellClick={handleCellClick}
      buildCellUrl={buildFilterUrl}
      onStaffViewClick={handleStaffViewClick}
    />
  );
};

// シフトパズル - スタッフ別シフト表バブル
const ShiftPuzzleStaffShiftTableBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const shiftPlanId = bubble.params.shiftPlanId;

  const handleStaffClick = (staffId: string) => {
    openBubble(`shift-puzzle/staffs/${staffId}`, bubble.id, "bubble-side");
  };

  const handleAssignmentClick = (shiftPlanId: string, assignmentId: string) => {
    openBubble(`shift-puzzle/shift-plans/${shiftPlanId}/assignments/${assignmentId}/evaluation`, bubble.id, "origin-side");
  };

  return (
    <StaffShiftTable
      shiftPlanId={shiftPlanId}
      onStaffClick={handleStaffClick}
      onAssignmentClick={handleAssignmentClick}
    />
  );
};

// シフトパズル - 配置評価バブル
const ShiftPuzzleAssignmentEvaluationBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const { shiftPlanId, assignmentId } = bubble.params;

  const handleStaffClick = (staffId: string) => {
    openBubble(`shift-puzzle/staffs/${staffId}`, bubble.id, "bubble-side");
  };

  const handleTimeSlotClick = (staffId: string) => {
    openBubble(`shift-puzzle/staffs/${staffId}/availableTimeSlots`, bubble.id, "bubble-side");
  };

  const buildStaffDetailUrl = (staffId: string) => `shift-puzzle/staffs/${staffId}`;
  const buildStaffAvailabilityUrl = (staffId: string) => `shift-puzzle/staffs/${staffId}/availableTimeSlots`;

  return (
    <AssignmentEvaluation
      shiftPlanId={shiftPlanId}
      assignmentId={assignmentId}
      onStaffClick={handleStaffClick}
      onTimeSlotClick={handleTimeSlotClick}
      buildStaffDetailUrl={buildStaffDetailUrl}
      buildStaffAvailabilityUrl={buildStaffAvailabilityUrl}
    />
  );
};

/** シフトパズル機能のバブルルート定義 */
export const shiftPuzzleBubbleRoutes: BubbleRoute[] = [
  { pattern: "shift-puzzle/staffs/filter", type: "shift-puzzle-staff-filter", Component: ShiftPuzzleStaffFilterBubble },
  { pattern: "shift-puzzle/staffs/:staffId/availableTimeSlots", type: "shift-puzzle-staff-availability", Component: ShiftPuzzleStaffAvailabilityBubble },
  { pattern: "shift-puzzle/staffs/:staffId", type: "shift-puzzle-staff", Component: ShiftPuzzleStaffBubble },
  { pattern: "shift-puzzle/staffs", type: "shift-puzzle-staffs", Component: ShiftPuzzleStaffsBubble },
  { pattern: "shift-puzzle/shift-plans/:shiftPlanId/staff-view", type: "shift-puzzle-staff-view", Component: ShiftPuzzleStaffShiftTableBubble },
  { pattern: "shift-puzzle/shift-plans/:shiftPlanId/assignments/:assignmentId/evaluation", type: "shift-puzzle-assignment-evaluation", Component: ShiftPuzzleAssignmentEvaluationBubble },
  { pattern: "shift-puzzle/shift-plans", type: "shift-puzzle-plans", Component: ShiftPuzzlePlanManagerBubble },
  { pattern: "shift-puzzle/shift-plan/:shiftPlanId", type: "shift-puzzle-plan", Component: ShiftPuzzlePlanEditorBubble },
];
