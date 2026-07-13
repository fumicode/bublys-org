'use client';

import { FC } from "react";
import styled from "styled-components";
import { useKeyBindings } from "@bublys-org/bubbles-ui";
import { useCasScope } from "@bublys-org/world-line-graph";
import {
  MonthlyStaffSchedule,
  DailyReservationInfo,
} from "@bublys-org/hotel-shift-puzzle-model";
import { ScheduleReservationInfoView } from "../ui/ScheduleReservationInfoView.js";
import { useObject, useObjectRepo, APP_SCOPE_ID } from "../objects/repository.js";
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
 * 予約は外部の実データなので勤務表の世界線には載せない（アプリ全体スコープのみ）。
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

  // 予約の編集はアプリ全体の世界線（APP_SCOPE）に積まれる。Cmd/Ctrl+Z で元に戻し、
  // Cmd/Ctrl+Shift+Z（や Ctrl+Y）でやり直す。useKeyBindings はこのバブルにフォーカスが
  // 当たっているときだけ効き、テキスト入力中はブラウザ標準のundoに任せる（横取りしない）。
  const worldLine = useCasScope(APP_SCOPE_ID);
  useKeyBindings([
    { key: "z", meta: true, run: worldLine.moveBack },
    { key: "z", meta: true, shift: true, run: worldLine.moveForward },
    { key: "y", meta: true, run: worldLine.moveForward },
  ]);

  if (!schedule) {
    return <div style={{ padding: 16, color: "#666" }}>勤務表を読み込み中…</div>;
  }

  const sid = schedule.id;
  const days = schedule.workingDays();

  // 現在値（未作成なら空）を起点に渡し、View 側が集約メソッドで作った新インスタンスを保存する。
  const info = reservationInfo ?? DailyReservationInfo.empty(sid);
  const handleSave = (next: DailyReservationInfo) => repo.save(next);

  return (
    <StyledContainer>
      <div className="e-header">
        <h3>
          予約状況{" "}
          <span className="e-sub">
            {schedule.year}年{schedule.month}月 / {schedule.storeId}
          </span>
        </h3>
        <p className="e-note">
          稼働日ごとの中・夕・泊（人数・部屋数）・備考・婚礼を入力します。
          <br />
          ⌘/Ctrl+Z で元に戻す、⌘/Ctrl+Shift+Z でやり直し。
        </p>
      </div>
      <ScheduleReservationInfoView days={days} info={info} onSave={handleSave} />
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
