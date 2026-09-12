'use client';

import { FC, useMemo } from "react";
import { Staff, StaffMonthlyShiftWish } from "@bublys-org/hotel-shift-puzzle-model";
import { ShiftWishStaffListView } from "../ui/ShiftWishStaffListView.js";
import { staffWishRows } from "./shiftWishMonths.js";
import { useObjects } from "../objects/repository.js";
import { STAFF_TYPE, STAFF_SHIFT_WISH_TYPE } from "../objects/hotelObjects.js";

type ShiftWishStaffListProps = {
  year: number;
  /** 1-12 */
  month: number;
  /** その人の希望入力表バブルの URL（ObjectView に渡す。app 層から注入） */
  wishUrl: (staffId: string) => string;
};

/**
 * ある月のシフト希望の回収状況（スタッフ全員ぶん）。
 *
 * 対象の月は URL（:year/:month）で決まる。別の月を見たければ、その月のバブルを開く。
 */
export const ShiftWishStaffList: FC<ShiftWishStaffListProps> = ({
  year,
  month,
  wishUrl,
}) => {
  const staffList = useObjects<Staff>(STAFF_TYPE);
  const wishes = useObjects<StaffMonthlyShiftWish>(STAFF_SHIFT_WISH_TYPE);

  const rows = useMemo(
    () => staffWishRows(staffList, wishes, year, month),
    [staffList, wishes, year, month]
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
