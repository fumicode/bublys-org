'use client';

import { FC } from "react";
import { ScheduleReport } from "@bublys-org/hotel-shift-puzzle-model";
import { ScheduleReportListView } from "../ui/ScheduleReportListView.js";
import { useObjects } from "../objects/repository.js";
import { SCHEDULE_REPORT_TYPE } from "../objects/hotelObjects.js";

/**
 * シフト完成レポート一覧バブル。次回シフト作成前に過去レポートを参照する入口
 * （勤務表一覧バブルから開く）。
 */
export const ScheduleReportList: FC = () => {
  const reports = useObjects<ScheduleReport>(SCHEDULE_REPORT_TYPE);
  const sorted = [...reports].sort((a, b) => b.year - a.year || b.month - a.month);
  return <ScheduleReportListView reports={sorted} />;
};
