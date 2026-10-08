'use client';

import { FC, useMemo } from "react";
import {
  Staff,
  ConstraintSet,
  ScheduleReport,
  MonthlyStaffSchedule,
  StaffMonthlyShiftWish,
} from "@bublys-org/hotel-shift-puzzle-model";
import { StaffDetailView } from "../ui/StaffDetailView.js";
import { useObject, useObjects, useObjectRepo } from "../objects/repository.js";
import {
  STAFF_TYPE,
  CONSTRAINT_SET_TYPE,
  SCHEDULE_REPORT_TYPE,
  SCHEDULE_TYPE,
  STAFF_SHIFT_WISH_TYPE,
} from "../objects/hotelObjects.js";
import { staffLinkedReportSummaries } from "./staffLinkedReports.js";
import { monthSummariesOf } from "./shiftWishMonths.js";

type StaffDetailProps = {
  staffId?: string;
  /**
   * どの勤務表から開いたか。渡されたときだけ、その勤務表の参照レポートでの評価を出す
   * （勤務表と関係なく開いたスタッフ詳細には出さない）。
   */
  scheduleId?: string;
  /** この人の希望入力表バブルの URL（ObjectView に渡す。app 層から注入） */
  shiftWishUrl?: (year: number, month: number) => string;
};


export const StaffDetail: FC<StaffDetailProps> = ({ staffId, scheduleId, shiftWishUrl }) => {
  const staff = useObject<Staff>(STAFF_TYPE, staffId);
  const actions = useObjectRepo<Staff>(STAFF_TYPE);

  // 希望を集める月は「勤務表がある月」。この人のぶんだけ状況を並べる。
  const schedules = useObjects<MonthlyStaffSchedule>(SCHEDULE_TYPE);
  const wishes = useObjects<StaffMonthlyShiftWish>(STAFF_SHIFT_WISH_TYPE);
  const shiftWishMonths = useMemo(
    () => monthSummariesOf(schedules, wishes, staffId ?? ""),
    [schedules, wishes, staffId]
  );

  // 開いた勤務表の参照レポートから、このスタッフに関係する分だけを取り出す
  // （貢献度スコア・譲歩/繁忙日・配慮メモ）。勤務表の制約セットは id = scheduleId。
  const allConstraints = useObjects<ConstraintSet>(CONSTRAINT_SET_TYPE);
  const allReports = useObjects<ScheduleReport>(SCHEDULE_REPORT_TYPE);
  const linkedReports = useMemo(() => {
    if (!scheduleId) return [];
    const reportId = allConstraints.find((c) => c.id === scheduleId)?.linkedReportId;
    return allReports.filter((r) => r.id === reportId);
  }, [scheduleId, allConstraints, allReports]);
  const linkedReportSummaries = useMemo(
    () => staffLinkedReportSummaries(staffId ?? "", linkedReports),
    [staffId, linkedReports]
  );

  if (!staff) {
    return (
      <div style={{ padding: 16, color: "#666" }}>
        スタッフを選択してください
      </div>
    );
  }

  const handleChangeDepartment = (department: string) => {
    actions.save(staff.changeDepartment(department));
  };

  return (
    <StaffDetailView
      staff={staff}
      onChangeDepartment={handleChangeDepartment}
      shiftWishMonths={shiftWishMonths}
      shiftWishUrl={shiftWishUrl}
      linkedReportSummaries={linkedReportSummaries}
    />
  );
};

// コメントアウト