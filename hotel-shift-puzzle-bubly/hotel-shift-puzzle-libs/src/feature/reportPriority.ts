/**
 * reportPriority — 紐づけたシフト完成レポートから、自動シフトの優先順位を導く
 *
 * 自動シフトの各ステップ（AutoShiftStep）は `AutoShiftContext.staffIds` の配列順（と phase）
 * だけで優先度・輪番を決めている（hotel-shift-puzzle-libs/src/feature/autoShift.ts の
 * buildContext が staffList.map(s => s.id) で素通しするだけ）。そのためステップ本体を一切
 * 変更せず、実行前に staffList を並べ替えるだけで「前回貢献した人を優先する」を実現できる。
 *
 * 優先度は report.contributionScores（譲歩回数×2 + 繁忙日出勤回数×1 の加重合計。#89）を使う。
 * 譲歩件数だけを見ると、譲歩は無かったが繁忙日にたくさん入ってくれた人が優先度に反映されない
 * ため、必ず貢献度スコアの合計で判定する。
 *
 * 実際に効果があるのは makeMinDayOffStep だけ（休みの取得優先権。maxPerDay が有限リソース
 * のため早い者勝ちになる）。fulfillWishesStep は人数上限チェックが無いため並び順の影響を
 * 受けない。satisfyLeaderRulesStep / makePartnerCoverStep は ctx.staffIds ではなく
 * rule.leaderStaffIds（責任者ルールの候補者リスト）を見るため、この並べ替えでは
 * 「貢献した人に仕事・責任者番を優先的に割り当てる」ことは起きない。
 */
import type { Staff, ScheduleReport } from "@bublys-org/hotel-shift-puzzle-model";

/**
 * 紐づけたレポートの貢献度スコア（譲歩＋繁忙日対応の加重合計）が高いスタッフを
 * 配列の先頭に安定ソートする。スコアが同じ（0点を含む）スタッフ同士は元の順序を保つ。
 */
export function prioritizeStaffByLinkedReports(
  staffList: Staff[],
  linkedReports: ScheduleReport[]
): Staff[] {
  if (linkedReports.length === 0) return staffList;

  const totalScoreByStaff = new Map<string, number>();
  for (const report of linkedReports) {
    for (const s of report.contributionScores) {
      totalScoreByStaff.set(s.staffId, (totalScoreByStaff.get(s.staffId) ?? 0) + s.score);
    }
  }
  if (totalScoreByStaff.size === 0) return staffList;

  return [...staffList].sort(
    (a, b) => (totalScoreByStaff.get(b.id) ?? 0) - (totalScoreByStaff.get(a.id) ?? 0)
  );
}
