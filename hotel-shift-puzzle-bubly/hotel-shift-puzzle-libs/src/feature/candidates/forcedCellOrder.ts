/**
 * forcedCellOrder — 確定提案をどの順に承認していくか
 *
 * Tab を押し続けるだけで提案を順に潰していけるようにするための並べ替えと、
 * 「次はどこか」の決定。勤務表の読み順（スタッフ行順 × 稼働日順）に揃える
 * （suggestNextUndecided と同じ順序なので、フォーカスの動きが一貫する）。
 */
import type { ForcedCell } from "@bublys-org/hotel-shift-puzzle-model";

/** 確定提案を勤務表の並び（スタッフ行順 × 稼働日順）に並べ替える */
export function orderForcedCells(
  forced: ForcedCell[],
  staffOrder: string[]
): ForcedCell[] {
  const rankOf = new Map(staffOrder.map((staffId, index) => [staffId, index]));
  return [...forced].sort((a, b) => {
    const rankA = rankOf.get(a.staffId) ?? Number.MAX_SAFE_INTEGER;
    const rankB = rankOf.get(b.staffId) ?? Number.MAX_SAFE_INTEGER;
    if (rankA !== rankB) return rankA - rankB;
    return a.day.key < b.day.key ? -1 : a.day.key > b.day.key ? 1 : 0;
  });
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
