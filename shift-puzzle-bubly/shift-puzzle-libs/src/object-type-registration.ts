/**
 * gakkai-shift 固有のオブジェクト型をレジストリに登録する
 */
import { registerObjectType } from "@bublys-org/bubbles-ui";
import { getCurrentStore } from "@bublys-org/state-management";
import {
  TimeSlot_時間帯,
  Role_係,
  ShiftPlan_シフト案,
  Staff_スタッフ,
  type ShiftPlanState,
  type StaffJSON,
} from "@bublys-org/shift-puzzle-model";
import PersonIcon from "@mui/icons-material/Person";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import AssignmentIcon from "@mui/icons-material/Assignment";
import React from "react";

// マスターデータ（静的）
const timeSlots = TimeSlot_時間帯.createDefaultTimeSlots();
const roles = Role_係.createDefaultRoles();

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
  const plans = shiftPlanStates.map(s => new ShiftPlan_シフト案(s));

  const assignment = plans
    .flatMap(plan => plan.assignments)
    .find(a => a.id === assignmentId);
  if (!assignment) return undefined;

  const timeSlot = timeSlots.find(t => t.id === assignment.timeSlotId);
  const role = roles.find(r => r.id === assignment.roleId);

  // スタッフ名を解決
  const staffJsonList: StaffJSON[] = state.gakkaiShift?.staffList ?? [];
  const staff = staffJsonList
    .map(json => Staff_スタッフ.fromJSON(json))
    .find(s => s.id === assignment.staffId);
  const staffName = staff?.name ?? "不明";

  const slotLabel = timeSlot?.label ?? "?";
  const roleName = role?.name ?? "?";

  return `${slotLabel}(${roleName})←${staffName}`;
};

registerObjectType('Staff', React.createElement(PersonIcon, { fontSize: 'small' }));
registerObjectType('StaffAvailability', React.createElement(EventAvailableIcon, { fontSize: 'small' }));
registerObjectType('ShiftAssignment', {
  icon: React.createElement(AssignmentIcon, { fontSize: 'small' }),
  labelResolver: resolveShiftAssignmentLabel,
});
