'use client';

import { FC, useState, useEffect } from "react";
import styled from "styled-components";
import {
  useAppDispatch,
  useAppSelector,
  selectGakkaiShiftPlans,
  addShiftPlan,
  deleteShiftPlan,
  setStaffList,
  selectGakkaiShiftStaffList,
} from "@bublys-org/state-management";
import { ShiftPlanEditor } from "./ShiftPlanEditor";
import { ShiftPlan_シフト案 } from "../domain";
import { createSampleStaffList } from "../data/sampleStaff";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { IconButton, Tooltip } from "@mui/material";

type ShiftPlanManagerProps = {
  onStaffClick?: (staffId: string) => void;
};

export const ShiftPlanManager: FC<ShiftPlanManagerProps> = ({
  onStaffClick,
}) => {
  const dispatch = useAppDispatch();
  const shiftPlans = useAppSelector(selectGakkaiShiftPlans);
  const staffList = useAppSelector(selectGakkaiShiftStaffList);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // 初期データのロード
  useEffect(() => {
    if (staffList.length === 0) {
      const sampleData = createSampleStaffList();
      dispatch(setStaffList(sampleData.map((s) => s.toJSON())));
    }
  }, [dispatch, staffList.length]);

  // 初期シフト案がなければ作成
  useEffect(() => {
    if (shiftPlans.length === 0) {
      const newPlan = ShiftPlan_シフト案.create("シフト案1");
      dispatch(addShiftPlan(newPlan.state));
      setSelectedPlanId(newPlan.id);
    } else if (!selectedPlanId || !shiftPlans.find((p) => p.id === selectedPlanId)) {
      setSelectedPlanId(shiftPlans[0].id);
    }
  }, [dispatch, shiftPlans, selectedPlanId]);

  const handleAddPlan = () => {
    const planNumber = shiftPlans.length + 1;
    const newPlan = ShiftPlan_シフト案.create(`シフト案${planNumber}`);
    dispatch(addShiftPlan(newPlan.state));
    setSelectedPlanId(newPlan.id);
  };

  const handleCopyPlan = (planId: string) => {
    const sourcePlan = shiftPlans.find((p) => p.id === planId);
    if (!sourcePlan) return;

    const newPlan = ShiftPlan_シフト案.create(`${sourcePlan.name}のコピー`);

    // 配置をコピー
    const copiedState = {
      ...newPlan.state,
      assignments: sourcePlan.state.assignments.map((a) => ({
        ...a,
        id: crypto.randomUUID(), // 新しいIDを割り当て
      })),
    };

    dispatch(addShiftPlan(copiedState));
    setSelectedPlanId(newPlan.id);
  };

  const handleDeletePlan = (planId: string) => {
    // 最後の1つは削除不可
    if (shiftPlans.length <= 1) return;

    dispatch(deleteShiftPlan(planId));
    // 削除したプランが選択中だった場合、先頭のプランを選択
    if (selectedPlanId === planId) {
      const remaining = shiftPlans.filter((p) => p.id !== planId);
      setSelectedPlanId(remaining[0]?.id ?? null);
    }
  };

  const selectedPlan = shiftPlans.find((p) => p.id === selectedPlanId);

  return (
    <StyledContainer>
      {/* タブバー */}
      <div className="e-tab-bar">
        <div className="e-tabs">
          {shiftPlans.map((plan) => (
            <div
              key={plan.id}
              className={`e-tab ${plan.id === selectedPlanId ? "is-selected" : ""}`}
              onClick={() => setSelectedPlanId(plan.id)}
            >
              <span className="e-tab-name">{plan.name}</span>
              <span className="e-tab-count">{plan.assignments.length}件</span>
              <Tooltip title="コピー" arrow>
                <IconButton
                  size="small"
                  className="e-tab-action"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyPlan(plan.id);
                  }}
                >
                  <ContentCopyIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
              {shiftPlans.length > 1 && (
                <Tooltip title="削除" arrow>
                  <IconButton
                    size="small"
                    className="e-tab-action e-delete-action"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePlan(plan.id);
                    }}
                  >
                    <DeleteIcon fontSize="inherit" />
                  </IconButton>
                </Tooltip>
              )}
            </div>
          ))}
        </div>
        <Tooltip title="新しいシフト案を追加" arrow>
          <IconButton
            size="small"
            className="e-add-btn"
            onClick={handleAddPlan}
          >
            <AddIcon />
          </IconButton>
        </Tooltip>
      </div>

      {/* 選択中のシフト案 */}
      <div className="e-content">
        {selectedPlan ? (
          <ShiftPlanEditor
            key={selectedPlan.id}
            shiftPlanId={selectedPlan.id}
            onStaffClick={onStaffClick}
          />
        ) : (
          <div className="e-empty">シフト案を選択してください</div>
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

  .e-tab-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    background-color: #f0f0f0;
    border-bottom: 1px solid #ddd;
    flex-shrink: 0;
  }

  .e-tabs {
    display: flex;
    gap: 4px;
    flex: 1;
    overflow-x: auto;
  }

  .e-tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background-color: #e0e0e0;
    border-radius: 4px 4px 0 0;
    cursor: pointer;
    transition: background-color 0.15s;
    white-space: nowrap;

    &:hover {
      background-color: #d0d0d0;
    }

    &.is-selected {
      background-color: #fff;
      border: 1px solid #ddd;
      border-bottom: 1px solid #fff;
      margin-bottom: -1px;
    }

    .e-tab-name {
      font-weight: bold;
      font-size: 0.9em;
    }

    .e-tab-count {
      font-size: 0.75em;
      color: #666;
      background-color: rgba(0, 0, 0, 0.1);
      padding: 1px 6px;
      border-radius: 10px;
    }

    .e-tab-action {
      opacity: 0;
      transition: opacity 0.15s;
      padding: 2px;
      font-size: 0.85em;
    }

    .e-delete-action {
      color: #d32f2f;

      &:hover {
        background-color: rgba(211, 47, 47, 0.1);
      }
    }

    &:hover .e-tab-action {
      opacity: 1;
    }
  }

  .e-add-btn {
    background-color: #1976d2;
    color: white;

    &:hover {
      background-color: #1565c0;
    }
  }

  .e-content {
    flex: 1;
    overflow: hidden;
  }

  .e-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #666;
  }
`;
