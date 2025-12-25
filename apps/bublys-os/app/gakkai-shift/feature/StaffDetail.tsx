'use client';

import { FC } from "react";
import {
  useAppSelector,
  selectGakkaiShiftSelectedStaff,
  selectGakkaiShiftStaffById,
} from "@bublys-org/state-management";
import { StaffDetailView } from "../ui/StaffDetailView";

type StaffDetailProps = {
  staffId?: string;
  onOpenAvailability?: (staffId: string) => void;
};

const buildAvailabilityUrl = (staffId: string) => `gakkai-shift/staffs/${staffId}/availableTimeSlots`;

export const StaffDetail: FC<StaffDetailProps> = ({ staffId, onOpenAvailability }) => {
  // staffIdが指定されていればそれを使い、なければ選択中のスタッフを使う
  const selectedStaff = useAppSelector(selectGakkaiShiftSelectedStaff);
  const specificStaff = useAppSelector(
    staffId ? selectGakkaiShiftStaffById(staffId) : () => undefined
  );

  const staff = staffId ? specificStaff : selectedStaff;

  if (!staff) {
    return (
      <div style={{ padding: 16, color: "#666" }}>
        スタッフを選択してください
      </div>
    );
  }

  return (
    <StaffDetailView
      staff={staff}
      buildAvailabilityUrl={buildAvailabilityUrl}
      onOpenAvailability={onOpenAvailability}
    />
  );
};
