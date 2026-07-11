/**
 * reportPriority — 紐づけたシフト完成レポートから、自動シフトの優先順位を導く
 *
 * 自動シフトの各ステップ（AutoShiftStep）は `AutoShiftContext.staffIds` の配列順（と phase）
 * だけで優先度・輪番を決めている（hotel-shift-puzzle-libs/src/feature/autoShift.ts の
 * buildContext が staffList.map(s => s.id) で素通しするだけ）。そのためステップ本体を一切
 * 変更せず、実行前に staffList を並べ替えるだけで「前回妥協した人を優先する」を実現できる。
 *
 * 実際に効果があるのは makeMinDayOffStep だけ（休みの取得優先権。maxPerDay が有限リソース
 * のため早い者勝ちになる）。fulfillWishesStep は人数上限チェックが無いため並び順の影響を
 * 受けない。satisfyLeaderRulesStep / makePartnerCoverStep は ctx.staffIds ではなく
 * rule.leaderStaffIds（責任者ルールの候補者リスト）を見るため、この並べ替えでは
 * 「妥協した人に仕事・責任者番を優先的に割り当てる」ことは起きない。
 */
import type { Staff, ScheduleReport } from "@bublys-org/hotel-shift-puzzle-model";

/**
 * 紐づけたレポートの妥協回数が多いスタッフを配列の先頭に安定ソートする。
 * 妥協回数が同じ（0件を含む）スタッフ同士は元の順序を保つ。
 */
export function prioritizeStaffByLinkedReports(
  staffList: Staff[],
  linkedReports: ScheduleReport[]
): Staff[] {
  if (linkedReports.length === 0) return staffList;

  const compromiseCounts = new Map<string, number>();
  for (const report of linkedReports) {
    for (const c of report.compromises) {
      compromiseCounts.set(c.staffId, (compromiseCounts.get(c.staffId) ?? 0) + 1);
    }
  }
  if (compromiseCounts.size === 0) return staffList;

  return [...staffList].sort(
    (a, b) => (compromiseCounts.get(b.id) ?? 0) - (compromiseCounts.get(a.id) ?? 0)
  );
}
