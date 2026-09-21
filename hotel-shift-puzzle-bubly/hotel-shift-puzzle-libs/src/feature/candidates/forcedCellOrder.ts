/**
 * forcedCellOrder — 確定提案をどの順に承認していくか
 *
 * Enter / Tab を押し続けるだけで提案を順に潰していけるようにするための並べ替えと、
 * 「次はどこか」の決定。押したキーの向き（Excel と同じ）に揃える:
 *   - Tab（右）  … "row"    スタッフ行順 → 稼働日順（行を右へ読み、次の行へ）
 *   - Enter（下）… "column" 稼働日順 → スタッフ行順（列を下へ読み、次の列へ）
 * "row" は suggestNextUndecided と同じ読み順。
 */
import type { ForcedCell } from "@bublys-org/hotel-shift-puzzle-model";

/** 並べる向き。row＝行を右へ読む（Tab）／column＝列を下へ読む（Enter） */
export type ForcedCellAxis = "row" | "column";

/** 確定提案を、押したキーの向きの読み順に並べ替える（既定は行を右へ読む順） */
export function orderForcedCells(
  forced: ForcedCell[],
  staffOrder: string[],
  axis: ForcedCellAxis = "row"
): ForcedCell[] {
  const rankOf = new Map(staffOrder.map((staffId, index) => [staffId, index]));
  const byStaff = (a: ForcedCell, b: ForcedCell) =>
    (rankOf.get(a.staffId) ?? Number.MAX_SAFE_INTEGER) -
    (rankOf.get(b.staffId) ?? Number.MAX_SAFE_INTEGER);
  const byDay = (a: ForcedCell, b: ForcedCell) =>
    a.day.key < b.day.key ? -1 : a.day.key > b.day.key ? 1 : 0;
  return [...forced].sort((a, b) =>
    axis === "row" ? byStaff(a, b) || byDay(a, b) : byDay(a, b) || byStaff(a, b)
  );
}

/**
 * 承認したセルの「次」の確定提案を返す。
 * 並びの末尾まで行ったら先頭へ回り込む（押し続けて全部を潰せるように）。
 * 承認したセル自身は既に決まったので候補から外す。他に提案が無ければ undefined。
 */
export function nextForcedCellAfter(
  ordered: ForcedCell[],
  approved: { staffId: string; dayKey: string }
): ForcedCell | undefined {
  const index = ordered.findIndex(
    (cell) => cell.staffId === approved.staffId && cell.day.key === approved.dayKey
  );
  const rest = ordered.filter((_, i) => i !== index);
  if (rest.length === 0) return undefined;
  if (index < 0) return rest[0];
  return ordered[index + 1] ?? rest[0];
}
