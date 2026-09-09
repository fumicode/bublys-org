'use client';

import { type FC, type ReactNode } from "react";
import { World } from "../objects/world.js";
import { localScopeId } from "../objects/commit.js";
import { SCHEDULE_TYPE } from "../objects/hotelObjects.js";

/**
 * その勤務表の世界に入る。
 *
 * この中では、勤務表・勤務帯セット・可能勤務帯・制約・操作履歴（可変メンバー）と
 * **スタッフ（固定メンバー）** が「この勤務表の世界」から読まれる。
 * 予約状況・確定レポート・シフト希望は非メンバーなので、この中でもグローバル台帳から読まれる。
 *
 * バブルルートはすべてトップレベルで個別に Provider に包まれる（親子にならない）ので、
 * 勤務表に属するバブルは自分でこれを張る。scheduleId が無いときは親の世界のまま。
 */
export const ScheduleWorld: FC<{
  scheduleId: string | undefined;
  children: ReactNode;
}> = ({ scheduleId, children }) => (
  <World
    scopeId={scheduleId ? localScopeId(SCHEDULE_TYPE, scheduleId) : undefined}
  >
    {children}
  </World>
);
