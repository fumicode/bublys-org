/**
 * precedingMonth — 勤務表は、前月の確定版から引き継いで始まる（#231）
 *
 * - **前月の確定版は1つに決まる。** 確定版は店舗×月で1つなので、同じ店舗の前月の確定版は
 *   勤務表の店舗と年月から決まる（`ConfirmedSchedule.precedingIdFor`）。選ぶことも、紐づけを
 *   持つことも無い。
 * - **引き継いだものは今月の世界に焼き付く。** 写し取るのは確定版の月末の勤務と、振り返りの
 *   ★と、どの版から写したか（{@link PrecedingMonthTail}）。前月の確定版を
 *   後から見に行かない。
 * - **いつ引き継ぐか**：勤務表を作るときに自動で。作った後に前月の確定版が置き換わったり、
 *   前月があとから確定したりしても**勝手には差し替えない**（今月の違反表示や休みの優先順が
 *   知らないうちに変わらないように）。新しい版があることを知らせ（{@link pendingInheritanceOf}）、
 *   人が取り込む。
 *
 * 読み出しは確定ノード時点の値なので、前月の勤務表がその後どう編集されていても、
 * 確定したときの版が写る。勤務帯の名前もそのノード時点の前月の勤務帯セットで引く。
 */
import {
  PrecedingMonthTail,
  ConfirmedSchedule,
  precedingTailLengthFor,
  type StarEntry,
  type MonthlyStaffSchedule,
  type WorkShiftSet,
} from "@bublys-org/hotel-shift-puzzle-model";
import {
  localScopeId,
  nodeTimestampOf,
  readFromScopeAt,
} from "../objects/commit.js";
import { SCHEDULE_TYPE, WORKSHIFT_SET_TYPE } from "../objects/hotelObjects.js";

type StoreLike = Parameters<typeof nodeTimestampOf>[0];

/** その確定版が確定した時刻。古い確定版は確定ノードができた時刻で補う */
export function confirmedAtOf(store: StoreLike, report: ConfirmedSchedule): number | undefined {
  return (
    report.confirmedAt ??
    nodeTimestampOf(store, localScopeId(SCHEDULE_TYPE, report.scheduleId), report.worldLineNodeId)
  );
}

/** target の勤務表が引き継ぐ前月の確定版（同じ店舗の1か月前）。まだ確定していなければ undefined（純粋） */
export function precedingConfirmedOf(
  reports: readonly ConfirmedSchedule[],
  target: { storeId: string; year: number; month: number }
): ConfirmedSchedule | undefined {
  const id = ConfirmedSchedule.precedingIdFor(target);
  return reports.find((r) => r.id === id);
}

/**
 * 取り込んでいない前月の確定版があれば返す（純粋）。
 * 前月の確定版があり、いま引き継いでいる版と違う（＝置き換わった／あとから確定した／
 * まだ引き継いでいない）ときだけ。
 */
export function pendingInheritanceOf(
  confirmed: ConfirmedSchedule | undefined,
  inherited: PrecedingMonthTail | undefined
): ConfirmedSchedule | undefined {
  if (!confirmed) return undefined;
  if (inherited && confirmed.isVersion(inherited.source)) return undefined;
  return confirmed;
}

/**
 * 引き継いだ★の行を返す（純粋）。
 *
 * ★は引き継ぎに焼き付いているものを読む。★を写す前に引き継いだ古い勤務表（#231 より前）は
 * 焼き付いていないので、引き継いだ版がいまの確定版と同じときだけそこから読む
 * （版が違えば、今月の前提ではないので読まない）。
 */
export function inheritedScoresOf(
  inherited: PrecedingMonthTail | undefined,
  confirmed: ConfirmedSchedule | undefined
): readonly StarEntry[] | undefined {
  if (!inherited) return undefined;
  if (inherited.stars) return inherited.stars;
  if (confirmed?.isVersion(inherited.source)) return confirmed.stars;
  return undefined;
}

/**
 * 前月の確定版（確定ノード時点の勤務表）から、引き継ぐもの（月末の勤務と★）を写し取る。
 * 確定した版がもう読めなければ undefined（＝引き継がない。今月1日から数える）。
 *
 * @param maxConsecutiveWorkdays 今月の連勤上限（何日写せば足りるかを決める）
 */
export async function captureInheritance(
  store: StoreLike,
  confirmed: ConfirmedSchedule,
  maxConsecutiveWorkdays: number
): Promise<PrecedingMonthTail | undefined> {
  const scopeId = localScopeId(SCHEDULE_TYPE, confirmed.scheduleId);
  const [schedule, workShifts] = await Promise.all([
    readFromScopeAt<MonthlyStaffSchedule>(
      store,
      scopeId,
      confirmed.worldLineNodeId,
      SCHEDULE_TYPE,
      confirmed.scheduleId
    ),
    // 勤務表ごとの勤務帯セットは勤務表と同じ ID（createSchedule が withId で作る）
    readFromScopeAt<WorkShiftSet>(
      store,
      scopeId,
      confirmed.worldLineNodeId,
      WORKSHIFT_SET_TYPE,
      confirmed.scheduleId
    ),
  ]);
  if (!schedule) return undefined;
  return PrecedingMonthTail.capture({
    source: confirmed.version,
    confirmedAt: confirmedAtOf(store, confirmed),
    schedule,
    shiftNameOf: (shiftId) => workShifts?.findById(shiftId)?.name,
    length: precedingTailLengthFor(maxConsecutiveWorkdays),
    stars: confirmed.stars,
  });
}
