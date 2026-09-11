'use client';

import { FC } from "react";
import { ScheduleReport } from "@bublys-org/hotel-shift-puzzle-model";
import { ScheduleReportView } from "../ui/ScheduleReportView.js";
import { useObjectShell, useObjectRepo } from "../objects/repository.js";
import { SCHEDULE_REPORT_TYPE } from "../objects/hotelObjects.js";
import { ScheduleWorld } from "./ScheduleWorld.js";
import { useWorkingStaff } from "./workingStaff.js";

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
const ScheduleReportPanelBody: FC<ScheduleReportPanelProps> = ({ reportId }) => {
  // レポートは勤務表のスナップショット。名前はその勤務表で働いた人たちから引く
  const { staffList } = useWorkingStaff(ScheduleReport.scheduleIdOf(reportId));
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

/**
 * 確定レポートは非メンバー（いつ見ても同じ）だが、譲歩・貢献度に出てくるスタッフ名は
 * **確定した当時の名簿**で引きたい。レポートIDは `scheduleId:nodeId` なので、
 * レポート本体を読まなくても、どの勤務表の世界に入ればよいかが分かる。
 */
export const ScheduleReportPanel: FC<ScheduleReportPanelProps> = (props) => (
  <ScheduleWorld scheduleId={ScheduleReport.scheduleIdOf(props.reportId)}>
    <ScheduleReportPanelBody {...props} />
  </ScheduleWorld>
);
