'use client';

import { FC } from "react";
import styled from "styled-components";
import {
  Staff,
  MonthlyStaffSchedule,
  WorkShiftSet,
  createDefaultWorkShiftSet,
  ScheduleAvailability,
} from "@bublys-org/hotel-shift-puzzle-model";
import { useAppStore } from "@bublys-org/state-management";
import { ScheduleListView } from "../ui/ScheduleListView.js";
import { useObjects, useObjectRepo } from "../objects/repository.js";
import { useSeedHotelData } from "../objects/seed.js";
import { adoptGlobalObject, saveObject } from "../objects/commit.js";
import {
  STAFF_TYPE,
  SCHEDULE_TYPE,
  WORKSHIFT_SET_TYPE,
  GLOBAL_WORKSHIFT_SET_ID,
  SCHEDULE_AVAILABILITY_TYPE,
} from "../objects/hotelObjects.js";

/** 新しい勤務表の ID を生成する */
const newScheduleId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `sched-${Date.now()}`;

export const ScheduleCollection: FC = () => {
  useSeedHotelData();
  const store = useAppStore();
  const schedules = useObjects<MonthlyStaffSchedule>(SCHEDULE_TYPE);
  const staffList = useObjects<Staff>(STAFF_TYPE);
  const scheduleActions = useObjectRepo<MonthlyStaffSchedule>(SCHEDULE_TYPE);
  const availabilityActions = useObjectRepo<ScheduleAvailability>(SCHEDULE_AVAILABILITY_TYPE);

  const handleCreate = (params: { storeId: string; year: number; month: number }) => {
    const id = newScheduleId();
    // 集約のファクトリで作成し、リポジトリへ保存する
    scheduleActions.save(
      MonthlyStaffSchedule.create({
        id,
        storeId: params.storeId,
        year: params.year,
        month: params.month,
      })
    );
    // グローバルの勤務帯セットをこの勤務表の世界線へ取り込む（id=scheduleId の独自セットになる）。
    // グローバル未投入時は既定セットへフォールバック。
    let workShiftSet = adoptGlobalObject<WorkShiftSet>(
      store,
      WORKSHIFT_SET_TYPE,
      (global) => global.withId(id),
      GLOBAL_WORKSHIFT_SET_ID
    );
    if (!workShiftSet) {
      workShiftSet = createDefaultWorkShiftSet(id);
      saveObject(store, WORKSHIFT_SET_TYPE, workShiftSet);
    }
    // 紐づく可能勤務帯（全許可）も作る
    availabilityActions.save(
      ScheduleAvailability.create(id, staffList.map((s) => s.id), workShiftSet.shiftIds())
    );
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
