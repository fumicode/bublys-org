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
};

export const StaffDetail: FC<StaffDetailProps> = ({ staffId }) => {
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

  return <StaffDetailView staff={staff} />;
};
