'use client';

import { FC, useMemo } from "react";
import styled from "styled-components";
import {
  MonthlyStaffSchedule,
  ConstraintSet,
  ConfirmedSchedule,
} from "@bublys-org/hotel-shift-puzzle-model";
import { useAppStore } from "@bublys-org/state-management";
import { ScheduleListView } from "../ui/ScheduleListView.js";
import { useObject, useObjects, useObjectRepo } from "../objects/repository.js";
import { createSchedule } from "./createSchedule.js";
import {
  captureInheritance,
  pendingInheritanceOf,
  precedingConfirmedOf,
} from "./precedingMonth.js";
import {
  SCHEDULE_TYPE,
  CONFIRMED_SCHEDULE_TYPE,
  CONSTRAINT_SET_TYPE,
  GLOBAL_CONSTRAINT_SET_ID,
} from "../objects/hotelObjects.js";

export const ScheduleCollection: FC = () => {
  const store = useAppStore();
  const schedules = useObjects<MonthlyStaffSchedule>(SCHEDULE_TYPE);
  const scheduleActions = useObjectRepo<MonthlyStaffSchedule>(SCHEDULE_TYPE);
  const reports = useObjects<ConfirmedSchedule>(CONFIRMED_SCHEDULE_TYPE);
  // 新しい勤務表はグローバルの制約セットを写して始まるので、何日写すかもそれで決める
  const globalConstraints = useObject<ConstraintSet>(CONSTRAINT_SET_TYPE, GLOBAL_CONSTRAINT_SET_ID);

  // 勤務表を作る＝その世界が生まれる。勤務表・勤務帯セット・可能勤務帯・固定メンバー
  // （そのときのスタッフ名簿）が1ノードにまとまる。詳しくは createSchedule.ts。
  // 勤務表は、前月の確定版から引き継いで始まる（月末の勤務と★。precedingMonth.ts）。
  const handleCreate = async (params: { storeId: string; year: number; month: number }) => {
    const confirmed = precedingConfirmedOf(reports, params);
    // 確定版が読めなくても勤務表は作る（引き継がず、今月1日から数える。取り込みは後からできる）
    const inheritance = confirmed
      ? await captureInheritance(
          store,
          confirmed,
          globalConstraints?.maxConsecutiveWorkdays ?? ConstraintSet.empty("").maxConsecutiveWorkdays
        ).catch((e) => {
          console.warn("前月の確定版を読み出せませんでした", e);
          return undefined;
        })
      : undefined;
    createSchedule(store, { ...params, inheritance });
  };

  // 一覧に引き継ぎを直接出す（#231）。確定版を持つ勤務表には 🏁、取り込んでいない
  // 前月の確定版がある勤務表には「新しい確定版あり」を添える
  const confirmedScheduleIds = useMemo(
    () => new Set(reports.map((r) => r.scheduleId)),
    [reports]
  );
  const pendingScheduleIds = useMemo(
    () =>
      new Set(
        schedules
          .filter((s) => pendingInheritanceOf(precedingConfirmedOf(reports, s), s.precedingTail))
          .map((s) => s.id)
      ),
    [schedules, reports]
  );

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
        confirmedScheduleIds={confirmedScheduleIds}
        pendingScheduleIds={pendingScheduleIds}
        onCreate={handleCreate}
        onRemove={handleRemove}
      />
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  .e-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;

    h3 {
      margin: 0;
    }
  }
`;
