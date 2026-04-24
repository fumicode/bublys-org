'use client';

import { FC, useMemo } from "react";
import { useAppSelector } from "@bublys-org/state-management";
import {
  selectShiftPuzzleMemberList,
  selectShiftPuzzlePlanById,
  selectShiftPuzzleCurrentPlan,
  selectShiftPuzzlePlans,
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
  const memberList = useAppSelector(selectShiftPuzzleMemberList);
  const explicitPlan = useAppSelector(
    shiftPlanId ? selectShiftPuzzlePlanById(shiftPlanId) : () => undefined,
  );
  const currentPlan = useAppSelector(selectShiftPuzzleCurrentPlan);
  const allPlans = useAppSelector(selectShiftPuzzlePlans);

  const member = memberList.find((m) => m.id === memberId);

  const plan = explicitPlan ?? currentPlan ?? allPlans[0];

  // プランに紐づく shifts / timeSchedules（無ければサンプルデータにフォールバック）
  const fallbackShifts = useMemo(() => createDefaultShifts(), []);
  const fallbackTimeSchedules = useMemo(() => createDefaultTimeSchedules(), []);

  const shifts: readonly Shift[] =
    plan && plan.shifts.length > 0 ? plan.shifts : fallbackShifts;
  const timeSchedules: readonly TimeSchedule[] =
    plan && plan.timeSchedules.length > 0 ? plan.timeSchedules : fallbackTimeSchedules;

  if (!member) {
    return <div>局員が見つかりません</div>;
  }

  return (
    <MemberAvailabilityView
      member={member}
      shifts={shifts}
      timeSchedules={timeSchedules}
    />
  );
};
