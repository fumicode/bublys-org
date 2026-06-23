import { WorkShift, createDefaultWorkShifts } from "@bublys-org/hotel-shift-puzzle-model";

/** サンプルの勤務帯一覧（早番7:00・中番9:00・遅番13:00） */
export function createSampleWorkShifts(): WorkShift[] {
  return createDefaultWorkShifts();
}
