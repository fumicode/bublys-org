/**
 * staffReviews — 前月の振り返りから、そのスタッフに関する部分だけを取り出す
 *
 * 開いている勤務表が引き継いだ前月の確定版（ConfirmedSchedule）の振り返りから、
 * このスタッフの★・譲歩/繁忙日の内訳・配慮メモを StaffDetail 画面に表示するための
 * 読み取り専用サマリを作る。譲歩・繁忙日出勤が無く配慮メモも無い振り返りは（見せてもノイズに
 * しかならないため）除外する。
 */
import type { ConfirmedSchedule } from "@bublys-org/hotel-shift-puzzle-model";
import type { StaffReviewSummary } from "../ui/StaffDetailView.js";

export type { StaffReviewSummary };

/** そのスタッフに関係する内容（スコア>0 または配慮メモあり）を持つ振り返りだけを新しい順で返す */
export function staffReviewSummaries(
  staffId: string,
  precedingReviews: ConfirmedSchedule[]
): StaffReviewSummary[] {
  return precedingReviews
    .map((report) => ({
      report,
      score: report.stars.find((s) => s.staffId === staffId)?.score ?? 0,
      compromises: report.compromises.filter((c) => c.staffId === staffId),
      busyDays: report.busyDayContributions.filter((d) => d.workedStaffIds.includes(staffId)),
      note: report.noteFor(staffId),
    }))
    .filter((s) => s.score > 0 || s.note.trim().length > 0)
    .sort((a, b) => b.report.year - a.report.year || b.report.month - a.report.month);
}
