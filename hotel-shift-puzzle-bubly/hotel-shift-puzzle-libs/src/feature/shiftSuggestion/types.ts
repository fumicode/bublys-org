import type {
  ShiftCell,
  WorkingDay,
  MonthlyStaffSchedule,
  ScheduleConstraint,
  WorkShift,
  DecodedWish,
} from "@bublys-org/hotel-shift-puzzle-model";

export type PolicyShiftSuggestion = {
  /** stable id e.g. `${staffId}:${dayKey}:${shiftCellKey}` */
  id: string;
  cell: ShiftCell;
  score: number;
  reasons: string[];
  wouldConcede: boolean;
};

export type RankCellCandidatesArgs = {
  schedule: MonthlyStaffSchedule;
  constraints: ScheduleConstraint[];
  staffId: string;
  day: WorkingDay;
  workShifts: WorkShift[];
  preferenceOf?: (staffId: string, day: WorkingDay) => DecodedWish;
  isAvailable?: (staffId: string, shiftId: string) => boolean;
  linkedReportScoreOf?: (staffId: string) => number;
  isBusyDay?: (dayKey: string) => boolean;
};

export interface ShiftSuggestionPolicy {
  rankCellCandidates(args: RankCellCandidatesArgs): PolicyShiftSuggestion[];
}
