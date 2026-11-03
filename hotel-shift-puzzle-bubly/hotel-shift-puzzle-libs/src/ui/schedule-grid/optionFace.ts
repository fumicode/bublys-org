import type {
  CellValuePreview,
  ConstraintViolation,
  ShiftCell,
  WorkShift,
  WorkingDay,
} from "../../domain/index.js";
import { SHIFT_WISH_MISMATCH } from "../shiftWishOptions.js";
import type { ShiftOptionFace } from "./ShiftSuggestionDropdown.js";
import { cellFaceMarksOf } from "./violationMarkPlacement.js";
import type { WishEntry } from "./wishSummary.js";

/** 選択肢（セルの値）を引くキー */
export const optionKeyOf = (cell: ShiftCell): string =>
  cell.kind === "work" ? `work:${cell.shiftId}` : cell.kind;

const sameCell = (a: ShiftCell, b: ShiftCell): boolean => optionKeyOf(a) === optionKeyOf(b);

type OptionFaceContext = {
  staffId: string;
  day: WorkingDay;
  shiftMap: Map<string, WorkShift>;
  wishEntries: WishEntry[];
  /** そのセルの唯一の提案（候補集合が1つに絞られた値）。無ければ undefined */
  forced?: ShiftCell;
};

/**
 * 選択肢1つの「入れたときのセルの姿」を組み立てる。
 *
 *   - 印・希望の円 … 入れたあとの盤面で**このセルにかかる違反**（勤務表のセルに出るものと同じ）
 *   - 違反         … このセルにかかる違反＋新しく出る違反のうちセルに印の出ないもの
 *                   （必要人数・責任者のような日単位の違反。勤務表では列の警告として出る）。
 *                   選択肢には短い要約（labels＝違反の summary）を出し、文（messages）はホバーに任せる
 *   - 破線（提案） … 候補集合がこの値1つに絞られたときだけ
 *
 * preview が無ければ（制約を渡されていない）違反は描かない。
 */
export function optionFaceOf(
  cell: ShiftCell,
  preview: CellValuePreview | undefined,
  ctx: OptionFaceContext
): ShiftOptionFace {
  const onCell = (preview?.after ?? []).filter((v) => v.coversCell(ctx.staffId, ctx.day));
  const offCell = (preview?.introduced ?? []).filter(
    (v) => !v.coversCell(ctx.staffId, ctx.day)
  );
  const seen = new Set<string>();
  const messages: string[] = [];
  const labels: string[] = [];
  for (const v of [...onCell, ...offCell] as ConstraintViolation[]) {
    if (seen.has(v.key)) continue;
    seen.add(v.key);
    messages.push(v.message);
    const label = v.summary;
    if (!labels.includes(label)) labels.push(label);
  }
  return {
    cell,
    shift: cell.kind === "work" ? ctx.shiftMap.get(cell.shiftId) : undefined,
    wishEntries: ctx.wishEntries,
    marks: cellFaceMarksOf(onCell, ctx.staffId, ctx.day),
    wishViolation: onCell.find((v) => v.constraintType === SHIFT_WISH_MISMATCH),
    labels,
    messages,
    proposed: !!ctx.forced && sameCell(ctx.forced, cell),
  };
}
