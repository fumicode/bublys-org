'use client';

import { FC, useEffect } from "react";
import styled from "styled-components";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import {
  selectStaffList,
  setStaffList,
  selectScheduleList,
  setScheduleList,
} from "../slice/index.js";
import { ScheduleGridView } from "../ui/ScheduleGridView.js";
import { createSampleStaffList } from "../data/sampleStaff.js";
import { createSampleSchedule } from "../data/sampleSchedule.js";
import { buildStaffDetailUrl } from "./StaffCollection.js";

type ScheduleGridProps = {
  scheduleId?: string;
};

export const ScheduleGrid: FC<ScheduleGridProps> = ({ scheduleId }) => {
  const dispatch = useAppDispatch();
  const staffList = useAppSelector(selectStaffList);
  const scheduleList = useAppSelector(selectScheduleList);

  // 初期データのロード（空ならサンプルを投入）
  useEffect(() => {
    if (staffList.length === 0) {
      dispatch(setStaffList(createSampleStaffList().map((s) => s.state)));
    }
  }, [dispatch, staffList.length]);

  useEffect(() => {
    if (scheduleList.length === 0) {
      dispatch(setScheduleList([createSampleSchedule().toPlain()]));
    }
  }, [dispatch, scheduleList.length]);

  const schedule = scheduleId
    ? scheduleList.find((s) => s.id === scheduleId)
    : scheduleList[0];

  if (!schedule) {
    return <div style={{ padding: 16, color: "#666" }}>勤務表を読み込み中…</div>;
  }

  return (
    <StyledContainer>
      <div className="e-header">
        <h3>
          勤務表 <span className="e-sub">{schedule.year}年{schedule.month}月 / {schedule.storeId}</span>
        </h3>
      </div>
      <ScheduleGridView
        schedule={schedule}
        staffList={staffList}
        buildStaffUrl={buildStaffDetailUrl}
      />
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  .e-header {
    margin-bottom: 8px;

    h3 {
      margin: 0;
    }
    .e-sub {
      font-weight: normal;
      font-size: 0.8em;
      color: #777;
    }
  }
`;
