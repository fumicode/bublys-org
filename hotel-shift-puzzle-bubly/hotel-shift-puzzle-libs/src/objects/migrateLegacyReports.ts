/**
 * 旧形式の完成レポートを、店舗×月で1つの確定版に畳む（#231）
 *
 * #231 より前は「完成レポートを作成」を押すたびにレポートが増えた（ID は `勤務表ID:ノードID`）。
 * 確定版は店舗×月で1つ（ID は `店舗:年-月`）になったので、同じ店舗×月のレポートのうち
 * **いちばん新しい確定**を残して新しい ID の確定版にし、残りは消す。
 *
 * - **迷ったら触らない。** レポートが1つでも読めない（メモリから追い出されているだけかも
 *   しれない）ときは何もしない。次の起動で読めればそこで畳む。読めないまま畳むと、
 *   本当は新しい確定を消してしまうことがある。
 * - **冪等。** 畳んだあとは旧形式の ID が残らないので、2度目は何もしない。
 * - 勤務表の引き継ぎ（どの版から写したか）は書き換えない。引き継いだ版と残った確定版が
 *   違えば、勤務表が「確定版が新しくなりました」と知らせ、人が取り込む。
 */
import { ScheduleReport } from "@bublys-org/hotel-shift-puzzle-model";
import {
  APP_SCOPE_ID,
  localScopeId,
  nodeTimestampOf,
  readFromScope,
  refsOfTypeInScope,
  removeObject,
  saveObject,
} from "./commit.js";
import { SCHEDULE_REPORT_TYPE, SCHEDULE_TYPE } from "./hotelObjects.js";

type StoreLike = Parameters<typeof saveObject>[0];

/** 確定した時刻。古いレポートは確定ノードができた時刻で補う。分からなければ -Infinity */
const confirmedAtOf = (store: StoreLike, report: ScheduleReport): number =>
  report.confirmedAt ??
  nodeTimestampOf(store, localScopeId(SCHEDULE_TYPE, report.scheduleId), report.worldLineNodeId) ??
  -Infinity;

/**
 * 旧形式の完成レポートを畳む。
 * @returns 畳んだ店舗×月の確定版 ID の一覧
 */
export function migrateLegacyReports(store: StoreLike): string[] {
  const refs = refsOfTypeInScope(store, APP_SCOPE_ID, SCHEDULE_REPORT_TYPE);

  // 店舗×月ごとに集める。読めないレポートはどの店舗×月かも分からないので、
  // 1つでも読めなければ全部見送る（次の起動でまた試す）
  const groups = new Map<string, ScheduleReport[]>();
  for (const ref of refs) {
    const report = readFromScope<ScheduleReport>(store, APP_SCOPE_ID, SCHEDULE_REPORT_TYPE, ref.id);
    if (!report) return [];
    const id = ScheduleReport.idFor(report.storeId, report.year, report.month);
    groups.set(id, [...(groups.get(id) ?? []), report]);
  }

  const migrated: string[] = [];
  for (const [id, reports] of groups) {
    if (reports.every((r) => r.id === id)) continue; // 旧形式が無い
    const [latest] = [...reports].sort((a, b) => confirmedAtOf(store, b) - confirmedAtOf(store, a));
    // いちばん新しいのが旧形式なら、新しい ID で残す（新しい形式のものがあれば置き換わる）
    if (latest.id !== id) {
      saveObject(store, SCHEDULE_REPORT_TYPE, ScheduleReport.fromPlain({ ...latest.toPlain(), id }));
    }
    for (const r of reports) {
      if (r.id !== id) removeObject(store, SCHEDULE_REPORT_TYPE, r.id);
    }
    migrated.push(id);
  }
  return migrated;
}
