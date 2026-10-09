'use client';

import { FC } from "react";
import { ScheduleReport } from "@bublys-org/hotel-shift-puzzle-model";
import { ScheduleReportListView } from "../ui/ScheduleReportListView.js";
import { useObjects } from "../objects/repository.js";
import { SCHEDULE_REPORT_TYPE } from "../objects/hotelObjects.js";
import { useAppStore } from "@bublys-org/state-management";
import { confirmedAtOf } from "./precedingMonth.js";

/**
 * シフト完成レポート一覧バブル。次回シフト作成前に過去レポートを参照する入口
 * （勤務表一覧バブルから開く）。
 */
export const ScheduleReportList: FC = () => {
  const store = useAppStore();
  const reports = useObjects<ScheduleReport>(SCHEDULE_REPORT_TYPE);
  const atOf = (r: ScheduleReport) => confirmedAtOf(store, r);
  // 年月の新しい順。同じ月に確定が複数あれば、確定の新しい順
  const sorted = [...reports].sort(
    (a, b) =>
      b.year - a.year ||
      b.month - a.month ||
      (atOf(b) ?? -Infinity) - (atOf(a) ?? -Infinity)
  );
  return <ScheduleReportListView reports={sorted} confirmedAtOf={atOf} />;
};
