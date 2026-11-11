import { Store, type MonthlyStaffSchedule } from "@bublys-org/hotel-shift-puzzle-model";

/** 店舗をまだ1つも作っていないときに勤務表を作る店舗（店舗を入れる前の手打ちの既定値） */
export const DEFAULT_STORE_ID = "store-1";

/**
 * 勤務表を作れる店舗（純粋）。
 *
 * 記録された店舗に、勤務表が指しているのに記録が無い店舗を足す（店舗が見つからない storeId は
 * ホテル・暦月で読む。{@link Store.fallback}）。ただし削除した店舗は足さない（もう作らない）。
 * どれも無ければ既定の "store-1"（ホテル・暦月）。ただしホテルを選べないデプロイ（行政版）では
 * 既定を出さない（先に課を作ってもらう）。
 * こうしておけば、店舗を作る前からの使い方（store-1 の勤務表を続けて作り、前月の確定版を
 * 引き継ぐ）が、何も書き足さずにそのまま続く。
 */
export function storesForNewSchedule(
  recorded: readonly Store[],
  schedules: readonly Pick<MonthlyStaffSchedule, "storeId">[],
  removedIds: ReadonlySet<string> = new Set(),
  /** 何も無いときに既定の "store-1" を出すか（ホテルを選べるデプロイだけ） */
  withDefault = true
): Store[] {
  const ids = new Set(recorded.map((s) => s.id));
  const unrecorded = [...new Set(schedules.map((s) => s.storeId))]
    .filter((id) => !ids.has(id) && !removedIds.has(id))
    .map((id) => Store.fallback(id));
  const all = [...recorded, ...unrecorded];
  if (all.length > 0 || !withDefault) return all;
  return [Store.fallback(DEFAULT_STORE_ID)];
}
