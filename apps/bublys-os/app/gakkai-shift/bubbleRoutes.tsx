"use client";

import { useContext } from "react";
import { BubbleRoute } from "../bubble-ui/BubblesUI/domain/bubbleRoutes";
import { BubblesContext } from "../bubble-ui/BubblesUI/domain/BubblesContext";
import { StaffCollection } from "./feature/StaffCollection";
import { StaffDetail } from "./feature/StaffDetail";
import { StaffAvailability } from "./feature/StaffAvailability";
import { ShiftPlanEditor } from "./feature/ShiftPlanEditor";
import { ShiftPlanManager } from "./feature/ShiftPlanManager";
import { AssignmentEvaluation } from "./feature/AssignmentEvaluation";

// 学会シフト - スタッフ一覧バブル
const GakkaiShiftStaffsBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const handleStaffSelect = (staffId: string) => {
    openBubble(`gakkai-shift/staffs/${staffId}`, bubble.id);
  };
  return <StaffCollection onStaffSelect={handleStaffSelect} />;
};

// 学会シフト - スタッフ詳細バブル
const GakkaiShiftStaffBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const staffId = bubble.url.replace("gakkai-shift/staffs/", "");
  const { openBubble } = useContext(BubblesContext);
  const handleOpenAvailability = (staffId: string) => {
    openBubble(`gakkai-shift/staffs/${staffId}/availableTimeSlots`, bubble.id);
  };
  return <StaffDetail staffId={staffId} onOpenAvailability={handleOpenAvailability} />;
};

// 学会シフト - スタッフ参加可能時間帯バブル
const GakkaiShiftStaffAvailabilityBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const staffId = bubble.url.replace("gakkai-shift/staffs/", "").replace("/availableTimeSlots", "");
  return <StaffAvailability staffId={staffId} />;
};

// 学会シフト - シフト配置表バブル（単一シフト案）
const GakkaiShiftPlanEditorBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  // URL: gakkai-shift/shift-plan/[shiftPlanId]
  const shiftPlanId = bubble.url.replace("gakkai-shift/shift-plan/", "");
  const handleStaffClick = (staffId: string) => {
    openBubble(`gakkai-shift/staffs/${staffId}`, bubble.id, "origin-side");
  };
  const handleAssignmentClick = (assignmentId: string) => {
    openBubble(`gakkai-shift/shift-plans/${shiftPlanId}/assignments/${assignmentId}/evaluation`, bubble.id, "origin-side");
  };
  return <ShiftPlanEditor shiftPlanId={shiftPlanId} onStaffClick={handleStaffClick} onAssignmentClick={handleAssignmentClick} />;
};

// 学会シフト - シフト案マネージャー（複数シフト案）
const GakkaiShiftPlanManagerBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const handleStaffClick = (staffId: string) => {
    openBubble(`gakkai-shift/staffs/${staffId}`, bubble.id, "origin-side");
  };
  const handleAssignmentClick = (shiftPlanId: string, assignmentId: string) => {
    openBubble(`gakkai-shift/shift-plans/${shiftPlanId}/assignments/${assignmentId}/evaluation`, bubble.id, "origin-side");
  };
  return <ShiftPlanManager onStaffClick={handleStaffClick} onAssignmentClick={handleAssignmentClick} />;
};

// 学会シフト - 配置評価バブル
const GakkaiShiftAssignmentEvaluationBubble: BubbleRoute["Component"] = ({ bubble }) => {
  // URL: gakkai-shift/shift-plans/[shiftPlanId]/assignments/[assignmentId]/evaluation
  const match = bubble.url.match(/^gakkai-shift\/shift-plans\/([^/]+)\/assignments\/([^/]+)\/evaluation$/);
  const shiftPlanId = match?.[1] ?? "";
  const assignmentId = match?.[2] ?? "";
  return <AssignmentEvaluation shiftPlanId={shiftPlanId} assignmentId={assignmentId} />;
};

/** 学会シフト機能のバブルルート定義 */
export const gakkaiShiftBubbleRoutes: BubbleRoute[] = [
  { pattern: /^gakkai-shift\/staffs$/, type: "gakkai-shift-staffs", Component: GakkaiShiftStaffsBubble },
  { pattern: /^gakkai-shift\/staffs\/[^/]+\/availableTimeSlots$/, type: "gakkai-shift-staff-availability", Component: GakkaiShiftStaffAvailabilityBubble },
  { pattern: /^gakkai-shift\/staffs\/[^/]+$/, type: "gakkai-shift-staff", Component: GakkaiShiftStaffBubble },
  { pattern: /^gakkai-shift\/shift-plans$/, type: "gakkai-shift-plans", Component: GakkaiShiftPlanManagerBubble },
  { pattern: /^gakkai-shift\/shift-plans\/[^/]+\/assignments\/[^/]+\/evaluation$/, type: "gakkai-shift-assignment-evaluation", Component: GakkaiShiftAssignmentEvaluationBubble },
  { pattern: /^gakkai-shift\/shift-plan\/[^/]+$/, type: "gakkai-shift-plan", Component: GakkaiShiftPlanEditorBubble },
];
