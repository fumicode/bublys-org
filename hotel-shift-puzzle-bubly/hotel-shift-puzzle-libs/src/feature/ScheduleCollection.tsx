'use client';

import { FC } from "react";
import styled from "styled-components";
import { ObjectView } from "@bublys-org/bubbles-ui";
import { SCHEDULE_REPORT_LIST_VIEW_TYPE } from "../ui/viewObjectTypes.js";
import { MonthlyStaffSchedule } from "@bublys-org/hotel-shift-puzzle-model";
import { useAppStore } from "@bublys-org/state-management";
import { ScheduleListView } from "../ui/ScheduleListView.js";
import { useObjects, useObjectRepo } from "../objects/repository.js";
import { createSchedule } from "./createSchedule.js";
import { SCHEDULE_TYPE } from "../objects/hotelObjects.js";

type ScheduleCollectionProps = {
  /** シフト完成レポート一覧バブルを開くハンドラ（次回シフト作成前の参照用） */
  /** シフト完成レポート一覧のURL（ダブルクリックで開く先）。URL スキームは app 層の関心事 */
  reportListUrl?: string;
};

export const ScheduleCollection: FC<ScheduleCollectionProps> = ({ reportListUrl }) => {
  const store = useAppStore();
  const schedules = useObjects<MonthlyStaffSchedule>(SCHEDULE_TYPE);
  const scheduleActions = useObjectRepo<MonthlyStaffSchedule>(SCHEDULE_TYPE);

  // 勤務表を作る＝その世界が生まれる。勤務表・勤務帯セット・可能勤務帯・固定メンバー
  // （そのときのスタッフ名簿）が1ノードにまとまる。詳しくは createSchedule.ts。
  const handleCreate = (params: { storeId: string; year: number; month: number }) => {
    createSchedule(store, params);
  };

  const handleRemove = (id: string) => {
    scheduleActions.remove(id);
  };

  return (
    <StyledContainer>
      <div className="e-header">
        <h3>勤務表一覧 ({schedules.length})</h3>
        {reportListUrl && (
          <ObjectView
            type={SCHEDULE_REPORT_LIST_VIEW_TYPE}
            url={reportListUrl}
            label="シフト完成レポート一覧"
            openingPosition="bubble-side-right"
            className="e-reports-slot"
          >
            <span
              className="e-reports"
              title="ダブルクリックでシフト完成レポート一覧を開く"
            >
              📋 シフト完成レポート一覧
            </span>
          </ObjectView>
        )}
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
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;

    h3 {
      margin: 0;
    }

    /* ObjectView のラッパ span。.e-header は flex なので、右寄せの指定は
       中のチップではなくラッパ側に載せないと効かない */
    .e-reports-slot {
      margin-left: auto;
    }

    .e-reports {
      display: inline-flex;
      align-items: center;
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
