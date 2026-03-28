'use client';

import { FC } from "react";
import { useAppSelector } from "@bublys-org/state-management";
import {
  selectShiftPuzzleSelectedMember,
  selectShiftPuzzleMemberById,
} from "../slice/index.js";
import { MemberDetailView } from "../ui/MemberDetailView.js";

type MemberDetailProps = {
  memberId?: string;
  onOpenAvailability?: (memberId: string) => void;
};

const buildAvailabilityUrl = (memberId: string) => `shift-puzzle/members/${memberId}/availableShifts`;

export const MemberDetail: FC<MemberDetailProps> = ({ memberId, onOpenAvailability }) => {
  // memberIdが指定されていればそれを使い、なければ選択中の局員を使う
  const selectedMember = useAppSelector(selectShiftPuzzleSelectedMember);
  const specificMember = useAppSelector(
    memberId ? selectShiftPuzzleMemberById(memberId) : () => undefined
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
      onOpenAvailability={onOpenAvailability}
    />
  );
};
