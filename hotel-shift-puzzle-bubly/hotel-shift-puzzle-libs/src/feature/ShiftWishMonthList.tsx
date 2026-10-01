'use client';

import { FC, useMemo } from "react";
import {
  Staff,
  MonthlyStaffSchedule,
  StaffMonthlyShiftWish,
  WorkingStaffGroup,
} from "@bublys-org/hotel-shift-puzzle-model";
import { ShiftWishMonthListView } from "../ui/ShiftWishMonthListView.js";
import { monthProgressList } from "./shiftWishMonths.js";
import { useObjects } from "../objects/repository.js";
import {
  STAFF_TYPE,
  SCHEDULE_TYPE,
  STAFF_SHIFT_WISH_TYPE,
  WORKING_STAFF_GROUP_TYPE,
} from "../objects/hotelObjects.js";

type ShiftWishMonthListProps = {
  /** その月のシフト希望一覧バブルの URL（ObjectView に渡す。app 層から注入） */
  monthUrl: (year: number, month: number) => string;
};

/**
 * シフト希望の入口（月一覧）。
 *
 * 希望を集める月は「勤務表がある月」＝シフト作成者がシフトを組もうとしている月、というルールで
 * 決める。月を別途「募集中」と登録する仕組みは作らない（勤務表を作ったことが合図になる）。
 *
 * 「◯人中」の分母は名簿の人数ではなく、**その月に働く人の数**（#159）。月をクリックした先の
 * 月別一覧が出す行数と揃えるため。群も勤務表も live なので、ここ（`ScheduleWorld` の外）では
 * APP スコープ＝全世界の最新値から読まれる。
 */
export const ShiftWishMonthList: FC<ShiftWishMonthListProps> = ({ monthUrl }) => {
  const roster = useObjects<Staff>(STAFF_TYPE);
  const schedules = useObjects<MonthlyStaffSchedule>(SCHEDULE_TYPE);
  const groups = useObjects<WorkingStaffGroup>(WORKING_STAFF_GROUP_TYPE);
  const wishes = useObjects<StaffMonthlyShiftWish>(STAFF_SHIFT_WISH_TYPE);

  const months = useMemo(
    () => monthProgressList(schedules, groups, roster, wishes),
    [schedules, groups, roster, wishes]
  );

  return (
    <ShiftWishMonthListView months={months} monthUrl={monthUrl} />
  );
};
