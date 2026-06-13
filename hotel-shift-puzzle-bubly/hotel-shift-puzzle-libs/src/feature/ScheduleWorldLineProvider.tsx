'use client';

/**
 * 勤務表（MonthlyStaffSchedule）を中心としたオブジェクト群の世界線スコープ設定。
 *
 * - スコープ単位: 1 勤務表 = 1 scope（`hotel-schedule:${scheduleId}`）
 * - スコープ内のオブジェクトは CAS（content-addressed store）に plain で保存され、
 *   編集（assign/clear など）が世界線ノードとして記録される
 * - 勤務表バブル・世界線ビューバブルはこの Provider 配下で useCasScope を使う
 */
import React from "react";
import { DomainRegistryProvider, defineDomainObjects } from "@bublys-org/domain-registry";
import {
  MonthlyStaffSchedule,
  type MonthlyStaffSchedulePlain,
} from "@bublys-org/hotel-shift-puzzle-model";

/** CAS 上の勤務表オブジェクト型 */
export const SCHEDULE_OBJECT_TYPE = "monthly-schedule";

/** 勤務表ごとの世界線スコープID */
export const scheduleScopeId = (scheduleId: string): string =>
  `hotel-schedule:${scheduleId}`;

/** 世界線スコープに載せるドメインオブジェクトのシリアライズ設定 */
const SCHEDULE_DOMAIN_OBJECTS = defineDomainObjects({
  [SCHEDULE_OBJECT_TYPE]: {
    class: MonthlyStaffSchedule,
    fromJSON: (json) =>
      MonthlyStaffSchedule.fromPlain(json as MonthlyStaffSchedulePlain),
    toJSON: (s: MonthlyStaffSchedule) => s.toPlain(),
    getId: (s: MonthlyStaffSchedule) => s.state.id,
  },
});

export function ScheduleWorldLineProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DomainRegistryProvider registry={SCHEDULE_DOMAIN_OBJECTS}>
      {children}
    </DomainRegistryProvider>
  );
}
