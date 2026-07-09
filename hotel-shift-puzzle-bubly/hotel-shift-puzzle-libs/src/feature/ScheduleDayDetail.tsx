'use client';

import { FC, useMemo } from "react";
import styled from "styled-components";
import {
  Staff,
  WorkShift,
  MonthlyStaffSchedule,
  ScheduleAvailability,
  ScheduleConstraints,
  StaffMonthlyShiftWish,
  WorkingDay,
  type ShiftCell,
} from "@bublys-org/hotel-shift-puzzle-model";
import { ScheduleDayView } from "../ui/ScheduleDayView.js";
import { useObjects, useObject, useObjectShell } from "../objects/repository.js";
import { useSeedHotelData } from "../objects/seed.js";
import {
  STAFF_TYPE,
  WORKSHIFT_TYPE,
  SCHEDULE_TYPE,
  SCHEDULE_AVAILABILITY_TYPE,
  SCHEDULE_CONSTRAINTS_TYPE,
  STAFF_SHIFT_WISH_TYPE,
} from "../objects/hotelObjects.js";

type ScheduleDayDetailProps = {
  scheduleId?: string;
  /** 稼働日キー（"2026-06-01"） */
  dayKey: string;
};

/**
 * 稼働日 1 日ぶんの詳細バブル。
 * 勤務表グリッドの日付ヘッダをクリックして開く（その日だけを切り出したビュー）。
 * 編集はシェル経由：update(s => s.setCell(...)) を呼ぶだけで、勤務表を監視している
 * 世界線すべてへ自動保存される（グリッドと同じ仕組み）。
 */
export const ScheduleDayDetail: FC<ScheduleDayDetailProps> = ({ scheduleId, dayKey }) => {
  useSeedHotelData();
  const staffList = useObjects<Staff>(STAFF_TYPE);
  const allWorkShifts = useObjects<WorkShift>(WORKSHIFT_TYPE);
  const availability = useObject<ScheduleAvailability>(
    SCHEDULE_AVAILABILITY_TYPE,
    scheduleId
  );
  const { object: schedule, update } = useObjectShell<MonthlyStaffSchedule>(
    SCHEDULE_TYPE,
    scheduleId
  );

  // 責任者ルール（早責/夜責）は勤務表ごとの制約オブジェクトから読む。名前横のバッジに使う
  const constraints = useObject<ScheduleConstraints>(
    SCHEDULE_CONSTRAINTS_TYPE,
    scheduleId
  );
  const leaderRules = useMemo(() => constraints?.leaderRules ?? [], [constraints]);

  // この勤務表と同じ年月のシフト希望を staffId 別に引けるようにする（本人の希望表示用）
  const allWishes = useObjects<StaffMonthlyShiftWish>(STAFF_SHIFT_WISH_TYPE);
  const wishByStaff = useMemo(() => {
    const map = new Map<string, StaffMonthlyShiftWish>();
    if (schedule) {
      for (const w of allWishes) {
        if (w.year === schedule.year && w.month === schedule.month) {
          map.set(w.staffId, w);
        }
      }
    }
    return map;
  }, [allWishes, schedule]);

  if (!schedule) {
    return <div style={{ padding: 16, color: "#666" }}>勤務表を読み込み中…</div>;
  }

  const day = WorkingDay.fromKey(dayKey);

  // この勤務表で使える勤務帯（workShiftIds を解決）
  const shiftOptions = schedule.workShiftIds
    .map((id) => allWorkShifts.find((w) => w.id === id))
    .filter((w): w is WorkShift => !!w);

  const handleChangeCell = (staffId: string, to: ShiftCell) => {
    update((s) => s.setCell(staffId, day, to));
  };

  return (
    <StyledContainer>
      <div className="e-header">
        <h3>
          稼働日{" "}
          <span className="e-sub">
            {schedule.year}年{day.label} / {schedule.storeId}
          </span>
        </h3>
      </div>
      <ScheduleDayView
        day={day}
        schedule={schedule}
        staffList={staffList}
        workShifts={shiftOptions}
        availability={availability}
        leaderRules={leaderRules}
        wishByStaff={wishByStaff}
        onChangeCell={handleChangeCell}
      />
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  padding: 8px;

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
