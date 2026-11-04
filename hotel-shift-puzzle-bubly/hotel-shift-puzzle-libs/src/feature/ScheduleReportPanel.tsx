'use client';

import { FC } from "react";
import { useAppStore } from "@bublys-org/state-management";
import { ScheduleReport } from "@bublys-org/hotel-shift-puzzle-model";
import { ScheduleReportView } from "../ui/ScheduleReportView.js";
import { useObjectShell, useObjects } from "../objects/repository.js";
import { SCHEDULE_REPORT_TYPE } from "../objects/hotelObjects.js";
import { ScheduleWorld } from "./ScheduleWorld.js";
import { confirmedAtOf } from "./precedingMonth.js";
import { useWorkingStaff } from "./workingStaff.js";

type ScheduleReportPanelProps = {
  reportId: string;
};

type ScheduleReportPanelBodyProps = ScheduleReportPanelProps & {
  /** 確定版を持つ勤務表（名前はその勤務表で働いた人たちから引く） */
  scheduleId: string;
};

/**
 * 確定版の振り返りバブル。確定時に保存された ScheduleReport をシェル経由で表示・編集する。
 * 編集できるのはタイトル・自由記述の配慮メモ・譲歩/繁忙日の重みだけ（譲歩・繁忙日対応の
 * 生データは確定時のスナップショットで変更不可。重みを変えると貢献度スコアだけ再計算される）。
 * 確定版に取り消しは無い（差し替えたければ別の版を確定する。#231）ので、削除の口も持たない。
 */
const ScheduleReportPanelBody: FC<ScheduleReportPanelBodyProps> = ({
  reportId,
  scheduleId,
}) => {
  // 振り返りは確定版のスナップショット。名前はその勤務表で働いた人たちから引く
  const { staffList } = useWorkingStaff(scheduleId);
  const { object: report, update } = useObjectShell<ScheduleReport>(
    SCHEDULE_REPORT_TYPE,
    reportId
  );
  const store = useAppStore();

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

  if (!report) {
    return (
      <div style={{ padding: 16, color: "#666" }}>
        確定版が見つかりません。
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
      confirmedAt={confirmedAtOf(store, report)}
    />
  );
};

/**
 * 振り返りは世界に属さない（いつ見ても同じ）が、譲歩・貢献度に出てくるスタッフ名は
 * **確定した当時の名簿**で引きたい。だから確定版を持つ勤務表の世界に入って描く。
 * どの勤務表かは確定版が持っているので、世界に入る**前**（グローバル台帳）で引く。
 */
export const ScheduleReportPanel: FC<ScheduleReportPanelProps> = (props) => {
  const report = useObjects<ScheduleReport>(SCHEDULE_REPORT_TYPE).find(
    (r) => r.id === props.reportId
  );
  if (!report) {
    return <div style={{ padding: 16, color: "#666" }}>確定版が見つかりません。</div>;
  }
  return (
    <ScheduleWorld scheduleId={report.scheduleId}>
      <ScheduleReportPanelBody {...props} scheduleId={report.scheduleId} />
    </ScheduleWorld>
  );
};
