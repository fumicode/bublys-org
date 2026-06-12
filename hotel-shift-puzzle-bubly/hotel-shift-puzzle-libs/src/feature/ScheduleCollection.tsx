'use client';

import { FC, useEffect } from "react";
import styled from "styled-components";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import { MonthlyStaffSchedule } from "@bublys-org/hotel-shift-puzzle-model";
import {
  selectScheduleList,
  setScheduleList,
  addSchedule,
  removeSchedule,
  selectWorkShiftList,
  setWorkShiftList,
} from "../slice/index.js";
import { ScheduleListView } from "../ui/ScheduleListView.js";
import { createSampleWorkShifts } from "../data/sampleWorkShifts.js";
import { createSampleSchedule } from "../data/sampleSchedule.js";

/** 勤務表グリッドバブルの URL を組み立てる */
export const buildScheduleUrl = (id: string) => `hotel-shift-puzzle/schedules/${id}`;

/** 新しい勤務表の ID を生成する */
const newScheduleId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `sched-${Date.now()}`;

export const ScheduleCollection: FC = () => {
  const dispatch = useAppDispatch();
  const schedules = useAppSelector(selectScheduleList);
  const workShifts = useAppSelector(selectWorkShiftList);

  // 初期データのロード（空ならサンプルを投入）
  useEffect(() => {
    if (workShifts.length === 0) {
      dispatch(setWorkShiftList(createSampleWorkShifts().map((w) => w.state)));
    }
  }, [dispatch, workShifts.length]);

  useEffect(() => {
    if (schedules.length === 0) {
      dispatch(setScheduleList([createSampleSchedule().toPlain()]));
    }
  }, [dispatch, schedules.length]);

  const handleCreate = (params: { storeId: string; year: number; month: number }) => {
    // 集約のファクトリで作成し、リポジトリ（スライス）へ保存する
    const schedule = MonthlyStaffSchedule.create({
      id: newScheduleId(),
      storeId: params.storeId,
      year: params.year,
      month: params.month,
      workShiftIds: workShifts.map((w) => w.id),
    });
    dispatch(addSchedule(schedule.toPlain()));
  };

  const handleRemove = (id: string) => {
    dispatch(removeSchedule(id));
  };

  return (
    <StyledContainer>
      <div className="e-header">
        <h3>勤務表一覧 ({schedules.length})</h3>
      </div>
      <ScheduleListView
        schedules={schedules}
        buildScheduleUrl={buildScheduleUrl}
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
