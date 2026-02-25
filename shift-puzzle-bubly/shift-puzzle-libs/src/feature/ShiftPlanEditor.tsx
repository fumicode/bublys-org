'use client';

import { FC, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import {
  selectShiftPuzzleStaffList,
  selectShiftPuzzlePlanById,
  addShiftPlan,
  updateShiftPlan,
  setStaffList,
} from "../slice/index.js";
import { ShiftPlanTableView } from "../ui/ShiftPlanTableView.js";
import { GanttTimelineView } from "../ui/GanttTimelineView.js";
import {
  TimeSlot_時間帯,
  Role_係,
  ShiftPlan_シフト案,
  ShiftAssignment_シフト配置,
  ConstraintViolation,
  ShiftMatcher_シフトマッチング,
} from "../domain/index.js";
import { createSampleStaffList } from "../data/sampleStaff.js";
import WarningIcon from "@mui/icons-material/Warning";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import PeopleIcon from "@mui/icons-material/People";
import TableChartIcon from "@mui/icons-material/TableChart";
import ViewTimelineIcon from "@mui/icons-material/ViewTimeline";
import { Button, ToggleButtonGroup, ToggleButton } from "@mui/material";
import { UrledPlace } from "@bublys-org/bubbles-ui";

type ViewMode = 'table' | 'gantt-role' | 'gantt-staff';

type ShiftPlanEditorProps = {
  shiftPlanId: string;
  onAssignmentClick?: (assignmentId: string) => void;
  onCellClick?: (timeSlotId: string, roleId: string) => void;
  onStaffViewClick?: () => void;
  /** セルクリック時に開くバブルのURLを生成（origin-side配置用） */
  buildCellUrl?: (timeSlotId: string, roleId: string) => string;
};

export const ShiftPlanEditor: FC<ShiftPlanEditorProps> = ({
  shiftPlanId,
  onAssignmentClick,
  onCellClick,
  onStaffViewClick,
  buildCellUrl,
}) => {
  const dispatch = useAppDispatch();
  const staffList = useAppSelector(selectShiftPuzzleStaffList);
  const shiftPlan = useAppSelector(selectShiftPuzzlePlanById(shiftPlanId));
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // マスターデータ
  const timeSlots = useMemo(() => TimeSlot_時間帯.createDefaultTimeSlots(), []);
  const roles = useMemo(() => Role_係.createDefaultRoles(), []);

  // 制約違反を取得（状態から）
  const violations = useMemo<ReadonlyArray<ConstraintViolation>>(() => {
    if (!shiftPlan) return [];
    return shiftPlan.constraintViolations;
  }, [shiftPlan]);

  // 初期データのロード
  useEffect(() => {
    if (staffList.length === 0) {
      const sampleData = createSampleStaffList();
      dispatch(setStaffList(sampleData.map((s) => s.toJSON())));
    }
  }, [dispatch, staffList.length]);

  // シフト案がなければ作成
  useEffect(() => {
    if (!shiftPlan) {
      const newPlan = ShiftPlan_シフト案.create("シフト案1");
      // IDを指定して作成
      const planWithId = {
        ...newPlan.state,
        id: shiftPlanId,
      };
      dispatch(addShiftPlan(planWithId));
    }
  }, [dispatch, shiftPlan, shiftPlanId]);

  const handleDropStaff = (staffId: string, timeSlotId: string, roleId: string) => {
    if (!shiftPlan) return;

    // 既に同じスタッフが同じ時間帯・係に配置されていないかチェック
    const existingAssignment = shiftPlan.assignments.find(
      (a) =>
        a.staffId === staffId &&
        a.timeSlotId === timeSlotId &&
        a.roleId === roleId
    );
    if (existingAssignment) return;

    // ドメインオブジェクトで配置を追加
    const assignment = ShiftAssignment_シフト配置.create(
      staffId,
      timeSlotId,
      roleId,
      false // 手動配置
    );
    const updatedPlan = shiftPlan.addAssignment(assignment);
    dispatch(updateShiftPlan(updatedPlan.state));
  };

  const handleRemoveAssignment = (assignmentId: string) => {
    if (!shiftPlan) return;

    // ドメインオブジェクトで配置を削除
    const updatedPlan = shiftPlan.removeAssignment(assignmentId);
    dispatch(updateShiftPlan(updatedPlan.state));
  };

  const handleMoveAssignment = (assignmentId: string, staffId: string, timeSlotId: string, roleId: string) => {
    if (!shiftPlan) return;

    // 同じスタッフが同じ時間帯・係に既に配置されていないかチェック
    const existingAssignment = shiftPlan.assignments.find(
      (a) =>
        a.staffId === staffId &&
        a.timeSlotId === timeSlotId &&
        a.roleId === roleId
    );
    if (existingAssignment) return;

    // ドメインオブジェクトで配置を移動（削除→追加）
    const planAfterRemove = shiftPlan.removeAssignment(assignmentId);
    const assignment = ShiftAssignment_シフト配置.create(
      staffId,
      timeSlotId,
      roleId,
      false
    );
    const updatedPlan = planAfterRemove.addAssignment(assignment);
    dispatch(updateShiftPlan(updatedPlan.state));
  };

  // 自動シフト配置
  const handleAutoAssign = () => {
    if (!shiftPlan) return;

    // 自動マッチングを実行
    const result = ShiftMatcher_シフトマッチング.autoAssign(
      staffList,
      roles,
      timeSlots,
      shiftPlan.state.assignments, // 既存配置を維持
      { preserveExistingAssignments: true }
    );

    // 新しい配置をドメインオブジェクトで追加
    const existingIds = new Set(shiftPlan.assignments.map((a) => a.id));
    const newAssignments = result.assignments.filter(
      (a) => !existingIds.has(a.id)
    );

    let updatedPlan = shiftPlan;
    for (const assignmentState of newAssignments) {
      const assignment = new ShiftAssignment_シフト配置(assignmentState);
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
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_e, v) => { if (v) setViewMode(v as ViewMode); }}
            size="small"
            sx={{ mr: 1 }}
          >
            <ToggleButton value="table"><TableChartIcon fontSize="small" /></ToggleButton>
            <ToggleButton value="gantt-role"><ViewTimelineIcon fontSize="small" /></ToggleButton>
            <ToggleButton value="gantt-staff"><PeopleIcon fontSize="small" /></ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="contained"
            size="small"
            startIcon={<AutoFixHighIcon />}
            onClick={handleAutoAssign}
            sx={{ mr: 1 }}
          >
            自動シフト配置
          </Button>
          <UrledPlace url={`shift-puzzle/shift-plans/${shiftPlanId}/staff-view`}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<PeopleIcon />}
              onClick={onStaffViewClick}
              sx={{ mr: 2 }}
            >
              スタッフ別表示
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
        {viewMode === 'table' ? (
          <div className="e-table-panel">
            <ShiftPlanTableView
              timeSlots={timeSlots}
              roles={roles}
              assignments={shiftPlan.assignments}
              staffList={staffList}
              violations={violations}
              buildAssignmentUrl={(assignmentId) => `shift-puzzle/shift-plans/${shiftPlanId}/assignments/${assignmentId}/evaluation`}
              buildCellUrl={buildCellUrl}
              onDropStaff={handleDropStaff}
              onRemoveAssignment={handleRemoveAssignment}
              onMoveAssignment={handleMoveAssignment}
              onAssignmentClick={onAssignmentClick}
              onCellClick={onCellClick}
            />
          </div>
        ) : (
          <div className="e-gantt-panel">
            <GanttTimelineView
              timeSlots={timeSlots}
              roles={roles}
              assignments={shiftPlan.assignments}
              staffList={staffList}
              violations={violations}
              axisMode={viewMode === 'gantt-role' ? 'role' : 'staff'}
              onDropStaff={handleDropStaff}
              onRemoveAssignment={handleRemoveAssignment}
              onMoveAssignment={handleMoveAssignment}
              onAssignmentClick={onAssignmentClick}
              onCellClick={onCellClick}
            />
          </div>
        )}
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

  .e-gantt-panel {
    height: 100%;
    overflow: hidden;
    padding: 8px;
  }
`;
