'use client';

import { FC } from "react";
import styled from "styled-components";
import { Button } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import {
  Staff,
  WorkShiftSet,
  StaffMonthlyShiftWish,
  type WorkingDay,
} from "@bublys-org/hotel-shift-puzzle-model";
import { ShiftWishGridView } from "../ui/ShiftWishGridView.js";
import { buildWishOptions, toggleWishInput } from "../ui/shiftWishOptions.js";
import { useObject, useObjectRepo } from "../objects/repository.js";
import {
  STAFF_TYPE,
  WORKSHIFT_SET_TYPE,
  GLOBAL_WORKSHIFT_SET_ID,
  STAFF_SHIFT_WISH_TYPE,
} from "../objects/hotelObjects.js";

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
  // 希望は勤務表に紐づかない（スタッフ×月）ので、グローバルの勤務帯セットから選択肢を作る
  const workShiftSet = useObject<WorkShiftSet>(WORKSHIFT_SET_TYPE, GLOBAL_WORKSHIFT_SET_ID);
  const workShifts = workShiftSet?.shifts ?? [];
  const wishId = StaffMonthlyShiftWish.idOf(staffId, year, month);
  const stored = useObject<StaffMonthlyShiftWish>(STAFF_SHIFT_WISH_TYPE, wishId);
  const repo = useObjectRepo<StaffMonthlyShiftWish>(STAFF_SHIFT_WISH_TYPE);

  // 無ければ空の希望をその場で用意（保存は最初の編集時）
  const wish = stored ?? StaffMonthlyShiftWish.create({ staffId, year, month });
  const options = buildWishOptions(workShifts.map((w) => w.name));

  const handleToggle = (day: WorkingDay, optionKey: string) => {
    repo.save(toggleWishInput(wish, day, optionKey, options.map((o) => o.key)));
  };

  // 提出は「いつ出したか」を残す。現在時刻はドメインではなくこの層が渡す。
  const handleSubmit = () => repo.save(wish.submit(new Date().toISOString()));
  const handleWithdraw = () => repo.save(wish.withdraw());

  return (
    <StyledContainer>
      <div className="e-header">
        <h3>
          シフト希望{" "}
          <span className="e-sub">
            {staff?.name ?? staffId} / {year}年{month}月
          </span>
        </h3>
        {wish.isSubmitted ? (
          <p className="e-note">
            提出済みです。直すには「取り下げて編集」を押してください。
          </p>
        ) : (
          <p className="e-note">
            <b>休</b>＝その日は休みたい／<b>×</b>＝この勤務帯には入れない。クリックで入／切。
            1日に出せるのはどちらか一方で、休みの日の勤務帯は斜線になります（斜線を押すと休みが外れます）。
            すべての勤務帯に × を付けると、自動で休み希望になります。
          </p>
        )}
      </div>

      <ShiftWishGridView
        wish={wish}
        options={options}
        onToggle={handleToggle}
        readOnly={wish.isSubmitted}
      />

      <div className="e-actions">
        {wish.isSubmitted ? (
          <>
            <span className="e-submitted">
              <CheckCircleIcon fontSize="small" />
              提出済み
            </span>
            <Button size="small" onClick={handleWithdraw}>
              取り下げて編集
            </Button>
          </>
        ) : (
          <>
            <span className="e-draft">下書き（まだ提出されていません）</span>
            <Button size="small" variant="contained" onClick={handleSubmit}>
              提出する
            </Button>
          </>
        )}
      </div>
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

  .e-actions {
    margin-top: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.8em;
  }
  .e-draft {
    color: #888;
  }
  .e-submitted {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    color: #558b2f;
    font-weight: bold;
  }
`;
