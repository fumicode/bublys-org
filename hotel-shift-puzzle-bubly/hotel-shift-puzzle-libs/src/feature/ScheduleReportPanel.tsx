'use client';

import { FC, useMemo } from "react";
import { useAppStore } from "@bublys-org/state-management";
import {
  ScheduleReport,
  ConstraintSet,
  MonthlyStaffSchedule,
} from "@bublys-org/hotel-shift-puzzle-model";
import { ScheduleReportView } from "../ui/ScheduleReportView.js";
import { useObjectShell, useObjectRepo, useObjects } from "../objects/repository.js";
import {
  SCHEDULE_REPORT_TYPE,
  CONSTRAINT_SET_TYPE,
  SCHEDULE_TYPE,
} from "../objects/hotelObjects.js";
import { ScheduleWorld } from "./ScheduleWorld.js";
import { confirmedAtOf, withReference } from "./precedingMonth.js";
import { useWorkingStaff } from "./workingStaff.js";
import { recordConstraintEdit, recordReferenceEdit } from "./recordScheduleEdit.js";

type ScheduleReportPanelProps = {
  reportId: string;
};

type ScheduleReportPanelBodyProps = ScheduleReportPanelProps & {
  /** このレポートを参照レポートにしている勤務表の数 */
  linkedScheduleCount: number;
  /** 削除したあとに呼ぶ。参照している勤務表から紐づけを外す */
  onDeleted: () => void;
};

/**
 * シフト完成レポートバブル。確定時に保存された ScheduleReport をシェル経由で表示・編集する。
 * 編集できるのはタイトル・自由記述の配慮メモ・譲歩/繁忙日の重み・削除のみ（譲歩・繁忙日対応の
 * 生データは確定時のスナップショットで変更不可。重みを変えると貢献度スコアだけ再計算される）。
 * 削除後はこのバブル自体は自動で閉じない（bubbles-ui にその仕組みが無いため）ので、
 * 見つからない旨を表示するに留める。
 */
const ScheduleReportPanelBody: FC<ScheduleReportPanelBodyProps> = ({
  reportId,
  linkedScheduleCount,
  onDeleted,
}) => {
  // レポートは勤務表のスナップショット。名前はその勤務表で働いた人たちから引く
  const { staffList } = useWorkingStaff(ScheduleReport.scheduleIdOf(reportId));
  const { object: report, update } = useObjectShell<ScheduleReport>(
    SCHEDULE_REPORT_TYPE,
    reportId
  );
  const reportRepo = useObjectRepo<ScheduleReport>(SCHEDULE_REPORT_TYPE);
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

  const handleDelete = () => {
    reportRepo.remove(reportId);
    onDeleted();
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
      linkedScheduleCount={linkedScheduleCount}
      confirmedAt={confirmedAtOf(store, report)}
    />
  );
};

/**
 * 確定レポートは非メンバー（いつ見ても同じ）だが、譲歩・貢献度に出てくるスタッフ名は
 * **確定した当時の名簿**で引きたい。レポートIDは `scheduleId:nodeId` なので、
 * レポート本体を読まなくても、どの勤務表の世界に入ればよいかが分かる。
 *
 * 一方「どの勤務表がこのレポートを参照しているか」は世界をまたぐ問い合わせなので、
 * 勤務表の世界に入る**前**（グローバル台帳）で引く。レポートを消したら、それを参照している
 * 勤務表すべてから紐づけを外す（各勤務表の世界線に1ノードずつ記録される）。
 * 参照レポートは前月の確定なので、その確定版から写した前月の末尾も一緒に外れる
 * （末尾があれば必ず今の参照レポートの確定版、を崩さない。precedingMonth.ts）。
 */
export const ScheduleReportPanel: FC<ScheduleReportPanelProps> = (props) => {
  const store = useAppStore();
  const allConstraints = useObjects<ConstraintSet>(CONSTRAINT_SET_TYPE);
  const allSchedules = useObjects<MonthlyStaffSchedule>(SCHEDULE_TYPE);
  const linkingSets = useMemo(
    () => allConstraints.filter((c) => c.linkedReportId === props.reportId),
    [allConstraints, props.reportId]
  );

  const unlinkEverywhere = () => {
    for (const c of linkingSets) {
      const schedule = allSchedules.find((s) => s.id === c.id);
      if (!schedule) {
        recordConstraintEdit(store, { schedule, nextConstraints: c.unlinkReport(props.reportId) });
        continue;
      }
      const next = withReference(schedule, c, undefined);
      recordReferenceEdit(store, {
        schedule,
        nextSchedule: next.schedule,
        nextConstraints: next.constraints,
      });
    }
  };

  return (
    <ScheduleWorld scheduleId={ScheduleReport.scheduleIdOf(props.reportId)}>
      <ScheduleReportPanelBody
        {...props}
        linkedScheduleCount={linkingSets.length}
        onDeleted={unlinkEverywhere}
      />
    </ScheduleWorld>
  );
};
