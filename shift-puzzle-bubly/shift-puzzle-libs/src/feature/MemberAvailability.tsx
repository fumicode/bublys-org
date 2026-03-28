'use client';

import { FC, useMemo } from "react";
import { useAppSelector } from "@bublys-org/state-management";
import { selectShiftPuzzleMemberList } from "../slice/index.js";
import { MemberAvailabilityView } from "../ui/MemberAvailabilityView.js";
import { createDefaultShifts } from "../data/sampleData.js";

type MemberAvailabilityProps = {
  memberId: string;
};

export const MemberAvailability: FC<MemberAvailabilityProps> = ({ memberId }) => {
  const memberList = useAppSelector(selectShiftPuzzleMemberList);
  const member = memberList.find((m) => m.id === memberId);

  const shifts = useMemo(() => createDefaultShifts(), []);

  if (!member) {
    return <div>局員が見つかりません</div>;
  }

  return <MemberAvailabilityView member={member} shifts={shifts} />;
};
