'use client';

import { FC } from "react";
import styled from "styled-components";
import { Staff } from "@bublys-org/hotel-shift-puzzle-model";
import { StaffListView } from "../ui/StaffListView.js";
import { useObjects, useObjectRepo } from "../objects/repository.js";
import { useSeedHotelData } from "../objects/seed.js";
import { STAFF_TYPE } from "../objects/hotelObjects.js";

/** 新しいスタッフの ID を生成する */
const newStaffId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `staff-${Date.now()}`;

export const StaffCollection: FC = () => {
  useSeedHotelData();
  const staffList = useObjects<Staff>(STAFF_TYPE);
  const actions = useObjectRepo<Staff>(STAFF_TYPE);

  const handleCreate = (name: string, department: string) => {
    actions.save(new Staff({ id: newStaffId(), name, department: department || undefined }));
  };

  const handleRename = (id: string, name: string) => {
    const staff = staffList.find((s) => s.id === id);
    if (staff) actions.save(staff.rename(name));
  };

  const handleRemove = (id: string) => {
    actions.remove(id);
  };

  return (
    <StyledContainer>
      <div className="e-header">
        <h3>スタッフ一覧 ({staffList.length}名)</h3>
      </div>
      <StaffListView
        staffList={staffList}
        onCreate={handleCreate}
        onRename={handleRename}
        onRemove={handleRemove}
      />
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  .e-header {
    margin-bottom: 4px;

    h3 {
      margin: 0;
    }
  }
`;
