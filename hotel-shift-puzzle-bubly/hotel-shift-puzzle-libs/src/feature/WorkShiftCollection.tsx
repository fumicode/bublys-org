'use client';

import { FC } from "react";
import styled from "styled-components";
import { WorkShift } from "@bublys-org/hotel-shift-puzzle-model";
import { WorkShiftListView } from "../ui/WorkShiftListView.js";
import { useObjects, useObjectRepo } from "../objects/repository.js";
import { useSeedHotelData } from "../objects/seed.js";
import { WORKSHIFT_TYPE } from "../objects/hotelObjects.js";

/** 新しい勤務帯の ID を生成する */
const newWorkShiftId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `shift-${Date.now()}`;

export const WorkShiftCollection: FC = () => {
  useSeedHotelData();
  const workShifts = useObjects<WorkShift>(WORKSHIFT_TYPE);
  const actions = useObjectRepo<WorkShift>(WORKSHIFT_TYPE);

  const handleAdd = () => {
    actions.save(WorkShift.of(newWorkShiftId(), "新しい勤務帯", { hour: 9 }));
  };

  const handleRename = (id: string, name: string) => {
    const shift = workShifts.find((w) => w.id === id);
    if (shift) actions.save(shift.rename(name));
  };

  const handleChangeStart = (id: string, start: { hour: number; minute: number }) => {
    const shift = workShifts.find((w) => w.id === id);
    if (shift) actions.save(shift.changeStart(start));
  };

  const handleRemove = (id: string) => {
    actions.remove(id);
  };

  return (
    <StyledContainer>
      <div className="e-header">
        <h3>勤務帯 ({workShifts.length})</h3>
      </div>
      <WorkShiftListView
        workShifts={workShifts}
        onRename={handleRename}
        onChangeStart={handleChangeStart}
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
