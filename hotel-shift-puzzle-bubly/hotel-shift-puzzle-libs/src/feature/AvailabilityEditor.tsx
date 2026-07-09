'use client';

import { FC, useEffect } from "react";
import styled from "styled-components";
import {
  Staff,
  WorkShift,
  WorkShiftSet,
  createDefaultWorkShiftSet,
  MonthlyStaffSchedule,
  ScheduleAvailability,
} from "@bublys-org/hotel-shift-puzzle-model";
import { AvailabilityGridView } from "../ui/AvailabilityGridView.js";
import { useObjects, useObject, useObjectShell, useObjectRepo } from "../objects/repository.js";
import {
  STAFF_TYPE,
  WORKSHIFT_SET_TYPE,
  SCHEDULE_TYPE,
  SCHEDULE_AVAILABILITY_TYPE,
} from "../objects/hotelObjects.js";

type Props = {
  scheduleId: string;
};

/** 新しい勤務帯の ID を生成する */
const newWorkShiftId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `shift-${Date.now()}`;

/**
 * 可能勤務帯エディタ。勤務表に紐づく ScheduleAvailability をシェル経由で編集する。
 * あわせて、この勤務表の勤務帯セット（WorkShiftSet, id=scheduleId）も列として編集できる
 * （＋で追加・✏️で改名/時刻変更・削除）。どちらの編集も勤務表と同じローカル世界線に記録される（case B）。
 */
export const AvailabilityEditor: FC<Props> = ({ scheduleId }) => {
  const staffList = useObjects<Staff>(STAFF_TYPE);
  const schedule = useObject<MonthlyStaffSchedule>(SCHEDULE_TYPE, scheduleId);
  const { object: workShiftSet, update: updateSet } = useObjectShell<WorkShiftSet>(
    WORKSHIFT_SET_TYPE,
    scheduleId
  );
  const setRepo = useObjectRepo<WorkShiftSet>(WORKSHIFT_SET_TYPE);
  const { object: availability, update } = useObjectShell<ScheduleAvailability>(
    SCHEDULE_AVAILABILITY_TYPE,
    scheduleId
  );
  const repo = useObjectRepo<ScheduleAvailability>(SCHEDULE_AVAILABILITY_TYPE);

  // 勤務帯セットが無ければ既定（グローバルのコピー相当）を作成
  useEffect(() => {
    if (schedule && !workShiftSet) {
      setRepo.save(createDefaultWorkShiftSet(scheduleId));
    }
  }, [schedule, workShiftSet, scheduleId, setRepo]);

  // 可能勤務帯が無ければ既定（全許可）を作成
  useEffect(() => {
    if (schedule && workShiftSet && !availability && staffList.length > 0) {
      repo.save(
        ScheduleAvailability.create(
          scheduleId,
          staffList.map((s) => s.id),
          workShiftSet.shiftIds()
        )
      );
    }
  }, [availability, schedule, workShiftSet, staffList.length, scheduleId, repo]);

  if (!schedule || !workShiftSet || !availability) {
    return <div style={{ padding: 16, color: "#666" }}>読み込み中…</div>;
  }

  const shifts = workShiftSet.shifts;
  const shiftGroups = workShiftSet.groupedByName();

  // 勤務帯の追加／編集を確定する（フォームの ✅ 押下時に1回だけ呼ばれる → 世界線への記録も1回）。
  const handleCommitShift = (
    id: string | null,
    draft: { name: string; hour: number }
  ) => {
    const name = draft.name.trim() || "新しい勤務帯";
    if (id === null) {
      // 追加：セットに足し、既定で全スタッフ許可にする
      const newId = newWorkShiftId();
      updateSet((s) => s.addShift(WorkShift.of(newId, name, { hour: draft.hour })));
      update((a) => a.allowForAll(staffList.map((s) => s.id), newId));
    } else {
      // 更新：改名と時刻変更をまとめて1インスタンスにして保存（1コミット）
      updateSet((s) => s.rename(id, name).changeStart(id, { hour: draft.hour }));
    }
  };

  return (
    <StyledContainer>
      <div className="e-header">
        <h3>可能勤務帯 <span className="e-sub">{schedule.year}年{schedule.month}月</span></h3>
        <p className="e-note">各スタッフが入れる勤務帯にチェック。列の ✏️ で編集、＋で追加し、✅ で確定します（確定時に勤務表と同じ世界線へ記録）。</p>
      </div>
      <AvailabilityGridView
        staffList={staffList}
        workShifts={shifts}
        shiftGroups={shiftGroups}
        availability={availability}
        onToggle={(staffId, shiftId) => update((a) => a.toggle(staffId, shiftId))}
        editable
        onCommitShift={handleCommitShift}
        onRemoveShift={(id) => updateSet((s) => s.remove(id))}
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
