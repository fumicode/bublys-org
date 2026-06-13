'use client';

import { FC } from "react";
import styled from "styled-components";
import {
  MonthlyStaffSchedule,
  WorkShift,
} from "@bublys-org/hotel-shift-puzzle-model";
import { ScheduleListView } from "../ui/ScheduleListView.js";
import { useObjects, useObjectRepo } from "../objects/repository.js";
import { useSeedHotelData } from "../objects/seed.js";
import { SCHEDULE_TYPE, WORKSHIFT_TYPE } from "../objects/hotelObjects.js";

/** 新しい勤務表の ID を生成する */
const newScheduleId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `sched-${Date.now()}`;

export const ScheduleCollection: FC = () => {
  useSeedHotelData();
  const schedules = useObjects<MonthlyStaffSchedule>(SCHEDULE_TYPE);
  const workShifts = useObjects<WorkShift>(WORKSHIFT_TYPE);
  const scheduleActions = useObjectRepo<MonthlyStaffSchedule>(SCHEDULE_TYPE);

  const handleCreate = (params: { storeId: string; year: number; month: number }) => {
    // 集約のファクトリで作成し、リポジトリへ保存する
    const schedule = MonthlyStaffSchedule.create({
      id: newScheduleId(),
      storeId: params.storeId,
      year: params.year,
      month: params.month,
      workShiftIds: workShifts.map((w) => w.id),
    });
    scheduleActions.save(schedule);
  };

  const handleRemove = (id: string) => {
    scheduleActions.remove(id);
  };

  return (
    <StyledContainer>
      <div className="e-header">
        <h3>勤務表一覧 ({schedules.length})</h3>
      </div>
      <ScheduleListView
        schedules={schedules}
        onCreate={handleCreate}
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
