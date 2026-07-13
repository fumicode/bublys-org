import { WorkShiftSet, createDefaultWorkShiftSet } from "@bublys-org/hotel-shift-puzzle-model";
import { GLOBAL_WORKSHIFT_SET_ID } from "../objects/hotelObjects.js";

/** グローバルのサンプル勤務帯セット（早番7:00・中番9:00・遅番13:00） */
export function createSampleWorkShiftSet(): WorkShiftSet {
  return createDefaultWorkShiftSet(GLOBAL_WORKSHIFT_SET_ID);
}
