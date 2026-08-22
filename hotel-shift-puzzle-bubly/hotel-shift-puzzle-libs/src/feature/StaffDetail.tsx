'use client';

import { FC, useMemo } from "react";
import { Staff, ScheduleConstraints, ScheduleReport } from "@bublys-org/hotel-shift-puzzle-model";
import { StaffDetailView } from "../ui/StaffDetailView.js";
import { useObject, useObjects, useObjectRepo } from "../objects/repository.js";
import { STAFF_TYPE, SCHEDULE_CONSTRAINTS_TYPE, SCHEDULE_REPORT_TYPE } from "../objects/hotelObjects.js";
import { staffLinkedReportSummaries } from "./staffLinkedReports.js";

type StaffDetailProps = {
  staffId?: string;
  /** 指定した年月のシフト希望エディタを開く */
  onOpenWish?: (year: number, month: number) => void;
};


export const StaffDetail: FC<StaffDetailProps> = ({ staffId, onOpenWish }) => {
  const staff = useObject<Staff>(STAFF_TYPE, staffId);
  const actions = useObjectRepo<Staff>(STAFF_TYPE);

  // 参照レポート（どの勤務表かは問わず、紐づけ済みの ScheduleReport 全部）から
  // このスタッフに関係する分だけを取り出す（貢献度スコア・譲歩/繁忙日・配慮メモ）。
  const allConstraints = useObjects<ScheduleConstraints>(SCHEDULE_CONSTRAINTS_TYPE);
  const allReports = useObjects<ScheduleReport>(SCHEDULE_REPORT_TYPE);
  const linkedReports = useMemo(() => {
    const linkedIds = new Set(allConstraints.flatMap((c) => c.linkedReportIds));
    return allReports.filter((r) => linkedIds.has(r.id));
  }, [allConstraints, allReports]);
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
      onOpenWish={onOpenWish}
      linkedReportSummaries={linkedReportSummaries}
    />
  );
};

// コメントアウト