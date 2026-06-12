'use client';

import { FC } from "react";
import { useAppSelector } from "@bublys-org/state-management";
import { selectStaffById, selectSelectedStaff } from "../slice/index.js";
import { StaffDetailView } from "../ui/StaffDetailView.js";
import { buildStaffDetailUrl } from "./StaffCollection.js";

type StaffDetailProps = {
  staffId?: string;
};

export const StaffDetail: FC<StaffDetailProps> = ({ staffId }) => {
  // staffId が指定されていればそれを使い、なければ選択中のスタッフを使う
  const selectedStaff = useAppSelector(selectSelectedStaff);
  const specificStaff = useAppSelector(
    staffId ? selectStaffById(staffId) : () => undefined
  );

  const staff = staffId ? specificStaff : selectedStaff;

  if (!staff) {
    return (
      <div style={{ padding: 16, color: "#666" }}>
        スタッフを選択してください
      </div>
    );
  }

  return <StaffDetailView staff={staff} buildDetailUrl={buildStaffDetailUrl} />;
};
