'use client';

import { FC, useMemo } from "react";
import { useAppSelector } from "@bublys-org/state-management";
import { selectShiftPuzzleStaffList } from "../slice/index.js";
import { StaffAvailabilityView } from "../ui/StaffAvailabilityView.js";
import { TimeSlot_時間帯 } from "../domain/index.js";

type StaffAvailabilityProps = {
  staffId: string;
};

export const StaffAvailability: FC<StaffAvailabilityProps> = ({ staffId }) => {
  const staffList = useAppSelector(selectShiftPuzzleStaffList);
  const staff = staffList.find((s) => s.id === staffId);

  // デフォルトの時間帯を取得
  const timeSlots = useMemo(() => TimeSlot_時間帯.createDefaultTimeSlots(), []);

  if (!staff) {
    return <div>スタッフが見つかりません</div>;
  }

  return <StaffAvailabilityView staff={staff} timeSlots={timeSlots} />;
};
