/**
 * staffLinkedReports — 紐づけたシフト完成レポートから、そのスタッフに関する部分だけを取り出す
 *
 * 「参照レポート」として勤務表に紐づけた ScheduleReport（複数の勤務表に跨りうる）の中から、
 * このスタッフの貢献度スコア・譲歩/繁忙日の内訳・配慮メモを StaffDetail 画面に表示するための
 * 読み取り専用サマリを作る。譲歩・繁忙日出勤が無く配慮メモも無いレポートは（見せてもノイズに
 * しかならないため）除外する。
 */
import type { ScheduleReport } from "@bublys-org/hotel-shift-puzzle-model";
import type { StaffLinkedReportSummary } from "../ui/StaffDetailView.js";

export type { StaffLinkedReportSummary };

/** そのスタッフに関係する内容（スコア>0 または配慮メモあり）を持つレポートだけを新しい順で返す */
export function staffLinkedReportSummaries(
  staffId: string,
  linkedReports: ScheduleReport[]
): StaffLinkedReportSummary[] {
  return linkedReports
    .map((report) => ({
      report,
      score: report.contributionScores.find((s) => s.staffId === staffId)?.score ?? 0,
      compromises: report.compromises.filter((c) => c.staffId === staffId),
      busyDays: report.busyDayContributions.filter((d) => d.workedStaffIds.includes(staffId)),
      note: report.noteFor(staffId),
    }))
    .filter((s) => s.score > 0 || s.note.trim().length > 0)
    .sort((a, b) => b.report.year - a.report.year || b.report.month - a.report.month);
}
