'use client';

import { FC, useEffect, useMemo } from "react";
import styled from "styled-components";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import {
  selectShiftPuzzleMemberList,
  selectShiftPuzzlePlanById,
  addShiftPlan,
  updateShiftPlan,
  setMemberList,
} from "../slice/index.js";
import { ShiftPlanTableView } from "../ui/ShiftPlanTableView.js";
import {
  ShiftPlan,
  ShiftAssignment,
  ConstraintViolation,
  ShiftMatcher,
} from "../domain/index.js";
import { createSampleMemberList } from "../data/sampleMember.js";
import { createDefaultTasks, createDefaultTimeSlots } from "../data/sampleData.js";
import WarningIcon from "@mui/icons-material/Warning";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import PeopleIcon from "@mui/icons-material/People";
import { Button } from "@mui/material";
import { UrledPlace } from "@bublys-org/bubbles-ui";

type ShiftPlanEditorProps = {
  shiftPlanId: string;
  onAssignmentClick?: (assignmentId: string) => void;
  onCellClick?: (timeSlotId: string, taskId: string) => void;
  onMemberViewClick?: () => void;
  buildCellUrl?: (timeSlotId: string, taskId: string) => string;
};

export const ShiftPlanEditor: FC<ShiftPlanEditorProps> = ({
  shiftPlanId,
  onAssignmentClick,
  onCellClick,
  onMemberViewClick,
  buildCellUrl,
}) => {
  const dispatch = useAppDispatch();
  const memberList = useAppSelector(selectShiftPuzzleMemberList);
  const shiftPlan = useAppSelector(selectShiftPuzzlePlanById(shiftPlanId));

  // マスターデータ
  const timeSlots = useMemo(() => createDefaultTimeSlots(), []);
  const tasks = useMemo(() => createDefaultTasks(), []);

  // 制約違反を取得（状態から）
  const violations = useMemo<ReadonlyArray<ConstraintViolation>>(() => {
    if (!shiftPlan) return [];
    return shiftPlan.constraintViolations;
  }, [shiftPlan]);

  // 初期データのロード
  useEffect(() => {
    if (memberList.length === 0) {
      const sampleData = createSampleMemberList();
      dispatch(setMemberList(sampleData.map((m) => m.state)));
    }
  }, [dispatch, memberList.length]);

  // シフト案がなければ作成
  useEffect(() => {
    if (!shiftPlan) {
      const newPlan = ShiftPlan.create("シフト案1", "晴れ");
      const planWithId = {
        ...newPlan.state,
        id: shiftPlanId,
      };
      dispatch(addShiftPlan(planWithId));
    }
  }, [dispatch, shiftPlan, shiftPlanId]);

  const handleDropMember = (memberId: string, timeSlotId: string, taskId: string) => {
    if (!shiftPlan) return;

    const existingAssignment = shiftPlan.assignments.find(
      (a) =>
        a.staffId === memberId &&
        a.timeSlotId === timeSlotId &&
        a.roleId === taskId
    );
    if (existingAssignment) return;

    const assignment = ShiftAssignment.create(
      memberId,
      timeSlotId,
      taskId,
      false // 手動配置
    );
    const updatedPlan = shiftPlan.addAssignment(assignment);
    dispatch(updateShiftPlan(updatedPlan.state));
  };

  const handleRemoveAssignment = (assignmentId: string) => {
    if (!shiftPlan) return;

    const updatedPlan = shiftPlan.removeAssignment(assignmentId);
    dispatch(updateShiftPlan(updatedPlan.state));
  };

  const handleMoveAssignment = (assignmentId: string, memberId: string, timeSlotId: string, taskId: string) => {
    if (!shiftPlan) return;

    const existingAssignment = shiftPlan.assignments.find(
      (a) =>
        a.staffId === memberId &&
        a.timeSlotId === timeSlotId &&
        a.roleId === taskId
    );
    if (existingAssignment) return;

    const planAfterRemove = shiftPlan.removeAssignment(assignmentId);
    const assignment = ShiftAssignment.create(
      memberId,
      timeSlotId,
      taskId,
      false
    );
    const updatedPlan = planAfterRemove.addAssignment(assignment);
    dispatch(updateShiftPlan(updatedPlan.state));
  };

  // 自動シフト配置
  const handleAutoAssign = () => {
    if (!shiftPlan) return;

    const result = ShiftMatcher.autoAssign(
      memberList,
      tasks,
      timeSlots,
      shiftPlan.state.assignments,
      { preserveExistingAssignments: true }
    );

    const existingIds = new Set(shiftPlan.assignments.map((a) => a.id));
    const newAssignments = result.assignments.filter(
      (a) => !existingIds.has(a.id)
    );

    let updatedPlan = shiftPlan;
    for (const assignmentState of newAssignments) {
      const assignment = new ShiftAssignment(assignmentState);
      updatedPlan = updatedPlan.addAssignment(assignment);
    }

    dispatch(updateShiftPlan(updatedPlan.state));
    console.log("[AutoAssign] Result:", result.stats);
  };

  if (!shiftPlan) {
    return <div>読み込み中...</div>;
  }

  return (
    <StyledContainer>
      <div className="e-header">
        <h3>{shiftPlan.name}</h3>
        <div className="e-stats">
          <Button
            variant="contained"
            size="small"
            startIcon={<AutoFixHighIcon />}
            onClick={handleAutoAssign}
            sx={{ mr: 1 }}
          >
            自動シフト配置
          </Button>
          <UrledPlace url={`shift-puzzle/shift-plans/${shiftPlanId}/member-view`}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<PeopleIcon />}
              onClick={onMemberViewClick}
              sx={{ mr: 2 }}
            >
              局員別表示
            </Button>
          </UrledPlace>
          配置数: {shiftPlan.assignments.length}件
          {violations.length > 0 && (
            <span className="e-violation-warning">
              <WarningIcon fontSize="small" />
              制約違反: {violations.length}件
            </span>
          )}
        </div>
      </div>

      <div className="e-main">
        <div className="e-table-panel">
          <ShiftPlanTableView
            timeSlots={timeSlots}
            tasks={tasks}
            assignments={shiftPlan.assignments}
            memberList={memberList}
            violations={violations}
            buildAssignmentUrl={(assignmentId) => `shift-puzzle/shift-plans/${shiftPlanId}/assignments/${assignmentId}/evaluation`}
            buildCellUrl={buildCellUrl}
            onDropMember={handleDropMember}
            onRemoveAssignment={handleRemoveAssignment}
            onMoveAssignment={handleMoveAssignment}
            onAssignmentClick={onAssignmentClick}
            onCellClick={onCellClick}
          />
        </div>
      </div>
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;

  .e-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid #eee;
    flex-shrink: 0;

    h3 {
      margin: 0;
    }

    .e-stats {
      color: #666;
      font-size: 0.9em;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .e-violation-warning {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #ff9800;
      font-weight: bold;
      background-color: #fff3e0;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid #ff9800;
    }
  }

  .e-main {
    flex: 1;
    overflow: hidden;
  }

  .e-table-panel {
    height: 100%;
    overflow: auto;
    padding: 8px;
  }
`;
