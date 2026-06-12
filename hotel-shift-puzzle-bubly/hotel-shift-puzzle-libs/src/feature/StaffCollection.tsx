'use client';

import { FC, useEffect } from "react";
import styled from "styled-components";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import { selectStaffList, setStaffList } from "../slice/index.js";
import { StaffListView } from "../ui/StaffListView.js";
import { createSampleStaffList } from "../data/sampleStaff.js";

/** スタッフ詳細バブルの URL を組み立てる */
export const buildStaffDetailUrl = (staffId: string) =>
  `hotel-shift-puzzle/staffs/${staffId}`;

export const StaffCollection: FC = () => {
  const dispatch = useAppDispatch();
  const staffList = useAppSelector(selectStaffList);

  // 初期データのロード（空ならサンプルを投入）
  useEffect(() => {
    if (staffList.length === 0) {
      const sample = createSampleStaffList();
      dispatch(setStaffList(sample.map((s) => s.state)));
    }
  }, [dispatch, staffList.length]);

  return (
    <StyledContainer>
      <div className="e-header">
        <h3>スタッフ一覧 ({staffList.length}名)</h3>
      </div>
      <StaffListView staffList={staffList} buildDetailUrl={buildStaffDetailUrl} />
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  .e-header {
    margin-bottom: 8px;

    h3 {
      margin: 0;
    }
  }
`;
