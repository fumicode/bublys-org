'use client';

import { FC, useMemo } from "react";
import {
  Staff,
  MonthlyStaffSchedule,
  StaffMonthlyShiftWish,
} from "@bublys-org/hotel-shift-puzzle-model";
import {
  ShiftWishListView,
  type ShiftWishMonthSummary,
} from "../ui/ShiftWishListView.js";
import { useObjects } from "../objects/repository.js";
import { useSeedHotelData } from "../objects/seed.js";
import { STAFF_TYPE, SCHEDULE_TYPE, STAFF_SHIFT_WISH_TYPE } from "../objects/hotelObjects.js";
import { setCurrentStaffId, useCurrentStaffId } from "./currentStaff.js";

type ShiftWishCollectionProps = {
  /** 指定した年月の希望入力表バブルを開く（URL のスキームは app 層が持つ） */
  onOpenWish: (staffId: string, year: number, month: number) => void;
};

/**
 * スタッフ本人のシフト希望の入口（#113）。
 *
 * 希望を出す月は「勤務表がある月」＝管理者がシフトを組もうとしている月、というルールで決める。
 * 月を別途「募集中」と登録する仕組みは作らない（勤務表を作ったことが募集の合図になる）。
 */
export const ShiftWishCollection: FC<ShiftWishCollectionProps> = ({ onOpenWish }) => {
  useSeedHotelData();
  const staffList = useObjects<Staff>(STAFF_TYPE);
  const schedules = useObjects<MonthlyStaffSchedule>(SCHEDULE_TYPE);
  const wishes = useObjects<StaffMonthlyShiftWish>(STAFF_SHIFT_WISH_TYPE);
  const currentStaffId = useCurrentStaffId();

  const currentStaff = staffList.find((s) => s.id === currentStaffId) ?? null;

  const months = useMemo<ShiftWishMonthSummary[]>(() => {
    if (!currentStaff) return [];
    const wishOf = new Map(wishes.map((w) => [w.id, w]));

    // 勤務表がある年月（重複除去・古い順）
    const seen = new Set<string>();
    return schedules
      .map((s) => ({ year: s.year, month: s.month }))
      .filter(({ year, month }) => {
        const key = `${year}-${month}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.year - b.year || a.month - b.month)
      .map(({ year, month }) => {
        const wish = wishOf.get(
          StaffMonthlyShiftWish.idOf(currentStaff.id, year, month)
        );
        return {
          year,
          month,
          // 提出済み > 何か入っている（下書き） > 未入力
          status: wish?.isSubmitted
            ? ("submitted" as const)
            : wish && !wish.isEmpty
              ? ("draft" as const)
              : ("empty" as const),
          filledDays: wish?.filledDayCount ?? 0,
          submittedAt: wish?.submittedAt ?? null,
        };
      });
  }, [currentStaff, schedules, wishes]);

  return (
    <ShiftWishListView
      staffList={staffList}
      currentStaff={currentStaff}
      onSelectStaff={setCurrentStaffId}
      onClearStaff={() => setCurrentStaffId(null)}
      months={months}
      onOpenWish={(year, month) =>
        currentStaff && onOpenWish(currentStaff.id, year, month)
      }
    />
  );
};
