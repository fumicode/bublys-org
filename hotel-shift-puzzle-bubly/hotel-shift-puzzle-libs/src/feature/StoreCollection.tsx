'use client';

import { FC, useMemo } from "react";
import styled from "styled-components";
import {
  HOTEL_FORMAT,
  MonthlyStaffSchedule,
  Store,
  type PeriodRuleKind,
  type StoreFormat,
} from "@bublys-org/hotel-shift-puzzle-model";
import { StoreListView } from "../ui/StoreListView.js";
import { useObjects, useObjectRepo } from "../objects/repository.js";
import { SCHEDULE_TYPE, STORE_TYPE } from "../objects/hotelObjects.js";
import { todayWorkingDay } from "./today.js";

/** 新しい店舗の ID（採番は feature 層の仕事） */
const newStoreId = (): string => globalThis.crypto?.randomUUID?.() ?? `store-${Date.now()}`;

/**
 * 店舗の一覧と編集。
 *
 * 選べる形態・区切り方はアプリが決めて渡す（作りかけのものを本番に出さないため）。
 * 省略時はホテル・暦月だけ。
 */
export const StoreCollection: FC<{
  formats?: readonly StoreFormat[];
  ruleKinds?: readonly PeriodRuleKind[];
}> = ({ formats = [HOTEL_FORMAT], ruleKinds = ["calendar-month"] }) => {
  const stores = useObjects<Store>(STORE_TYPE);
  const repo = useObjectRepo<Store>(STORE_TYPE);
  // 店舗を使っている勤務表の数（削除のときに確認を取る）
  const schedules = useObjects<MonthlyStaffSchedule>(SCHEDULE_TYPE);
  const scheduleCountOf = (storeId: string) =>
    schedules.filter((s) => s.storeId === storeId).length;
  const today = useMemo(() => todayWorkingDay(), []);

  return (
    <StyledContainer>
      <div className="e-header">
        <h3>店舗一覧 ({stores.length})</h3>
      </div>
      <StoreListView
        stores={stores}
        formats={formats}
        ruleKinds={ruleKinds}
        today={today}
        onCreate={(name, format) =>
          repo.save(Store.create({ id: newStoreId(), name, format, today }))
        }
        onSave={(store) => repo.save(store)}
        scheduleCountOf={scheduleCountOf}
        onRemove={(id) => repo.remove(id)}
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
