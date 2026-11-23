/**
 * reportPriority — 前月の確定版から引き継いだ★から、自動シフトの優先順位を導く
 *
 * 自動シフトの各ステップ（AutoShiftStep）は `AutoShiftContext.staffIds` の配列順（と phase）
 * だけで優先度・輪番を決めている（hotel-shift-puzzle-libs/src/feature/autoShift.ts の
 * buildContext が staffList.map(s => s.id) で素通しするだけ）。そのためステップ本体を一切
 * 変更せず、実行前に staffList を並べ替えるだけで「前回貢献した人を優先する」を実現できる。
 *
 * 優先度は前月の確定版から引き継いだ★（譲歩と繁忙日出勤の加重合計。#89）。
 * 譲歩件数だけを見ると、譲歩は無かったが繁忙日にたくさん入ってくれた人が優先度に反映されない
 * ため、必ず★で判定する。★は引き継いだときに勤務表へ焼き付いている（#231）ので、
 * 前月の重みが後から変わっても、今月の優先順は黙って変わらない。
 *
 * 実際に効果があるのは「休みを置く」ところだけ（1日の休み上限が有限なので早い者勝ちになる）。
 * どのステップがそうかはステップ自身が `grantsDayOffInStaffOrder` で名乗る。
 *
 * 並べ替えと「優先しました」の一文は**同じ関数が一緒に返す**。一文は並べ替えた結果から作るので、
 * 優先しなかった（★を引き継いでいない・全員0点・優先をやめた）ときに一文だけが出ることはない。
 */
import type { Staff, StarEntry } from "@bublys-org/hotel-shift-puzzle-model";

export type StarPriority = {
  /** ★の高い順に並べ替えたスタッフ（同点は元の順） */
  staffList: Staff[];
  /**
   * 休みを優先したことを伝える一文。スコアのある人が1人もいなければ（並び順が何も変わらない
   * ので）null。ステップが grantsDayOffInStaffOrder のときだけ利用者に見せる。
   */
  note: string | null;
};

/**
 * 引き継いだ★が高いスタッフを配列の先頭に安定ソートし、
 * 優先したことを伝える一文と一緒に返す。★が無ければ並びはそのまま・一文は null。
 */
export function prioritizeStaffByStars(
  staffList: Staff[],
  scores: readonly StarEntry[] | undefined
): StarPriority {
  if (!scores) return { staffList, note: null };
  const starsOf = (staffId: string) => scores.find((s) => s.staffId === staffId)?.score ?? 0;
  const sorted = [...staffList].sort((a, b) => starsOf(b.id) - starsOf(a.id));
  const prioritizedCount = sorted.filter((s) => starsOf(s.id) > 0).length;
  return {
    staffList: sorted,
    // 誰が何点かは名前の横の ★ で読めるので、ここでは「何をしたか」と人数だけ言う
    note: prioritizedCount > 0 ? `★の高い順に休みを優先しました（${prioritizedCount}名）` : null,
  };
}
