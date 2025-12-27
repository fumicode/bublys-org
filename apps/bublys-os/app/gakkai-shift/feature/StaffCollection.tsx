'use client';

import { FC, useEffect } from "react";
import {
  useAppDispatch,
  useAppSelector,
  selectGakkaiShiftStaffList,
  selectGakkaiShiftSelectedStaffId,
  setStaffList,
  setSelectedStaffId,
} from "@bublys-org/state-management";
import { StaffListView } from "../ui/StaffListView";
import { createSampleStaffList } from "../data/sampleStaff";

type StaffCollectionProps = {
  onStaffSelect?: (staffId: string) => void;
};

const buildDetailUrl = (staffId: string) => `gakkai-shift/staffs/${staffId}`;

export const StaffCollection: FC<StaffCollectionProps> = ({ onStaffSelect }) => {
  const dispatch = useAppDispatch();
  const staffList = useAppSelector(selectGakkaiShiftStaffList);
  const selectedStaffId = useAppSelector(selectGakkaiShiftSelectedStaffId);

  // 初期データのロード
  useEffect(() => {
    if (staffList.length === 0) {
      const sampleData = createSampleStaffList();
      dispatch(setStaffList(sampleData.map((s) => s.toJSON())));
    }
  }, [dispatch, staffList.length]);

  const handleStaffClick = (staffId: string) => {
    dispatch(setSelectedStaffId(staffId));
    onStaffSelect?.(staffId);
  };

  return (
    <div>
      <h3>スタッフ一覧 ({staffList.length}名)</h3>
      <StaffListView
        staffList={staffList}
        selectedStaffId={selectedStaffId}
        buildDetailUrl={buildDetailUrl}
        onStaffClick={handleStaffClick}
      />
    </div>
  );
};
