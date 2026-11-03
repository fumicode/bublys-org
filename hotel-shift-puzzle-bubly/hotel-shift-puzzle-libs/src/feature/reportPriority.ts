/**
 * reportPriority — 参照レポートから、自動シフトの優先順位を導く
 *
 * 自動シフトの各ステップ（AutoShiftStep）は `AutoShiftContext.staffIds` の配列順（と phase）
 * だけで優先度・輪番を決めている（hotel-shift-puzzle-libs/src/feature/autoShift.ts の
 * buildContext が staffList.map(s => s.id) で素通しするだけ）。そのためステップ本体を一切
 * 変更せず、実行前に staffList を並べ替えるだけで「前回貢献した人を優先する」を実現できる。
 *
 * 優先度は参照レポートの貢献度スコア（譲歩と繁忙日出勤の加重合計。重みはレポートごと。#89）。
 * 譲歩件数だけを見ると、譲歩は無かったが繁忙日にたくさん入ってくれた人が優先度に反映されない
 * ため、必ず貢献度スコアで判定する。参照レポートは勤務表に1つだけなので、重みの違うスコアを
 * 足し合わせることは起きない。
 *
 * 実際に効果があるのは「休みを置く」ところだけ（1日の休み上限が有限なので早い者勝ちになる）。
 * どのステップがそうかはステップ自身が `grantsDayOffInStaffOrder` で名乗る。
 *
 * 並べ替えと「優先しました」の一文は**同じ関数が一緒に返す**。一文は並べ替えた結果から作るので、
 * 優先しなかった（参照レポートが無い・全員0点・優先をやめた）ときに一文だけが出ることはない。
 */
import type { Staff, ScheduleReport } from "@bublys-org/hotel-shift-puzzle-model";

export type ReportPriority = {
  /** 貢献度スコアの高い順に並べ替えたスタッフ（同点は元の順） */
  staffList: Staff[];
  /**
   * 休みを優先したことを伝える一文。スコアのある人が1人もいなければ（並び順が何も変わらない
   * ので）null。ステップが grantsDayOffInStaffOrder のときだけ利用者に見せる。
   */
  note: string | null;
};

/**
 * 参照レポートの貢献度スコアが高いスタッフを配列の先頭に安定ソートし、
 * 優先したことを伝える一文と一緒に返す。参照レポートが無ければ並びはそのまま・一文は null。
 */
export function prioritizeStaffByReport(
  staffList: Staff[],
  report: ScheduleReport | undefined
): ReportPriority {
  if (!report) return { staffList, note: null };
  const sorted = [...staffList].sort((a, b) => report.scoreOf(b.id) - report.scoreOf(a.id));
  const prioritizedCount = sorted.filter((s) => report.scoreOf(s.id) > 0).length;
  return {
    staffList: sorted,
    // 誰が何点かは名前の横の ★ で読めるので、ここでは「何をしたか」と人数だけ言う
    note: prioritizedCount > 0 ? `★の高い順に休みを優先しました（${prioritizedCount}名）` : null,
  };
}
