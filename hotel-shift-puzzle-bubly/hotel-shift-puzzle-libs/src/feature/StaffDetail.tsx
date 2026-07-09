'use client';

import { FC } from "react";
import { Staff } from "@bublys-org/hotel-shift-puzzle-model";
import { StaffDetailView } from "../ui/StaffDetailView.js";
import { useObject, useObjectRepo } from "../objects/repository.js";
import { STAFF_TYPE } from "../objects/hotelObjects.js";

type StaffDetailProps = {
  staffId?: string;
  /** 指定した年月のシフト希望エディタを開く */
  onOpenWish?: (year: number, month: number) => void;
};


export const StaffDetail: FC<StaffDetailProps> = ({ staffId, onOpenWish }) => {
  const staff = useObject<Staff>(STAFF_TYPE, staffId);
  const actions = useObjectRepo<Staff>(STAFF_TYPE);

  if (!staff) {
    return (
      <div style={{ padding: 16, color: "#666" }}>
        スタッフを選択してください
      </div>
    );
  }

  const handleChangeDepartment = (department: string) => {
    actions.save(staff.changeDepartment(department));
  };

  return (
    <StaffDetailView
      staff={staff}
      onChangeDepartment={handleChangeDepartment}
      onOpenWish={onOpenWish}
    />
  );
};

// コメントアウト