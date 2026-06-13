'use client';

import { FC } from "react";
import styled from "styled-components";
import {
  Staff,
  WorkShift,
  MonthlyStaffSchedule,
  type WorkingDay,
  type ShiftCell,
} from "@bublys-org/hotel-shift-puzzle-model";
import { ScheduleGridView } from "../ui/ScheduleGridView.js";
import { useObjects, useObject, useObjectRepo } from "../objects/repository.js";
import { useSeedHotelData } from "../objects/seed.js";
import { STAFF_TYPE, WORKSHIFT_TYPE, SCHEDULE_TYPE } from "../objects/hotelObjects.js";

type ScheduleGridProps = {
  scheduleId?: string;
  /** 世界線ビューを開くハンドラ（ヘッダ右上のリンク用） */
  onOpenHistory?: () => void;
};

/**
 * 勤務表グリッド。取得も保存も統一リポジトリ経由。
 * セル編集は集約メソッドを呼んで save するだけで、自動的に世界線へ記録される。
 */
export const ScheduleGrid: FC<ScheduleGridProps> = ({ scheduleId, onOpenHistory }) => {
  useSeedHotelData();
  const staffList = useObjects<Staff>(STAFF_TYPE);
  const workShifts = useObjects<WorkShift>(WORKSHIFT_TYPE);
  const schedule = useObject<MonthlyStaffSchedule>(SCHEDULE_TYPE, scheduleId);
  const scheduleActions = useObjectRepo<MonthlyStaffSchedule>(SCHEDULE_TYPE);

  if (!schedule) {
    return <div style={{ padding: 16, color: "#666" }}>勤務表を読み込み中…</div>;
  }

  // セル編集: 集約のメソッドを呼んで save → 自動で世界線に記録される
  const handleChangeCell = (staffId: string, day: WorkingDay, to: ShiftCell) => {
    scheduleActions.save(schedule.setCell(staffId, day, to));
  };

  return (
    <StyledContainer>
      <div className="e-header">
        <h3>
          勤務表{" "}
          <span className="e-sub">
            {schedule.year}年{schedule.month}月 / {schedule.storeId}
          </span>
        </h3>
        {onOpenHistory && (
          <button type="button" className="e-history" onClick={onOpenHistory}>
            🌐 世界線ビュー
          </button>
        )}
      </div>
      <ScheduleGridView
        schedule={schedule}
        staffList={staffList}
        workShifts={workShifts}
        onChangeCell={handleChangeCell}
      />
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  .e-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;

    h3 {
      margin: 0;
    }
    .e-sub {
      font-weight: normal;
      font-size: 0.8em;
      color: #777;
    }
    .e-history {
      flex-shrink: 0;
      border: 1px solid #cfd8dc;
      border-radius: 6px;
      background: #fff;
      color: #37474f;
      font-size: 0.8em;
      padding: 4px 10px;
      cursor: pointer;
      transition: background 0.1s, border-color 0.1s;

      &:hover {
        background: #eceff1;
        border-color: #90a4ae;
      }
    }
  }
`;
