'use client';

import { FC, useEffect, useMemo } from "react";
import styled from "styled-components";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import {
  selectShiftPuzzleStaffList,
  selectShiftPuzzlePlanById,
  setStaffList,
} from "../slice/index.js";
import { StaffShiftTableView } from "../ui/StaffShiftTableView.js";
import {
  TimeSlot_時間帯,
  Role_係,
} from "../domain/index.js";
import { createSampleStaffList } from "../data/sampleStaff.js";

type StaffShiftTableProps = {
  shiftPlanId: string;
  onStaffClick?: (staffId: string) => void;
  onAssignmentClick?: (shiftPlanId: string, assignmentId: string) => void;
};

export const StaffShiftTable: FC<StaffShiftTableProps> = ({
  shiftPlanId,
  onStaffClick,
  onAssignmentClick,
}) => {
  const dispatch = useAppDispatch();
  const staffList = useAppSelector(selectShiftPuzzleStaffList);
  const shiftPlan = useAppSelector(selectShiftPuzzlePlanById(shiftPlanId));

  // マスターデータ
  const timeSlots = useMemo(() => TimeSlot_時間帯.createDefaultTimeSlots(), []);
  const roles = useMemo(() => Role_係.createDefaultRoles(), []);

  // 初期データのロード
  useEffect(() => {
    if (staffList.length === 0) {
      const sampleData = createSampleStaffList();
      dispatch(setStaffList(sampleData.map((s) => s.toJSON())));
    }
  }, [dispatch, staffList.length]);

  if (!shiftPlan) {
    return <StyledContainer><div className="e-loading">シフト案が見つかりません</div></StyledContainer>;
  }

  return (
    <StyledContainer>
      <div className="e-header">
        <h3>{shiftPlan.name} - スタッフ別シフト表</h3>
        <div className="e-stats">
          配置数: {shiftPlan.assignments.length}件 /
          スタッフ: {new Set(shiftPlan.assignments.map(a => a.staffId)).size}名
        </div>
      </div>

      <div className="e-main">
        <StaffShiftTableView
          timeSlots={timeSlots}
          roles={roles}
          assignments={shiftPlan.assignments}
          staffList={staffList}
          onStaffClick={onStaffClick}
          onAssignmentClick={(assignmentId) => onAssignmentClick?.(shiftPlanId, assignmentId)}
        />
      </div>
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;

  .e-loading {
    padding: 20px;
    text-align: center;
    color: #666;
  }

  .e-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid #eee;
    flex-shrink: 0;

    h3 {
      margin: 0;
      font-size: 1em;
    }

    .e-stats {
      color: #666;
      font-size: 0.85em;
    }
  }

  .e-main {
    flex: 1;
    overflow: auto;
    padding: 8px;
  }
`;
