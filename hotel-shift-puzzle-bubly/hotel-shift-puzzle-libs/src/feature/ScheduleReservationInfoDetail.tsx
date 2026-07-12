'use client';

import { FC } from "react";
import styled from "styled-components";
import {
  MonthlyStaffSchedule,
  DailyReservationInfo,
  type WorkingDay,
} from "@bublys-org/hotel-shift-puzzle-model";
import { ScheduleReservationInfoView } from "../ui/ScheduleReservationInfoView.js";
import { useObject, useObjectRepo } from "../objects/repository.js";
import { useSeedHotelData } from "../objects/seed.js";
import { SCHEDULE_TYPE, SCHEDULE_RESERVATION_INFO_TYPE } from "../objects/hotelObjects.js";

type ScheduleReservationInfoDetailProps = {
  scheduleId?: string;
};

/**
 * 稼働日ごとの予約状況（宿泊人数・部屋数）を入力するバブル。
 * 勤務表グリッドの予約行（日付ヘッダの上）をダブルクリックして開く。
 *
 * 予約状況は勤務表に紐づく姉妹集約 DailyReservationInfo（id=scheduleId）。まだ無ければ
 * 最初の入力時に空から作って保存する（ScheduleConstraints と同じ遅延生成パターン）。
 * 保存は勤務表のローカル世界線に載る＝時間移動で一緒に戻る。
 */
export const ScheduleReservationInfoDetail: FC<ScheduleReservationInfoDetailProps> = ({
  scheduleId,
}) => {
  useSeedHotelData();
  // 稼働日は勤務表（年月）から導出するので勤務表本体も読む
  const schedule = useObject<MonthlyStaffSchedule>(SCHEDULE_TYPE, scheduleId);
  const reservationInfo = useObject<DailyReservationInfo>(
    SCHEDULE_RESERVATION_INFO_TYPE,
    scheduleId
  );
  const repo = useObjectRepo<DailyReservationInfo>(SCHEDULE_RESERVATION_INFO_TYPE);

  if (!schedule) {
    return <div style={{ padding: 16, color: "#666" }}>勤務表を読み込み中…</div>;
  }

  const sid = schedule.id;
  const days = schedule.workingDays();

  // 現在値（未作成なら空）を起点に、集約のメソッドで新インスタンスを作って保存する。
  const current = reservationInfo ?? DailyReservationInfo.empty(sid);
  const handleChangeGuests = (day: WorkingDay, value: number | undefined) => {
    repo.save(current.setGuests(day, value));
  };
  const handleChangeRooms = (day: WorkingDay, value: number | undefined) => {
    repo.save(current.setRooms(day, value));
  };

  return (
    <StyledContainer>
      <div className="e-header">
        <h3>
          予約状況{" "}
          <span className="e-sub">
            {schedule.year}年{schedule.month}月 / {schedule.storeId}
          </span>
        </h3>
        <p className="e-note">稼働日ごとの宿泊人数・部屋数を入力します。</p>
      </div>
      <ScheduleReservationInfoView
        days={days}
        reservationInfo={reservationInfo}
        onChangeGuests={handleChangeGuests}
        onChangeRooms={handleChangeRooms}
      />
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
      font-size: 0.8em;
      color: #999;
    }
  }
`;
