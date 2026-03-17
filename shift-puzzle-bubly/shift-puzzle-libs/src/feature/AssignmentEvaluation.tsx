'use client';

import { FC, useMemo } from "react";
import { useAppSelector } from "@bublys-org/state-management";
import {
  selectShiftPuzzleMemberList,
  selectShiftPuzzlePlanById,
} from "../slice/index.js";
import { AssignmentEvaluationView } from "../ui/AssignmentEvaluationView.js";
import {
  ShiftAssignment,
  MemberAssignmentEvaluation,
  ConstraintViolation,
} from "../domain/index.js";
import { createDefaultTimeSlots, createDefaultTasks } from "../data/sampleData.js";

type AssignmentEvaluationProps = {
  shiftPlanId: string;
  assignmentId: string;
  onMemberClick?: (memberId: string) => void;
  onTimeSlotClick?: (memberId: string) => void;
  buildMemberDetailUrl?: (memberId: string) => string;
  buildMemberAvailabilityUrl?: (memberId: string) => string;
};

export const AssignmentEvaluation: FC<AssignmentEvaluationProps> = ({
  shiftPlanId,
  assignmentId,
  onMemberClick,
  onTimeSlotClick,
  buildMemberDetailUrl,
  buildMemberAvailabilityUrl,
}) => {
  const memberList = useAppSelector(selectShiftPuzzleMemberList);
  const shiftPlan = useAppSelector(selectShiftPuzzlePlanById(shiftPlanId));

  const timeSlots = useMemo(() => createDefaultTimeSlots(), []);
  const tasks = useMemo(() => createDefaultTasks(), []);

  // 配置を取得
  const assignment = useMemo(() => {
    if (!shiftPlan) return undefined;
    const assignmentState = shiftPlan.state.assignments.find(
      (a) => a.id === assignmentId
    );
    return assignmentState ? new ShiftAssignment(assignmentState) : undefined;
  }, [shiftPlan, assignmentId]);

  const member = useMemo(() => {
    if (!assignment) return undefined;
    return memberList.find((m) => m.id === assignment.staffId);
  }, [memberList, assignment]);

  const timeSlot = useMemo(() => {
    if (!assignment) return undefined;
    return timeSlots.find((t) => t.id === assignment.timeSlotId);
  }, [timeSlots, assignment]);

  const task = useMemo(() => {
    if (!assignment) return undefined;
    return tasks.find((t) => t.id === assignment.roleId);
  }, [tasks, assignment]);

  // 評価を計算
  const evaluation = useMemo<MemberAssignmentEvaluation | undefined>(() => {
    if (!assignment || !member || !task || !timeSlot) return undefined;
    return MemberAssignmentEvaluation.evaluate(assignment, member, task, timeSlot);
  }, [assignment, member, task, timeSlot]);

  // この配置に関連する制約違反を取得
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

  if (!member || !task || !timeSlot || !evaluation) {
    return <div>データを読み込み中...</div>;
  }

  return (
    <AssignmentEvaluationView
      evaluation={evaluation}
      memberName={member.name}
      timeSlotLabel={timeSlot.label}
      taskName={task.name}
      constraintViolations={constraintViolations}
      memberDetailUrl={buildMemberDetailUrl?.(member.id)}
      memberAvailabilityUrl={buildMemberAvailabilityUrl?.(member.id)}
      onMemberClick={() => onMemberClick?.(member.id)}
      onTimeSlotClick={() => onTimeSlotClick?.(member.id)}
    />
  );
};
