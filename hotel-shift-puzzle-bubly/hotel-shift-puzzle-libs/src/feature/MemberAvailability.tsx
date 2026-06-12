'use client';

import { FC, useMemo } from "react";
import { useAppSelector } from "@bublys-org/state-management";
import {
  selectHotelShiftPuzzleMemberList,
  selectHotelShiftPuzzlePlanById,
  selectHotelShiftPuzzleCurrentPlan,
  selectHotelShiftPuzzlePlans,
  selectShiftPreferenceByMemberId,
} from "../slice/index.js";
import { MemberAvailabilityView } from "../ui/MemberAvailabilityView.js";
import { createDefaultShifts, createDefaultTimeSchedules } from "../data/sampleData.js";
import type { Shift, TimeSchedule } from "../domain/index.js";

type MemberAvailabilityProps = {
  memberId: string;
  /** このプランでの配置状況を15分毎に表示する。未指定時はカレントプラン／先頭プランを使用 */
  shiftPlanId?: string;
};

export const MemberAvailability: FC<MemberAvailabilityProps> = ({ memberId, shiftPlanId }) => {
  const memberList = useAppSelector(selectHotelShiftPuzzleMemberList);
  const allPlans = useAppSelector(selectHotelShiftPuzzlePlans);
  const shiftPreference = useAppSelector(selectShiftPreferenceByMemberId(memberId));

  // shiftPlanId が指定されていれば参照用に取得（表示対象は全プラン）
  const explicitPlan = useAppSelector(
    shiftPlanId ? selectHotelShiftPuzzlePlanById(shiftPlanId) : () => undefined,
  );
  const currentPlan = useAppSelector(selectHotelShiftPuzzleCurrentPlan);

  const member = memberList.find((m) => m.id === memberId);

  const fallbackShifts = useMemo(() => createDefaultShifts(), []);
  const fallbackTimeSchedules = useMemo(() => createDefaultTimeSchedules(), []);

  // 全プランの shifts を結合して全日程の配置状況を渡す
  const allShifts = useMemo(
    () => allPlans.flatMap((p) => p.shifts),
    [allPlans],
  );
  const allTimeSchedules = useMemo(() => {
    const seen = new Map<string, TimeSchedule>();
    allPlans.flatMap((p) => p.timeSchedules).forEach((ts) => seen.set(ts.id, ts));
    return Array.from(seen.values());
  }, [allPlans]);

  // shiftPlanId 指定時はそのプランのTimeScheduleを優先（フォールバック用）
  const refPlan = explicitPlan ?? currentPlan ?? allPlans[0];

  const shifts: readonly Shift[] = allShifts.length > 0 ? allShifts : fallbackShifts;
  const timeSchedules: readonly TimeSchedule[] =
    allTimeSchedules.length > 0
      ? allTimeSchedules
      : (refPlan?.timeSchedules.length ? refPlan.timeSchedules : fallbackTimeSchedules);

  if (!member) {
    return <div>局員が見つかりません</div>;
  }

  return (
    <MemberAvailabilityView
      member={member}
      shifts={shifts}
      timeSchedules={timeSchedules}
      shiftPreference={shiftPreference}
    />
  );
};
