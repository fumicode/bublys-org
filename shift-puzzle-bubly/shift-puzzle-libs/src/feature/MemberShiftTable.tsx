'use client';

import { FC, useEffect, useMemo } from "react";
import styled from "styled-components";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import {
  selectShiftPuzzleMemberList,
  selectShiftPuzzlePlanById,
  setMemberList,
} from "../slice/index.js";
import { MemberShiftTableView } from "../ui/MemberShiftTableView.js";
import { createDefaultShifts } from "../data/sampleData.js";
import { createSampleMemberList } from "../data/sampleMember.js";

type MemberShiftTableProps = {
  shiftPlanId: string;
  onMemberClick?: (memberId: string) => void;
  onAssignmentClick?: (shiftPlanId: string, assignmentId: string) => void;
};

export const MemberShiftTable: FC<MemberShiftTableProps> = ({
  shiftPlanId,
  onMemberClick,
  onAssignmentClick,
}) => {
  const dispatch = useAppDispatch();
  const memberList = useAppSelector(selectShiftPuzzleMemberList);
  const shiftPlan = useAppSelector(selectShiftPuzzlePlanById(shiftPlanId));

  const shifts = useMemo(() => createDefaultShifts(), []);

  // 初期データのロード
  useEffect(() => {
    if (memberList.length === 0) {
      const sampleData = createSampleMemberList();
      dispatch(setMemberList(sampleData.map((m) => m.state)));
    }
  }, [dispatch, memberList.length]);

  if (!shiftPlan) {
    return <StyledContainer><div className="e-loading">シフト案が見つかりません</div></StyledContainer>;
  }

  return (
    <StyledContainer>
      <div className="e-header">
        <h3>{shiftPlan.name} - 局員別シフト表</h3>
        <div className="e-stats">
          配置数: {shiftPlan.assignments.length}件 /
          局員: {new Set(shiftPlan.assignments.map(a => a.staffId)).size}名
        </div>
      </div>

      <div className="e-main">
        <MemberShiftTableView
          shifts={shifts}
          assignments={shiftPlan.assignments}
          memberList={memberList}
          onMemberClick={onMemberClick}
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
