/**
 * shift-puzzle 固有のオブジェクト型をレジストリに登録する
 */
import { registerObjectType } from "@bublys-org/bubbles-ui";
import { getCurrentStore } from "@bublys-org/state-management";
import {
  ShiftPlan,
  type ShiftPlanState,
  type MemberState,
  Member,
} from "@bublys-org/shift-puzzle-model";
import { createDefaultTasks, createDefaultTimeSlots } from "./data/sampleData.js";
import PersonIcon from "@mui/icons-material/Person";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import AssignmentIcon from "@mui/icons-material/Assignment";
import React from "react";

// マスターデータ（静的）
const timeSlots = createDefaultTimeSlots();
const tasks = createDefaultTasks();

/**
 * ShiftAssignment の ID からラベルを解決する
 */
const resolveShiftAssignmentLabel = (assignmentId: string): string | undefined => {
  const store = getCurrentStore();
  if (!store) return undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const state = store.getState() as any;

  // シフト案からドメインオブジェクトを構築して配置を検索
  const shiftPlanStates: ShiftPlanState[] = state.shiftPlan?.shiftPlans ?? [];
  const plans = shiftPlanStates.map(s => new ShiftPlan(s));

  const assignment = plans
    .flatMap(plan => plan.assignments)
    .find(a => a.id === assignmentId);
  if (!assignment) return undefined;

  const timeSlot = timeSlots.find(t => t.id === assignment.timeSlotId);
  const task = tasks.find(t => t.id === assignment.roleId);

  // 局員名を解決
  const memberStateList: MemberState[] = state.shiftPuzzle?.memberList ?? [];
  const member = memberStateList
    .map(s => new Member(s))
    .find(m => m.id === assignment.staffId);
  const memberName = member?.name ?? "不明";

  const slotLabel = timeSlot?.label ?? "?";
  const taskName = task?.name ?? "?";

  return `${slotLabel}(${taskName})←${memberName}`;
};

registerObjectType('Member', React.createElement(PersonIcon, { fontSize: 'small' }));
registerObjectType('MemberAvailability', React.createElement(EventAvailableIcon, { fontSize: 'small' }));
registerObjectType('ShiftAssignment', {
  icon: React.createElement(AssignmentIcon, { fontSize: 'small' }),
  labelResolver: resolveShiftAssignmentLabel,
});
