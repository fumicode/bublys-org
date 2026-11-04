'use client';

import { FC } from "react";
import { useAppStore } from "@bublys-org/state-management";
import { ScheduleReport } from "@bublys-org/hotel-shift-puzzle-model";
import { ScheduleReportView } from "../ui/ScheduleReportView.js";
import { useObjectShell } from "../objects/repository.js";
import { SCHEDULE_REPORT_TYPE } from "../objects/hotelObjects.js";
import { confirmedAtOf } from "./precedingMonth.js";
import { useWorkingStaff } from "./workingStaff.js";

type ConfirmedReviewProps = {
  /** 振り返る確定版 */
  report: ScheduleReport;
  /** true ならタイトル・配慮メモ・重みを書ける（勤務表の中）。false なら読むだけ（成果木） */
  editable?: boolean;
};

/**
 * 確定版の振り返り（#231）。振り返りは確定版を「その月どうだったか」の角度から見たもので、
 * 独立したバブルを持たない。確定版を持つ勤務表の中と、成果木の詳細欄に、この部品で出る。
 *
 * 書けるのはタイトル・自由記述の配慮メモ・譲歩/繁忙日の重みだけ（譲歩・繁忙日対応の
 * 生データは確定時のスナップショットで変更不可。重みを変えると貢献度スコアだけ再計算される）。
 *
 * その勤務表の世界（ScheduleWorld）の中に置くこと。譲歩・貢献度に出てくるスタッフ名は、
 * その勤務表で働いた人たちから引く。
 */
export const ConfirmedReview: FC<ConfirmedReviewProps> = ({ report, editable = false }) => {
  const store = useAppStore();
  const { staffList } = useWorkingStaff(report.scheduleId);
  // 確定版は世界に属さない（external）ので、どの世界の中からでもシェル経由で書ける
  const { update } = useObjectShell<ScheduleReport>(SCHEDULE_REPORT_TYPE, report.id);

  const nameOf = (staffId: string): string =>
    staffList.find((s) => s.id === staffId)?.name ?? staffId;

  return (
    <ScheduleReportView
      report={report}
      nameOf={nameOf}
      confirmedAt={confirmedAtOf(store, report)}
      {...(editable
        ? {
            onChangeNote: (staffId: string, text: string) =>
              update((r) => r.setNote(staffId, text)),
            onRename: (title: string) => update((r) => r.rename(title)),
            onChangeWeights: (compromiseWeight: number, busyDayWeight: number) =>
              update((r) => r.reweight(compromiseWeight, busyDayWeight)),
          }
        : {})}
    />
  );
};
