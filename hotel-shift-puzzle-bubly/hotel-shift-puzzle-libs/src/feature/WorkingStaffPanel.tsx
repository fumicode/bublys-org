'use client';

import { FC, useEffect } from "react";
import styled from "styled-components";
import {
  MonthlyStaffSchedule,
  WorkShift,
  WorkShiftSet,
  createDefaultWorkShiftSet,
} from "@bublys-org/hotel-shift-puzzle-model";
import { WorkingStaffListView } from "../ui/WorkingStaffListView.js";
import {
  useObject,
  useObjectShell,
  useObjectRepo,
  useObjectsPending,
} from "../objects/repository.js";
import { SCHEDULE_TYPE, WORKSHIFT_SET_TYPE } from "../objects/hotelObjects.js";
import { ScheduleWorld } from "./ScheduleWorld.js";
import { useWorkingStaff } from "./workingStaff.js";

type Props = {
  scheduleId: string;
};

/** 新しい勤務帯の ID を生成する（採番は feature 層の仕事） */
const newWorkShiftId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `shift-${Date.now()}`;

/**
 * 勤務スタッフ群バブル。**この勤務表のスタッフに関することはここで全部できる。**
 * 足す・外す・並べ替える・臨時の人を作る・誰がどの勤務帯に入れるかを決める。
 * チェック欄の列（この勤務表の勤務帯セット）もここで足す・直す・消す。
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
    allowShiftForAll,
  } = useWorkingStaff(scheduleId);

  // チェック欄の列＝この勤務表の勤務帯セット（id=scheduleId）
  const { object: workShiftSet, update: updateSet } = useObjectShell<WorkShiftSet>(
    WORKSHIFT_SET_TYPE,
    scheduleId
  );
  const setRepo = useObjectRepo<WorkShiftSet>(WORKSHIFT_SET_TYPE);

  // 「無ければ作る」は状態が揃うまで動かさない。メモリ上の CAS は 300 件で頭打ちなので、
  // 追い出されただけの勤務帯セットを「無い」と読んで既定で上書きすると中身が消える。
  const pending = useObjectsPending();
  useEffect(() => {
    if (pending) return;
    if (schedule && !workShiftSet) {
      setRepo.save(createDefaultWorkShiftSet(scheduleId));
    }
  }, [pending, schedule, workShiftSet, scheduleId, setRepo]);

  // 勤務帯の追加／編集を確定する（✅ 押下時に1回だけ呼ばれる → 世界線への記録も1回）
  const handleCommitShift = (
    id: string | null,
    draft: { name: string; hour: number }
  ) => {
    const name = draft.name.trim() || "新しい勤務帯";
    if (id === null) {
      // 追加：セットに足し、既定で全スタッフ許可にする
      // （絞っていない人は元から入れるので、実際に足すのは絞っている人だけ）
      const newId = newWorkShiftId();
      updateSet((s) => s.addShift(WorkShift.of(newId, name, { hour: draft.hour })));
      allowShiftForAll(newId, name);
    } else {
      // 更新：改名と時刻変更をまとめて1インスタンスにして保存（1コミット）
      updateSet((s) => s.rename(id, name).changeStart(id, { hour: draft.hour }));
    }
  };

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
          チェックでその人が入れる勤務帯を決めます（列の ✏️・＋ で勤務帯そのものも編集）。
          ここでの編集は
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
        onCommitShift={workShiftSet ? handleCommitShift : undefined}
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

/**
 * この勤務表の世界に入ってから中身を描く。
 * 中の useObjects / useObject は、型の membership に従ってこの世界かグローバルかを選ぶ。
 */
export const WorkingStaffPanel: FC<Props> = (props) => (
  <ScheduleWorld scheduleId={props.scheduleId}>
    <WorkingStaffPanelBody {...props} />
  </ScheduleWorld>
);
