import {
  computeConstraintDelta,
  shiftCellKey,
  type MonthlyStaffSchedule,
  type ScheduleConstraint,
  type ShiftCell,
  type WorkShift,
  type WorkingDay,
  type DecodedWish,
} from "@bublys-org/hotel-shift-puzzle-model";

export type CellCandidateFeatures = {
  /** 1 if matches wish work/day-off */
  wishMatch: number;
  /** 1 if staffing gap > 0 for that shift */
  fillsDemand: number;
  availabilityOk: number;
  /** normalized 0–1 */
  linkedReportScore: number;
  isBusyDay: number;
  isDayOff: number;
  /** candidate is undecided — usually low */
  isUndecided: number;
  /** 0/1 from constraint check */
  wouldConcede: number;
};

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

export type BuildCellFeaturesArgs = {
  schedule: MonthlyStaffSchedule;
  constraints: ScheduleConstraint[];
  staffId: string;
  day: WorkingDay;
  cell: ShiftCell;
  workShifts: WorkShift[];
  preferenceOf?: (staffId: string, day: WorkingDay) => DecodedWish;
  isAvailable?: (staffId: string, shiftId: string) => boolean;
  linkedReportScoreOf?: (staffId: string) => number;
  isBusyDay?: (dayKey: string) => boolean;
  /** linkedReportScore の正規化用（0 なら 1 にフォールバック） */
  maxLinkedReportScore?: number;
};

function staffingGap(
  schedule: MonthlyStaffSchedule,
  day: WorkingDay,
  shiftId: string,
  shiftNameById: Map<string, string>
): number {
  const name = shiftNameById.get(shiftId);
  if (!name) return 0;
  const required = schedule.requiredStaffing.requiredFor(day, name);
  const assigned = schedule
    .assignmentsOn(day)
    .filter((a) => a.isWorking && a.shiftId === shiftId).length;
  return required - assigned;
}

function wishMatches(
  cell: ShiftCell,
  wish: DecodedWish | undefined
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

function wouldConcedeForCell(
  schedule: MonthlyStaffSchedule,
  constraints: ScheduleConstraint[],
  staffId: string,
  day: WorkingDay,
  cell: ShiftCell
): number {
  const before = schedule.checkConstraints(constraints);
  const after = schedule.setCell(staffId, day, cell).checkConstraints(constraints);
  const delta = computeConstraintDelta(before, after);
  return delta.concessions.length > 0 ? 1 : 0;
}

export function buildCellCandidateFeatures(
  args: BuildCellFeaturesArgs
): CellCandidateFeatures {
  const shiftNameById = new Map(args.workShifts.map((w) => [w.id, w.name]));
  const wish = args.preferenceOf?.(args.staffId, args.day);

  let availabilityOk = 1;
  if (args.cell.kind === "work") {
    availabilityOk = args.isAvailable
      ? args.isAvailable(args.staffId, args.cell.shiftId)
        ? 1
        : 0
      : 1;
  }

  let fillsDemand = 0;
  if (args.cell.kind === "work") {
    fillsDemand = staffingGap(args.schedule, args.day, args.cell.shiftId, shiftNameById) > 0 ? 1 : 0;
  }

  const rawLinked = args.linkedReportScoreOf?.(args.staffId) ?? 0;
  const maxLinked = args.maxLinkedReportScore ?? 1;
  const linkedReportScore = rawLinked / Math.max(1, maxLinked);

  const isBusy = args.isBusyDay?.(args.day.key) ? 1 : 0;

  return {
    wishMatch: wishMatches(args.cell, wish),
    fillsDemand,
    availabilityOk,
    linkedReportScore,
    isBusyDay: isBusy,
    isDayOff: args.cell.kind === "day-off" ? 1 : 0,
    isUndecided: args.cell.kind === "undecided" ? 1 : 0,
    wouldConcede: wouldConcedeForCell(
      args.schedule,
      args.constraints,
      args.staffId,
      args.day,
      args.cell
    ),
  };
}

export function featuresToVector(f: CellCandidateFeatures): number[] {
  return FEATURE_NAMES.map((name) => f[name]);
}

export function suggestionIdFor(
  staffId: string,
  dayKey: string,
  cell: ShiftCell
): string {
  return `${staffId}:${dayKey}:${shiftCellKey(cell)}`;
}

/** 勤務帯 + 休み + 未定の候補セル */
export function enumerateCellCandidates(workShifts: WorkShift[]): ShiftCell[] {
  const cells: ShiftCell[] = workShifts.map((w) => ({
    kind: "work",
    shiftId: w.id,
  }));
  cells.push({ kind: "day-off" });
  cells.push({ kind: "undecided" });
  return cells;
}
