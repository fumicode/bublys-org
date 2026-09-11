'use client';

import { FC } from "react";
import styled from "styled-components";
import { MonthlyStaffSchedule } from "@bublys-org/hotel-shift-puzzle-model";
import { WorkingStaffListView } from "../ui/WorkingStaffListView.js";
import { useObject } from "../objects/repository.js";
import { SCHEDULE_TYPE } from "../objects/hotelObjects.js";
import { ScheduleWorld } from "./ScheduleWorld.js";
import { useWorkingStaff } from "./workingStaff.js";

type Props = {
  scheduleId: string;
};

/**
 * 勤務スタッフ群バブル。**この勤務表のスタッフに関することはここで全部できる。**
 * 足す・外す・並べ替える・臨時の人を作る・誰がどの勤務帯に入れるかを決める。
 *
 * 編集はすべてこの勤務表の世界線に記録される。グローバルの名簿は動かないので、
 * 「この月だけ応援を1人入れる」「この月はこの人を外す」が勤務表の中で完結する。
 */
const WorkingStaffPanelBody: FC<Props> = ({ scheduleId }) => {
  const schedule = useObject<MonthlyStaffSchedule>(SCHEDULE_TYPE, scheduleId);
  const {
    staffList,
    roster,
    isTemporary,
    canEdit,
    addFromRoster,
    addTemporary,
    remove,
    move,
    renameTemporary,
    workShifts,
    isAllowed,
    toggleShift,
  } = useWorkingStaff(scheduleId);

  // 勤務表が読めないと群の住所（workingStaffGroupId）も分からない。空で描かずに待つ。
  if (!schedule) {
    return <div style={{ padding: 16, color: "#666" }}>読み込み中…</div>;
  }

  return (
    <StyledContainer>
      <div className="e-header">
        <h3>
          勤務スタッフ{" "}
          <span className="e-sub">
            {schedule.year}年{schedule.month}月（{staffList.length}名）
          </span>
        </h3>
        <p className="e-note">
          この勤務表の行になる人たち。左の名簿から ＋ で加え、⠿ をドラッグで並び替え、
          チェックでその人が入れる勤務帯を決めます。ここでの編集は
          <strong>この勤務表の世界線にだけ</strong>記録され、スタッフ名簿は動きません。
        </p>
      </div>
      <WorkingStaffListView
        members={staffList}
        isTemporary={isTemporary}
        roster={roster}
        workShifts={workShifts}
        isAllowed={isAllowed}
        editable={canEdit}
        onAddTemporary={addTemporary}
        onAddFromRoster={addFromRoster}
        onRemove={remove}
        onMove={move}
        onRenameTemporary={renameTemporary}
        onToggleShift={toggleShift}
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

/**
 * この勤務表の世界に入ってから中身を描く。
 * 中の useObjects / useObject は、型の membership に従ってこの世界かグローバルかを選ぶ。
 */
export const WorkingStaffPanel: FC<Props> = (props) => (
  <ScheduleWorld scheduleId={props.scheduleId}>
    <WorkingStaffPanelBody {...props} />
  </ScheduleWorld>
);
