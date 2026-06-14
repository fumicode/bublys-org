'use client';

/**
 * サンプルデータの初回投入。
 *
 * 全オブジェクトは共有のアプリ全体スコープに載るため:
 *   - 複数バブルが個別に seed すると二重投入になりうる → モジュールフラグで一度だけ
 *   - 複数の addObject を同期で呼ぶと各 grow が stale graph から派生して上書きし合う
 *     → addObjects で「1回の grow」にまとめて投入する
 * 永続データがあれば（length>0）その型は投入しない。
 */
import { useEffect } from "react";
import { useCasScope } from "@bublys-org/world-line-graph";
import {
  Staff,
  WorkShift,
  MonthlyStaffSchedule,
} from "@bublys-org/hotel-shift-puzzle-model";
import { useObjects, APP_SCOPE_ID } from "./repository.js";
import { STAFF_TYPE, WORKSHIFT_TYPE, SCHEDULE_TYPE } from "./hotelObjects.js";
import { createSampleStaffList } from "../data/sampleStaff.js";
import { createSampleWorkShifts } from "../data/sampleWorkShifts.js";
import { createSampleSchedule } from "../data/sampleSchedule.js";

let seeded = false;

export function useSeedHotelData(): void {
  const scope = useCasScope(APP_SCOPE_ID);
  const staff = useObjects<Staff>(STAFF_TYPE);
  const workShifts = useObjects<WorkShift>(WORKSHIFT_TYPE);
  const schedules = useObjects<MonthlyStaffSchedule>(SCHEDULE_TYPE);

  useEffect(() => {
    if (seeded) return;
    seeded = true;

    const items: { type: string; object: unknown }[] = [];
    if (staff.length === 0) {
      items.push(...createSampleStaffList().map((o) => ({ type: STAFF_TYPE, object: o })));
    }
    if (workShifts.length === 0) {
      items.push(
        ...createSampleWorkShifts().map((o) => ({ type: WORKSHIFT_TYPE, object: o }))
      );
    }
    if (schedules.length === 0) {
      items.push({ type: SCHEDULE_TYPE, object: createSampleSchedule() });
    }
    if (items.length > 0) scope.addObjects(items); // 1回の grow でまとめて投入
    // 初回マウント時に一度だけ
  }, []);
}
