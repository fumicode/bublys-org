'use client';

import { FC } from "react";
import { useAppSelector } from "@bublys-org/state-management";
import {
  selectHotelShiftPuzzleSelectedMember,
  selectHotelShiftPuzzleMemberById,
} from "../slice/index.js";
import { MemberDetailView } from "../ui/MemberDetailView.js";

type MemberDetailProps = {
  memberId?: string;
};

const buildAvailabilityUrl = (memberId: string) => `hotel-shift-puzzle/members/${memberId}/availableShifts`;

export const MemberDetail: FC<MemberDetailProps> = ({ memberId }) => {
  // memberIdが指定されていればそれを使い、なければ選択中の局員を使う
  const selectedMember = useAppSelector(selectHotelShiftPuzzleSelectedMember);
  const specificMember = useAppSelector(
    memberId ? selectHotelShiftPuzzleMemberById(memberId) : () => undefined
  );

  const member = memberId ? specificMember : selectedMember;

  if (!member) {
    return (
      <div style={{ padding: 16, color: "#666" }}>
        局員を選択してください
      </div>
    );
  }

  return (
    <MemberDetailView
      member={member}
      buildAvailabilityUrl={buildAvailabilityUrl}
    />
  );
};
