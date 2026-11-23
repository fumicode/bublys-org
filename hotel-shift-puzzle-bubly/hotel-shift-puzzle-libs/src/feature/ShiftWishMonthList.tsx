'use client';

import { FC, useMemo } from "react";
import {
  Staff,
  MonthlyStaffSchedule,
  StaffMonthlyShiftWish,
  type SchedulePeriod,
} from "@bublys-org/hotel-shift-puzzle-model";
import { ShiftWishMonthListView } from "../ui/ShiftWishMonthListView.js";
import { periodProgressList } from "./shiftWishMonths.js";
import { useObjects } from "../objects/repository.js";
import { STAFF_TYPE, SCHEDULE_TYPE, STAFF_SHIFT_WISH_TYPE } from "../objects/hotelObjects.js";

type ShiftWishMonthListProps = {
  /** その期のシフト希望一覧バブルの URL（ObjectView に渡す。app 層から注入） */
  periodUrl: (period: SchedulePeriod) => string;
};

/**
 * シフト希望の入口（期の一覧）。
 *
 * 希望を集める期は「勤務表がある期」＝シフト作成者がシフトを組もうとしている期、というルールで
 * 決める。期を別途「募集中」と登録する仕組みは作らない（勤務表を作ったことが合図になる）。
 */
export const ShiftWishMonthList: FC<ShiftWishMonthListProps> = ({ periodUrl }) => {
  const staffList = useObjects<Staff>(STAFF_TYPE);
  const schedules = useObjects<MonthlyStaffSchedule>(SCHEDULE_TYPE);
  const wishes = useObjects<StaffMonthlyShiftWish>(STAFF_SHIFT_WISH_TYPE);

  const periods = useMemo(
    () => periodProgressList(schedules, wishes, staffList.length),
    [schedules, wishes, staffList.length]
  );

  return (
    <ShiftWishMonthListView periods={periods} periodUrl={periodUrl} />
  );
};
