'use client';

import { FC } from "react";
import { Staff, ScheduleReport } from "@bublys-org/hotel-shift-puzzle-model";
import { ScheduleReportView } from "../ui/ScheduleReportView.js";
import { useObjects, useObjectShell, useObjectRepo } from "../objects/repository.js";
import { STAFF_TYPE, SCHEDULE_REPORT_TYPE } from "../objects/hotelObjects.js";

type ScheduleReportPanelProps = {
  reportId: string;
};

/**
 * シフト完成レポートバブル。確定時に保存された ScheduleReport をシェル経由で表示・編集する。
 * 編集できるのはタイトル・自由記述の配慮メモ・譲歩/繁忙日の重み・削除のみ（譲歩・繁忙日対応の
 * 生データは確定時のスナップショットで変更不可。重みを変えると貢献度スコアだけ再計算される）。
 * 削除後はこのバブル自体は自動で閉じない（bubbles-ui にその仕組みが無いため）ので、
 * 見つからない旨を表示するに留める。
 */
export const ScheduleReportPanel: FC<ScheduleReportPanelProps> = ({ reportId }) => {
  const staffList = useObjects<Staff>(STAFF_TYPE);
  const { object: report, update } = useObjectShell<ScheduleReport>(
    SCHEDULE_REPORT_TYPE,
    reportId
  );
  const reportRepo = useObjectRepo<ScheduleReport>(SCHEDULE_REPORT_TYPE);

  const nameOf = (staffId: string): string =>
    staffList.find((s) => s.id === staffId)?.name ?? staffId;

  const handleChangeNote = (staffId: string, text: string) => {
    update((r) => r.setNote(staffId, text));
  };

  const handleRename = (title: string) => {
    update((r) => r.rename(title));
  };

  const handleChangeWeights = (compromiseWeight: number, busyDayWeight: number) => {
    update((r) => r.reweight(compromiseWeight, busyDayWeight));
  };

  const handleDelete = () => {
    reportRepo.remove(reportId);
  };

  if (!report) {
    return (
      <div style={{ padding: 16, color: "#666" }}>
        レポートが見つかりません（削除された可能性があります）。
      </div>
    );
  }

  return (
    <ScheduleReportView
      report={report}
      nameOf={nameOf}
      onChangeNote={handleChangeNote}
      onRename={handleRename}
      onChangeWeights={handleChangeWeights}
      onDelete={handleDelete}
    />
  );
};
