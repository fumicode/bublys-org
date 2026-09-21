'use client';

import { type FC, type ReactNode } from "react";
import { ScheduleWorld } from "./ScheduleWorld.js";
import { GLOBAL_CONSTRAINT_SET_ID } from "../objects/hotelObjects.js";

/**
 * 制約セットの世界に入る。
 *
 * 制約セットは2通りある（グローバルのテンプレート id="global" と、勤務表ごとの独自セット
 * id=scheduleId）。前者はどの勤務表のものでもないので、勤務表の世界には入らない。
 *
 * **この判定をここ1箇所に閉じ込めるのが要点。** 各バブルで書き分けると、いつか
 * `<ScheduleWorld scheduleId="global">` と書いた人が出て、`Schedule:global` という
 * 存在しない勤務表の世界が（スタッフの焼き付き込みで）生まれる。
 */
export const ConstraintSetWorld: FC<{
  constraintSetId: string | undefined;
  children: ReactNode;
}> = ({ constraintSetId, children }) => (
  <ScheduleWorld
    scheduleId={
      constraintSetId === GLOBAL_CONSTRAINT_SET_ID ? undefined : constraintSetId
    }
  >
    {children}
  </ScheduleWorld>
);
