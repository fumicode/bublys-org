'use client';

import { FC } from "react";
import styled from "styled-components";
import {
  Staff,
  WorkShift,
  StaffMonthlyShiftWish,
  type WorkingDay,
} from "@bublys-org/hotel-shift-puzzle-model";
import { ShiftWishGridView } from "../ui/ShiftWishGridView.js";
import { buildWishOptions } from "../ui/shiftWishOptions.js";
import { useObject, useObjects, useObjectRepo } from "../objects/repository.js";
import { STAFF_TYPE, WORKSHIFT_TYPE, STAFF_SHIFT_WISH_TYPE } from "../objects/hotelObjects.js";

type Props = {
  staffId: string;
  year: number;
  month: number;
};

/**
 * スタッフ月別シフト希望エディタ。(staffId, year, month) の希望をリポジトリで読み書きする。
 * 希望は店舗・勤務表に依存しないアプリ全体の集約（無ければ空から作って保存）。
 */
export const ShiftWishEditor: FC<Props> = ({ staffId, year, month }) => {
  const staff = useObject<Staff>(STAFF_TYPE, staffId);
  const workShifts = useObjects<WorkShift>(WORKSHIFT_TYPE);
  const wishId = StaffMonthlyShiftWish.idOf(staffId, year, month);
  const stored = useObject<StaffMonthlyShiftWish>(STAFF_SHIFT_WISH_TYPE, wishId);
  const repo = useObjectRepo<StaffMonthlyShiftWish>(STAFF_SHIFT_WISH_TYPE);

  // 無ければ空の希望をその場で用意（保存は最初の編集時）
  const wish = stored ?? StaffMonthlyShiftWish.create({ staffId, year, month });
  const options = buildWishOptions(workShifts.map((w) => w.name));

  const handleCycle = (day: WorkingDay, optionKey: string) => {
    repo.save(wish.cyclePreference(day, optionKey));
  };

  return (
    <StyledContainer>
      <div className="e-header">
        <h3>
          シフト希望{" "}
          <span className="e-sub">
            {staff?.name ?? staffId} / {year}年{month}月
          </span>
        </h3>
        <p className="e-note">
          各日・各希望をクリックで「○ したい → × 避けたい → 空欄（どうでもいい）」を切り替え。
        </p>
      </div>
      <ShiftWishGridView wish={wish} options={options} onCycle={handleCycle} />
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  padding: 8px;

  .e-header {
    margin-bottom: 8px;
    h3 {
      margin: 0;
    }
    .e-sub {
      font-weight: normal;
      font-size: 0.8em;
      color: #777;
    }
    .e-note {
      margin: 4px 0 0;
      font-size: 0.78em;
      color: #888;
    }
  }
`;
