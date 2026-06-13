'use client';

import { FC } from "react";
import { Staff } from "@bublys-org/hotel-shift-puzzle-model";
import { StaffDetailView } from "../ui/StaffDetailView.js";
import { useObject } from "../objects/repository.js";
import { STAFF_TYPE } from "../objects/hotelObjects.js";

type StaffDetailProps = {
  staffId?: string;
};

export const StaffDetail: FC<StaffDetailProps> = ({ staffId }) => {
  const staff = useObject<Staff>(STAFF_TYPE, staffId);

  if (!staff) {
    return (
      <div style={{ padding: 16, color: "#666" }}>
        スタッフを選択してください
      </div>
    );
  }

  return <StaffDetailView staff={staff} />;
};
