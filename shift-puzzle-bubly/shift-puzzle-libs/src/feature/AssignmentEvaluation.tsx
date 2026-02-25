'use client';

import { FC, useMemo } from "react";
import { useAppSelector } from "@bublys-org/state-management";
import {
  selectGakkaiShiftStaffList,
  selectGakkaiShiftPlanById,
} from "../slice/index.js";
import { AssignmentEvaluationView } from "../ui/AssignmentEvaluationView.js";
import {
  TimeSlot_時間帯,
  Role_係,
  Staff_スタッフ,
  ShiftAssignment_シフト配置,
  StaffAssignmentEvaluation_スタッフ配置評価,
  ConstraintViolation,
} from "../domain/index.js";

type AssignmentEvaluationProps = {
  shiftPlanId: string;
  assignmentId: string;
  onStaffClick?: (staffId: string) => void;
  onTimeSlotClick?: (staffId: string) => void;
  buildStaffDetailUrl?: (staffId: string) => string;
  buildStaffAvailabilityUrl?: (staffId: string) => string;
};

export const AssignmentEvaluation: FC<AssignmentEvaluationProps> = ({
  shiftPlanId,
  assignmentId,
  onStaffClick,
  onTimeSlotClick,
  buildStaffDetailUrl,
  buildStaffAvailabilityUrl,
}) => {
  const staffList = useAppSelector(selectGakkaiShiftStaffList);
  const shiftPlan = useAppSelector(selectGakkaiShiftPlanById(shiftPlanId));

  // マスターデータ
  const timeSlots = useMemo(() => TimeSlot_時間帯.createDefaultTimeSlots(), []);
  const roles = useMemo(() => Role_係.createDefaultRoles(), []);

  // 配置を取得
  const assignment = useMemo(() => {
    if (!shiftPlan) return undefined;
    const assignmentState = shiftPlan.state.assignments.find(
      (a) => a.id === assignmentId
    );
    return assignmentState ? new ShiftAssignment_シフト配置(assignmentState) : undefined;
  }, [shiftPlan, assignmentId]);

  // 関連データを取得
  const staff = useMemo<Staff_スタッフ | undefined>(() => {
    if (!assignment) return undefined;
    return staffList.find((s) => s.id === assignment.staffId);
  }, [staffList, assignment]);

  const timeSlot = useMemo<TimeSlot_時間帯 | undefined>(() => {
    if (!assignment) return undefined;
    return timeSlots.find((t) => t.id === assignment.timeSlotId);
  }, [timeSlots, assignment]);

  const role = useMemo<Role_係 | undefined>(() => {
    if (!assignment) return undefined;
    return roles.find((r) => r.id === assignment.roleId);
  }, [roles, assignment]);

  // 評価を計算
  const evaluation = useMemo<StaffAssignmentEvaluation_スタッフ配置評価 | undefined>(() => {
    if (!assignment || !staff || !role || !timeSlot) return undefined;
    return StaffAssignmentEvaluation_スタッフ配置評価.evaluate(
      assignment,
      staff,
      role,
      timeSlot
    );
  }, [assignment, staff, role, timeSlot]);

  // この配置に関連する制約違反を取得（状態から）
  const constraintViolations = useMemo<ConstraintViolation[]>(() => {
    if (!shiftPlan) return [];
    return shiftPlan.constraintViolations.filter((v) => v.assignmentIds.includes(assignmentId));
  }, [shiftPlan, assignmentId]);

  if (!shiftPlan) {
    return <div>シフト案が見つかりません</div>;
  }

  if (!assignment) {
    return <div>配置が見つかりません</div>;
  }

  if (!staff || !role || !timeSlot || !evaluation) {
    return <div>データを読み込み中...</div>;
  }

  return (
    <AssignmentEvaluationView
      evaluation={evaluation}
      staffName={staff.name}
      timeSlotLabel={timeSlot.label}
      roleName={role.name}
      constraintViolations={constraintViolations}
      staffDetailUrl={buildStaffDetailUrl?.(staff.id)}
      staffAvailabilityUrl={buildStaffAvailabilityUrl?.(staff.id)}
      onStaffClick={() => onStaffClick?.(staff.id)}
      onTimeSlotClick={() => onTimeSlotClick?.(staff.id)}
    />
  );
};
