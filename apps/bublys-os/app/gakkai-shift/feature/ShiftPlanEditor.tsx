'use client';

import { FC, useEffect, useMemo } from "react";
import styled from "styled-components";
import {
  useAppDispatch,
  useAppSelector,
  selectGakkaiShiftStaffList,
  selectGakkaiShiftPlanById,
  addShiftPlan,
  updateShiftPlan,
  setStaffList,
} from "@bublys-org/state-management";
import { ShiftPlanTableView } from "../ui/ShiftPlanTableView";
import {
  TimeSlot_時間帯,
  Role_係,
  ShiftPlan_シフト案,
  ShiftAssignment_シフト配置,
  ConstraintViolation,
  ShiftMatcher_シフトマッチング,
} from "../domain";
import { createSampleStaffList } from "../data/sampleStaff";
import PersonIcon from "@mui/icons-material/Person";
import WarningIcon from "@mui/icons-material/Warning";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import { Button } from "@mui/material";
import { UrledPlace } from "../../bubble-ui/components";

type ShiftPlanEditorProps = {
  shiftPlanId: string;
  onStaffClick?: (staffId: string) => void;
  onAssignmentClick?: (assignmentId: string) => void;
};

export const ShiftPlanEditor: FC<ShiftPlanEditorProps> = ({
  shiftPlanId,
  onStaffClick,
  onAssignmentClick,
}) => {
  const dispatch = useAppDispatch();
  const staffList = useAppSelector(selectGakkaiShiftStaffList);
  const shiftPlan = useAppSelector(selectGakkaiShiftPlanById(shiftPlanId));

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

  const handleDragStart = (e: React.DragEvent, staffId: string) => {
    console.log("[DragStart] staffId:", staffId);
    e.dataTransfer.setData("text/staff-id", staffId);
    e.dataTransfer.effectAllowed = "copy";
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
          <Button
            variant="contained"
            size="small"
            startIcon={<AutoFixHighIcon />}
            onClick={handleAutoAssign}
            sx={{ mr: 2 }}
          >
            自動シフト配置
          </Button>
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
        {/* スタッフ一覧（ドラッグ元） */}
        <div className="e-staff-panel">
          <h4>スタッフ</h4>
          <div className="e-staff-list">
            {staffList.map((staff) => {
              const staffUrl = `gakkai-shift/staffs/${staff.id}`;
              return (
                <UrledPlace key={staff.id} url={staffUrl}>
                  <div
                    className="e-staff-item"
                    draggable
                    onDragStart={(e) => handleDragStart(e, staff.id)}
                    onClick={() => onStaffClick?.(staff.id)}
                  >
                    <PersonIcon fontSize="small" />
                    <div className="e-staff-info">
                      <div className="e-staff-name">{staff.name}</div>
                      <div className="e-staff-meta">
                        {staff.availableTimeSlots.length}枠
                      </div>
                    </div>
                  </div>
                </UrledPlace>
              );
            })}
          </div>
        </div>

        {/* シフト表 */}
        <div className="e-table-panel">
          <ShiftPlanTableView
            timeSlots={timeSlots}
            roles={roles}
            assignments={shiftPlan.assignments}
            staffList={staffList}
            violations={violations}
            buildAssignmentUrl={(assignmentId) => `gakkai-shift/shift-plans/${shiftPlanId}/assignments/${assignmentId}/evaluation`}
            onDropStaff={handleDropStaff}
            onRemoveAssignment={handleRemoveAssignment}
            onMoveAssignment={handleMoveAssignment}
            onAssignmentClick={onAssignmentClick}
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
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .e-staff-panel {
    width: 180px;
    flex-shrink: 0;
    border-right: 1px solid #eee;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    h4 {
      margin: 0;
      padding: 8px 12px;
      font-size: 0.9em;
      background-color: #f5f5f5;
      border-bottom: 1px solid #eee;
    }
  }

  .e-staff-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
  }

  .e-staff-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    margin-bottom: 4px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background-color: #fff;
    cursor: pointer;
    transition: box-shadow 0.15s, background-color 0.15s;

    &:hover {
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      background-color: #f5f5f5;
    }

    &:active {
      cursor: grabbing;
    }
  }

  .e-staff-info {
    flex: 1;
    min-width: 0;
  }

  .e-staff-name {
    font-size: 0.85em;
    font-weight: bold;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .e-staff-meta {
    font-size: 0.75em;
    color: #666;
  }

  .e-table-panel {
    flex: 1;
    overflow: auto;
    padding: 8px;
  }
`;
