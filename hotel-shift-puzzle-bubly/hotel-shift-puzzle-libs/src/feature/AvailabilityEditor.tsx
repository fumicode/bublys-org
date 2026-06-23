'use client';

import { FC, useEffect } from "react";
import styled from "styled-components";
import {
  Staff,
  WorkShift,
  MonthlyStaffSchedule,
  ScheduleAvailability,
} from "@bublys-org/hotel-shift-puzzle-model";
import { AvailabilityGridView } from "../ui/AvailabilityGridView.js";
import { useObjects, useObject, useObjectShell, useObjectRepo } from "../objects/repository.js";
import {
  STAFF_TYPE,
  WORKSHIFT_TYPE,
  SCHEDULE_TYPE,
  SCHEDULE_AVAILABILITY_TYPE,
} from "../objects/hotelObjects.js";

type Props = {
  scheduleId: string;
};

/**
 * 可能勤務帯エディタ。勤務表に紐づく ScheduleAvailability をシェル経由で編集する。
 * 編集すると、勤務表と同じローカル世界線に記録される（case B）。
 */
export const AvailabilityEditor: FC<Props> = ({ scheduleId }) => {
  const staffList = useObjects<Staff>(STAFF_TYPE);
  const allWorkShifts = useObjects<WorkShift>(WORKSHIFT_TYPE);
  const schedule = useObject<MonthlyStaffSchedule>(SCHEDULE_TYPE, scheduleId);
  const { object: availability, update } = useObjectShell<ScheduleAvailability>(
    SCHEDULE_AVAILABILITY_TYPE,
    scheduleId
  );
  const repo = useObjectRepo<ScheduleAvailability>(SCHEDULE_AVAILABILITY_TYPE);

  // 無ければ既定（全許可）を作成
  useEffect(() => {
    if (schedule && !availability && staffList.length > 0) {
      repo.save(
        ScheduleAvailability.create(
          scheduleId,
          staffList.map((s) => s.id),
          schedule.workShiftIds
        )
      );
    }
  }, [availability, schedule, staffList.length, scheduleId, repo]);

  if (!schedule || !availability) {
    return <div style={{ padding: 16, color: "#666" }}>読み込み中…</div>;
  }

  const shifts = schedule.workShiftIds
    .map((id) => allWorkShifts.find((w) => w.id === id))
    .filter((w): w is WorkShift => !!w);

  return (
    <StyledContainer>
      <div className="e-header">
        <h3>可能勤務帯 <span className="e-sub">{schedule.year}年{schedule.month}月</span></h3>
        <p className="e-note">各スタッフが入れる勤務帯にチェック。勤務表と同じ世界線で記録されます。</p>
      </div>
      <AvailabilityGridView
        staffList={staffList}
        workShifts={shifts}
        availability={availability}
        onToggle={(staffId, shiftId) => update((a) => a.toggle(staffId, shiftId))}
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
    .e-note {
      margin: 4px 0 0;
      font-size: 0.78em;
      color: #888;
    }
  }
`;
