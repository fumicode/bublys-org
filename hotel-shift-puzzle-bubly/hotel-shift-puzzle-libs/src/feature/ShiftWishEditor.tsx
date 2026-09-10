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
 *
 * 入力するのはシフト作成者。本人から聞き取った希望をここに写し、聞き終わったら「回収済み」に
 * する（＝その内容で確定。取り消すまで書き換えられない）。対象の人・月は URL で決まるので、
 * この画面の中で対象が入れ替わることはない。
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

  // 回収は「いつ回収したか」を残す。現在時刻はドメインではなくこの層が渡す。
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
            回収済みです。直すには「回収を取り消して編集」を押してください。
          </p>
        ) : (
          <p className="e-note">
            本人から聞き取った希望を入力します。<b>休</b>＝その日は休みたい／<b>×</b>＝この勤務帯には入れない／<b>○</b>
            ＝この勤務帯に入りたい。休み列は押すたびに 空欄→休→空欄、勤務帯列は 空欄→×→○→空欄
            と変わります。 1日に出せるのは休みか勤務帯の希望かどちらか一方で、休みの日の勤務帯は
            斜線になります（斜線を押すと休みが外れます）。 すべての勤務帯に × を付けると、自動で
            休み希望になります。
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
            <span className="e-collected">
              <CheckCircleIcon fontSize="small" />
              回収済み
            </span>
            <Button size="small" onClick={handleWithdraw}>
              回収を取り消して編集
            </Button>
          </>
        ) : (
          <>
            <span className="e-uncollected">まだ回収していません</span>
            <Button size="small" variant="contained" onClick={handleSubmit}>
              回収済みにする
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
  .e-uncollected {
    color: #888;
  }
  .e-collected {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    color: #558b2f;
    font-weight: bold;
  }
`;
