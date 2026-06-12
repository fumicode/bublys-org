'use client';

import { FC, useEffect } from "react";
import styled from "styled-components";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import {
  selectWorkShiftList,
  setWorkShiftList,
  addWorkShift,
  updateWorkShift,
  removeWorkShift,
} from "../slice/index.js";
import { WorkShiftListView } from "../ui/WorkShiftListView.js";
import { createSampleWorkShifts } from "../data/sampleWorkShifts.js";

/** 新しい勤務帯の ID を生成する */
const newWorkShiftId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `shift-${Date.now()}`;

export const WorkShiftCollection: FC = () => {
  const dispatch = useAppDispatch();
  const workShifts = useAppSelector(selectWorkShiftList);

  // 初期データのロード（空ならサンプルを投入）
  useEffect(() => {
    if (workShifts.length === 0) {
      dispatch(setWorkShiftList(createSampleWorkShifts().map((w) => w.state)));
    }
  }, [dispatch, workShifts.length]);

  const handleAdd = () => {
    dispatch(addWorkShift({ id: newWorkShiftId(), name: "新しい勤務帯", startMinute: 9 * 60 }));
  };

  const handleRename = (id: string, name: string) => {
    const shift = workShifts.find((w) => w.id === id);
    if (!shift) return;
    dispatch(updateWorkShift({ ...shift.state, name }));
  };

  const handleChangeStartMinute = (id: string, startMinute: number) => {
    const shift = workShifts.find((w) => w.id === id);
    if (!shift) return;
    dispatch(updateWorkShift({ ...shift.state, startMinute }));
  };

  const handleRemove = (id: string) => {
    dispatch(removeWorkShift(id));
  };

  return (
    <StyledContainer>
      <div className="e-header">
        <h3>勤務帯 ({workShifts.length})</h3>
      </div>
      <WorkShiftListView
        workShifts={workShifts}
        onRename={handleRename}
        onChangeStartMinute={handleChangeStartMinute}
        onAdd={handleAdd}
        onRemove={handleRemove}
      />
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  .e-header {
    margin-bottom: 4px;

    h3 {
      margin: 0;
    }
  }
`;
