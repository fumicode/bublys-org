import type {
  ShiftCell,
  ShiftLearningExample,
} from "@bublys-org/hotel-shift-puzzle-model";

/** cellFeatures.ts の FEATURE_NAMES と同一順序 */
export const FEATURE_NAMES = [
  "wishMatch",
  "fillsDemand",
  "availabilityOk",
  "linkedReportScore",
  "isBusyDay",
  "isDayOff",
  "isUndecided",
  "wouldConcede",
] as const;

export type ExampleFeatureVector = Record<(typeof FEATURE_NAMES)[number], number>;

function wishMatches(
  cell: ShiftCell,
  wish: ShiftLearningExample["context"]["wish"]
): number {
  if (!wish) return 0;
  if (cell.kind === "day-off" && wish.kind === "day-off") return 1;
  if (
    cell.kind === "work" &&
    wish.kind === "work" &&
    cell.shiftId === wish.shiftId
  ) {
    return 1;
  }
  return 0;
}

export function featuresFromExample(
  example: ShiftLearningExample,
  cell: ShiftCell,
  options?: { maxLinkedReportScore?: number; wouldConcede?: number }
): ExampleFeatureVector {
  const ctx = example.context;
  const maxLinked = options?.maxLinkedReportScore ?? 1;
  const rawLinked = ctx.linkedReportScore ?? 0;

  let availabilityOk = 1;
  if (cell.kind === "work") {
    availabilityOk = ctx.availabilityOk ? 1 : 0;
  }

  let fillsDemand = 0;
  if (cell.kind === "work" && (ctx.requiredStaffingGap ?? 0) > 0) {
    fillsDemand = 1;
  }

  const isChosenCell =
    cell.kind === example.action.cellAfter.kind &&
    (cell.kind !== "work" ||
      (example.action.cellAfter.kind === "work" &&
        cell.shiftId === example.action.cellAfter.shiftId));

  const wouldConcede =
    options?.wouldConcede ??
    (example.action.hadConcession && isChosenCell ? 1 : 0);

  return {
    wishMatch: wishMatches(cell, ctx.wish),
    fillsDemand,
    availabilityOk,
    linkedReportScore: rawLinked / Math.max(1, maxLinked),
    isBusyDay: ctx.isBusyDay ? 1 : 0,
    isDayOff: cell.kind === "day-off" ? 1 : 0,
    isUndecided: cell.kind === "undecided" ? 1 : 0,
    wouldConcede,
  };
}

export function featuresToVector(f: ExampleFeatureVector): number[] {
  return FEATURE_NAMES.map((name) => f[name]);
}

/** 学習用の負例セルを合成する（選ばれなかった候補の近似） */
export function syntheticNegativeCell(cell: ShiftCell): ShiftCell {
  if (cell.kind === "work") return { kind: "day-off" };
  if (cell.kind === "day-off") return { kind: "undecided" };
  return { kind: "day-off" };
}
