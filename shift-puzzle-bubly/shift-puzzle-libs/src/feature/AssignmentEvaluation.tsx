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
import { createDefaultShifts } from "../data/sampleData.js";

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

  const shifts = useMemo(() => createDefaultShifts(), []);

  // 配置を取得
  const assignment = useMemo(() => {
    if (!shiftPlan) return undefined;
    const assignmentState = (shiftPlan.state.assignments ?? []).find(
      (a) => a.id === assignmentId
    );
    return assignmentState ? new ShiftAssignment(assignmentState) : undefined;
  }, [shiftPlan, assignmentId]);

  const member = useMemo(() => {
    if (!assignment) return undefined;
    return memberList.find((m) => m.id === assignment.staffId);
  }, [memberList, assignment]);

  const shift = useMemo(() => {
    if (!assignment) return undefined;
    return shifts.find((s) => s.id === assignment.shiftId);
  }, [shifts, assignment]);

  // 評価を計算
  const evaluation = useMemo<MemberAssignmentEvaluation | undefined>(() => {
    if (!assignment || !member || !shift) return undefined;
    return MemberAssignmentEvaluation.evaluate(assignment, member, shift);
  }, [assignment, member, shift]);

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

  if (!member || !shift || !evaluation) {
    return <div>データを読み込み中...</div>;
  }

  return (
    <AssignmentEvaluationView
      evaluation={evaluation}
      memberName={member.name}
      timeSlotLabel={`${shift.startTime}–${shift.endTime}`}
      taskName={shift.taskName ?? shift.taskId}
      constraintViolations={constraintViolations}
      memberDetailUrl={buildMemberDetailUrl?.(member.id)}
      memberAvailabilityUrl={buildMemberAvailabilityUrl?.(member.id)}
      onMemberClick={() => onMemberClick?.(member.id)}
      onTimeSlotClick={() => onTimeSlotClick?.(member.id)}
    />
  );
};
