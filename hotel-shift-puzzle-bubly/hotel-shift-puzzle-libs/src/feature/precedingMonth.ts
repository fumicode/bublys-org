/**
 * precedingMonth — 参照レポート（前月の確定）を選び、その確定版の末尾を今月へつなぐ
 *
 * ルールは「勤務表は、参照レポートの確定版の末尾から続いている」の1つ（{@link PrecedingMonthTail}）。
 * 参照レポートにできるのは同じ店舗の前月の確定だけ（`ScheduleReport.isReferenceableFrom`）なので、
 * 参照レポートを選ぶことが、そのまま前月の確定版を選ぶことになる。紐づけを二重に持たない。
 *
 * - **候補の順**：同じ月に確定が複数（勤務表が複数・同じ勤務表で何度も確定）あれば、
 *   **確定した時刻の新しい順**。確定時刻を持たない古いレポートは、確定ノードができた時刻で補う。
 * - **いつ紐づくか**：勤務表を作るときに、いちばん新しい前月の確定を自動で紐づけ、末尾を写す。
 *   作った後に前月の確定が増えても**勝手には差し替えない**（今月の違反表示や確定レポートの
 *   前提が知らないうちに変わらないように）。新しい確定があることを知らせ、人が取り込む。
 * - 参照（制約セット）と写した末尾（勤務表）は同じ1ノードで一緒に変わる（{@link withReference}）。
 *   末尾があれば、それは必ず今の参照レポートの確定版。
 * - 貢献度スコアを自動シフトの優先度に使うかは別のスイッチ（`ConstraintSet.useReportPriority`）。
 *   前月とのつなぎはスイッチに関係なく、参照している限り効く。
 *
 * 読み出しは確定ノード時点の値なので、前月の勤務表がその後どう編集されていても、
 * 確定したときの版が写る。勤務帯の名前もそのノード時点の前月の勤務帯セットで引く。
 */
import {
  PrecedingMonthTail,
  precedingTailLengthFor,
  type ConstraintSet,
  type MonthlyStaffSchedule,
  type ScheduleReport,
  type WorkShiftSet,
} from "@bublys-org/hotel-shift-puzzle-model";
import {
  localScopeId,
  nodeTimestampOf,
  readFromScopeAt,
} from "../objects/commit.js";
import { SCHEDULE_TYPE, WORKSHIFT_SET_TYPE } from "../objects/hotelObjects.js";

type StoreLike = Parameters<typeof nodeTimestampOf>[0];

/** 参照レポート（前月の確定）の候補1件（確定時刻つき） */
export type ReferenceCandidate = {
  report: ScheduleReport;
  /** 確定した時刻（epoch ms）。分からなければ undefined */
  confirmedAt?: number;
};

/** そのレポートが確定した時刻。古いレポートは確定ノードができた時刻で補う */
export function confirmedAtOf(store: StoreLike, report: ScheduleReport): number | undefined {
  return (
    report.confirmedAt ??
    nodeTimestampOf(store, localScopeId(SCHEDULE_TYPE, report.scheduleId), report.worldLineNodeId)
  );
}

/**
 * target の勤務表の参照レポートにできる確定（同じ店舗の前月）を、確定の新しい順に並べる（純粋）。
 * 確定時刻の分からないものは最後へ。
 */
export function referenceCandidates(
  reports: readonly ScheduleReport[],
  target: { storeId: string; year: number; month: number },
  confirmedAt: (report: ScheduleReport) => number | undefined
): ReferenceCandidate[] {
  return reports
    .filter((r) => r.isReferenceableFrom(target))
    .map((report) => ({ report, confirmedAt: confirmedAt(report) }))
    .sort((a, b) => (b.confirmedAt ?? -Infinity) - (a.confirmedAt ?? -Infinity));
}

/**
 * いまつないでいる末尾より新しい前月の確定があれば、そのうち最新を返す（純粋）。
 * 人が古い方をあえて選んでいても、より新しい確定が出たときだけ知らせる。
 */
export function newerReferenceCandidate(
  candidates: readonly ReferenceCandidate[],
  linked: ReferenceCandidate | undefined
): ReferenceCandidate | undefined {
  const latest = candidates[0];
  if (!latest) return undefined;
  if (!linked) return latest;
  if (latest.report.id === linked.report.id) return undefined;
  if (latest.confirmedAt === undefined) return undefined;
  return latest.confirmedAt > (linked.confirmedAt ?? -Infinity) ? latest : undefined;
}

/**
 * 参照レポートを付け替えた勤務表と制約セットを返す（純粋）。reference が undefined なら外す。
 *
 * 参照と前月の末尾は一緒に変わる。確定版が読めなかった（tail が無い）ときは参照だけを付け、
 * 前月とはつながない（＝今月1日から数える）。古い末尾を残すと、参照と食い違う。
 */
export function withReference(
  schedule: MonthlyStaffSchedule,
  constraints: ConstraintSet,
  reference: { reportId: string; tail?: PrecedingMonthTail } | undefined
): { schedule: MonthlyStaffSchedule; constraints: ConstraintSet } {
  if (!reference) {
    const linked = constraints.linkedReportId;
    return {
      schedule: schedule.withPrecedingTail(undefined),
      constraints: linked ? constraints.unlinkReport(linked) : constraints,
    };
  }
  return {
    schedule: schedule.withPrecedingTail(reference.tail),
    constraints: constraints.linkReport(reference.reportId),
  };
}

/**
 * 前月の確定版（確定ノード時点の勤務表）から末尾を写し取る。
 * 確定した版がもう読めなければ undefined。
 *
 * @param maxConsecutiveWorkdays 今月の連勤上限（何日写せば足りるかを決める）
 */
export async function capturePrecedingTail(
  store: StoreLike,
  candidate: ReferenceCandidate,
  maxConsecutiveWorkdays: number
): Promise<PrecedingMonthTail | undefined> {
  const { report } = candidate;
  const scopeId = localScopeId(SCHEDULE_TYPE, report.scheduleId);
  const [schedule, workShifts] = await Promise.all([
    readFromScopeAt<MonthlyStaffSchedule>(
      store,
      scopeId,
      report.worldLineNodeId,
      SCHEDULE_TYPE,
      report.scheduleId
    ),
    // 勤務表ごとの勤務帯セットは勤務表と同じ ID（createSchedule が withId で作る）
    readFromScopeAt<WorkShiftSet>(
      store,
      scopeId,
      report.worldLineNodeId,
      WORKSHIFT_SET_TYPE,
      report.scheduleId
    ),
  ]);
  if (!schedule) return undefined;
  return PrecedingMonthTail.capture({
    sourceReportId: report.id,
    confirmedAt: candidate.confirmedAt,
    schedule,
    shiftNameOf: (shiftId) => workShifts?.findById(shiftId)?.name,
    length: precedingTailLengthFor(maxConsecutiveWorkdays),
  });
}
