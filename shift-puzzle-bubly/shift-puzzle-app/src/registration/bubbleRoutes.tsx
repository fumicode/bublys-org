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
} from "@bublys-org/gakkai-shift-libs";

// 学会シフト - スタッフ絞り込み検索バブル
const GakkaiShiftStaffFilterBubble: BubbleRoute["Component"] = ({ bubble }) => {
  // URLからクエリ文字列を抽出してフィルターをパース（既存の条件を復元）
  const queryIndex = bubble.url.indexOf('?');
  const query = queryIndex >= 0 ? bubble.url.slice(queryIndex + 1) : '';
  const initialFilter = parseStaffFilter(query);

  return <StaffFilter initialFilter={initialFilter} />;
};

// 学会シフト - スタッフ一覧バブル（フィルター付き）
const GakkaiShiftStaffsBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const handleStaffSelect = (staffId: string) => {
    openBubble(`gakkai-shift/staffs/${staffId}`, bubble.id);
  };

  // URLからクエリ文字列を抽出してフィルターをパース
  const queryIndex = bubble.url.indexOf('?');
  const query = queryIndex >= 0 ? bubble.url.slice(queryIndex + 1) : '';
  const filter = parseStaffFilter(query);

  return <StaffCollection filter={filter} onStaffSelect={handleStaffSelect} />;
};

// 学会シフト - スタッフ詳細バブル
const GakkaiShiftStaffBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const handleOpenAvailability = (staffId: string) => {
    openBubble(`gakkai-shift/staffs/${staffId}/availableTimeSlots`, bubble.id);
  };
  return <StaffDetail staffId={bubble.params.staffId} onOpenAvailability={handleOpenAvailability} />;
};

// 学会シフト - スタッフ参加可能時間帯バブル
const GakkaiShiftStaffAvailabilityBubble: BubbleRoute["Component"] = ({ bubble }) => {
  return <StaffAvailability staffId={bubble.params.staffId} />;
};

// 学会シフト - シフト配置表バブル（単一シフト案）
const GakkaiShiftPlanEditorBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const shiftPlanId = bubble.params.shiftPlanId;
  const roles = Role_係.createDefaultRoles();

  const handleAssignmentClick = (assignmentId: string) => {
    openBubble(`gakkai-shift/shift-plans/${shiftPlanId}/assignments/${assignmentId}/evaluation`, bubble.id, "origin-side");
  };

  const handleStaffViewClick = () => {
    openBubble(`gakkai-shift/shift-plans/${shiftPlanId}/staff-view`, bubble.id, "origin-side");
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
    return `gakkai-shift/staffs${query}${originCell}`;
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

// 学会シフト - シフト案マネージャー（複数シフト案）
const GakkaiShiftPlanManagerBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const roles = Role_係.createDefaultRoles();

  const handleAssignmentClick = (shiftPlanId: string, assignmentId: string) => {
    openBubble(`gakkai-shift/shift-plans/${shiftPlanId}/assignments/${assignmentId}/evaluation`, bubble.id, "origin-side");
  };

  const handleStaffViewClick = (shiftPlanId: string) => {
    openBubble(`gakkai-shift/shift-plans/${shiftPlanId}/staff-view`, bubble.id, "origin-side");
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
    return `gakkai-shift/staffs${query}${originCell}`;
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

// 学会シフト - スタッフ別シフト表バブル
const GakkaiShiftStaffShiftTableBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const shiftPlanId = bubble.params.shiftPlanId;

  const handleStaffClick = (staffId: string) => {
    openBubble(`gakkai-shift/staffs/${staffId}`, bubble.id, "bubble-side");
  };

  const handleAssignmentClick = (shiftPlanId: string, assignmentId: string) => {
    openBubble(`gakkai-shift/shift-plans/${shiftPlanId}/assignments/${assignmentId}/evaluation`, bubble.id, "origin-side");
  };

  return (
    <StaffShiftTable
      shiftPlanId={shiftPlanId}
      onStaffClick={handleStaffClick}
      onAssignmentClick={handleAssignmentClick}
    />
  );
};

// 学会シフト - 配置評価バブル
const GakkaiShiftAssignmentEvaluationBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const { shiftPlanId, assignmentId } = bubble.params;

  const handleStaffClick = (staffId: string) => {
    openBubble(`gakkai-shift/staffs/${staffId}`, bubble.id, "bubble-side");
  };

  const handleTimeSlotClick = (staffId: string) => {
    openBubble(`gakkai-shift/staffs/${staffId}/availableTimeSlots`, bubble.id, "bubble-side");
  };

  const buildStaffDetailUrl = (staffId: string) => `gakkai-shift/staffs/${staffId}`;
  const buildStaffAvailabilityUrl = (staffId: string) => `gakkai-shift/staffs/${staffId}/availableTimeSlots`;

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

/** 学会シフト機能のバブルルート定義 */
export const gakkaiShiftBubbleRoutes: BubbleRoute[] = [
  { pattern: "gakkai-shift/staffs/filter", type: "gakkai-shift-staff-filter", Component: GakkaiShiftStaffFilterBubble },
  { pattern: "gakkai-shift/staffs/:staffId/availableTimeSlots", type: "gakkai-shift-staff-availability", Component: GakkaiShiftStaffAvailabilityBubble },
  { pattern: "gakkai-shift/staffs/:staffId", type: "gakkai-shift-staff", Component: GakkaiShiftStaffBubble },
  { pattern: "gakkai-shift/staffs", type: "gakkai-shift-staffs", Component: GakkaiShiftStaffsBubble },
  { pattern: "gakkai-shift/shift-plans/:shiftPlanId/staff-view", type: "gakkai-shift-staff-view", Component: GakkaiShiftStaffShiftTableBubble },
  { pattern: "gakkai-shift/shift-plans/:shiftPlanId/assignments/:assignmentId/evaluation", type: "gakkai-shift-assignment-evaluation", Component: GakkaiShiftAssignmentEvaluationBubble },
  { pattern: "gakkai-shift/shift-plans", type: "gakkai-shift-plans", Component: GakkaiShiftPlanManagerBubble },
  { pattern: "gakkai-shift/shift-plan/:shiftPlanId", type: "gakkai-shift-plan", Component: GakkaiShiftPlanEditorBubble },
];
