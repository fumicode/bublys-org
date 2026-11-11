'use client';

import { FC, useMemo } from "react";
import {
  Staff,
  StaffMonthlyShiftWish,
  type SchedulePeriod,
} from "@bublys-org/hotel-shift-puzzle-model";
import { ShiftWishStaffListView } from "../ui/ShiftWishStaffListView.js";
import { staffWishRows } from "./shiftWishMonths.js";
import { useObjects } from "../objects/repository.js";
import { STAFF_TYPE, STAFF_SHIFT_WISH_TYPE } from "../objects/hotelObjects.js";

type ShiftWishStaffListProps = {
  /** 希望を出す期 */
  period: SchedulePeriod;
  /** その人の希望入力表バブルの URL（ObjectView に渡す。app 層から注入） */
  wishUrl: (staffId: string) => string;
};

/**
 * ある期のシフト希望の回収状況（スタッフ全員ぶん）。
 *
 * 対象の期は URL（期のキー）で決まる。別の期を見たければ、その期のバブルを開く。
 */
export const ShiftWishStaffList: FC<ShiftWishStaffListProps> = ({
  period,
  wishUrl,
}) => {
  const staffList = useObjects<Staff>(STAFF_TYPE);
  const wishes = useObjects<StaffMonthlyShiftWish>(STAFF_SHIFT_WISH_TYPE);

  const rows = useMemo(
    () => staffWishRows(staffList, wishes, period),
    [staffList, wishes, period]
  );

  return (
    <ShiftWishStaffListView
      period={period}
      rows={rows}
      wishUrl={wishUrl}
    />
  );
};
