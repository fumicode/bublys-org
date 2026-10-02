'use client';

import { FC, useMemo } from "react";
import {
  MonthlyStaffSchedule,
  Staff,
  StaffMonthlyShiftWish,
  WorkingStaffGroup,
} from "@bublys-org/hotel-shift-puzzle-model";
import { ShiftWishStaffListView } from "../ui/ShiftWishStaffListView.js";
import { staffWishRows, workingStaffOfMonth } from "./shiftWishMonths.js";
import { useObjects } from "../objects/repository.js";
import {
  STAFF_TYPE,
  STAFF_SHIFT_WISH_TYPE,
  SCHEDULE_TYPE,
  WORKING_STAFF_GROUP_TYPE,
} from "../objects/hotelObjects.js";

type ShiftWishStaffListProps = {
  year: number;
  /** 1-12 */
  month: number;
  /** その人の希望入力表バブルの URL（ObjectView に渡す。app 層から注入） */
  wishUrl: (staffId: string) => string;
};

/**
 * ある月のシフト希望の回収状況（**その月に働く人ぶん**）。
 *
 * 対象の月は URL（:year/:month）で決まる。別の月を見たければ、その月のバブルを開く。
 *
 * 顔ぶれは名簿ではなく、その月の勤務表が指す**勤務スタッフ群**が決める（#159）。
 * ここは `ScheduleWorld` の外（＝世界をまたぐ問い合わせ）なので、勤務表と群は
 * `readScopeIdOf` の `!world.born` 経路で APP スコープ＝全世界の最新値から読まれる。
 * だから勤務表1つに絞る必要がなく、URL に scheduleId も要らない。
 *
 * 希望そのものは非メンバー（external）なので、どの勤務表から来ても同じ1つを指す。
 * 同じ月に勤務表が2つあっても、希望を2回集めることにはならない。
 */
export const ShiftWishStaffList: FC<ShiftWishStaffListProps> = ({
  year,
  month,
  wishUrl,
}) => {
  const roster = useObjects<Staff>(STAFF_TYPE);
  const schedules = useObjects<MonthlyStaffSchedule>(SCHEDULE_TYPE);
  const groups = useObjects<WorkingStaffGroup>(WORKING_STAFF_GROUP_TYPE);
  const wishes = useObjects<StaffMonthlyShiftWish>(STAFF_SHIFT_WISH_TYPE);

  const rows = useMemo(
    () =>
      staffWishRows(
        workingStaffOfMonth(schedules, groups, roster, year, month),
        wishes,
        year,
        month
      ),
    [schedules, groups, roster, wishes, year, month]
  );

  return (
    <ShiftWishStaffListView
      year={year}
      month={month}
      rows={rows}
      wishUrl={wishUrl}
    />
  );
};
