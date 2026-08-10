'use client';

/**
 * サンプルデータの初回投入。
 *
 * 全オブジェクトは共有のアプリ全体スコープに載るため:
 *   - 複数バブルが個別に seed すると二重投入になりうる → モジュールフラグで一度だけ
 *   - 複数の addObject を同期で呼ぶと各 grow が stale graph から派生して上書きし合う
 *     → addObjects で「1回の grow」にまとめて投入する
 * 永続データがあれば（length>0）その型は投入しない。
 */
import { useEffect } from "react";
import { useCasScope } from "@bublys-org/world-line-graph";
import {
  Staff,
  WorkShiftSet,
  MonthlyStaffSchedule,
  StaffMonthlyShiftWish,
} from "@bublys-org/hotel-shift-puzzle-model";
import { useObjects, APP_SCOPE_ID } from "./repository.js";
import {
  STAFF_TYPE,
  WORKSHIFT_SET_TYPE,
  SCHEDULE_TYPE,
  SCHEDULE_AVAILABILITY_TYPE,
  SCHEDULE_CONSTRAINTS_TYPE,
  STAFF_SHIFT_WISH_TYPE,
} from "./hotelObjects.js";
import { createSampleStaffList } from "../data/sampleStaff.js";
import { createSampleWorkShiftSet } from "../data/sampleWorkShifts.js";
import { createSampleSchedules } from "../data/sampleSchedule.js";
import { createSampleShiftWishes } from "../data/sampleShiftWishes.js";
import { createSampleAvailabilityFor } from "../data/sampleAvailability.js";
import { createSampleConstraintsFor } from "../data/sampleConstraints.js";
import {
  createMidMonthSchedule,
  createEndgameSchedule,
  ENDGAME_SCHEDULE_ID,
} from "../data/sampleScenarios.js";
import { ALLOWED_SHIFT_IDS_BY_STAFF } from "../data/sampleAvailability.js";

let seeded = false;

export function useSeedHotelData(): void {
  const scope = useCasScope(APP_SCOPE_ID);
  const staff = useObjects<Staff>(STAFF_TYPE);
  const workShiftSets = useObjects<WorkShiftSet>(WORKSHIFT_SET_TYPE);
  const schedules = useObjects<MonthlyStaffSchedule>(SCHEDULE_TYPE);
  const wishes = useObjects<StaffMonthlyShiftWish>(STAFF_SHIFT_WISH_TYPE);

  useEffect(() => {
    if (seeded) return;
    seeded = true;

    const items: { type: string; object: unknown }[] = [];

    // スタッフは「まだ居ない人だけ」足す。既に触ったデータがある環境でも、
    // サンプルを増やしたぶんが入るようにする（全部揃うまで何も入らない、を避ける）。
    const knownStaffIds = new Set(staff.map((s) => s.id));
    items.push(
      ...createSampleStaffList()
        .filter((s) => !knownStaffIds.has(s.id))
        .map((o) => ({ type: STAFF_TYPE, object: o }))
    );

    if (workShiftSets.length === 0) {
      // グローバルの勤務帯セット（テンプレート）。勤務表作成時にこれをコピーする。
      items.push({ type: WORKSHIFT_SET_TYPE, object: createSampleWorkShiftSet() });
    }

    // 勤務表も ID 単位で「まだ無いものだけ」足す。
    //   - 空の勤務表（6月・7月）: 自動シフトを一から動かす用
    //   - 作成途中（8月）      : 候補集合・確定提案を見る用（実際に人が触る状態）
    //   - 終盤・詰みあり（9月）: 埋められないセルがある状態
    const scenarioParams = {
      staffIds: createSampleStaffList().map((s) => s.id),
      allowedShiftIds: ALLOWED_SHIFT_IDS_BY_STAFF,
      wishes: createSampleShiftWishes(),
      maxConsecutive: 5,
    };
    const sampleSchedules = [
      ...createSampleSchedules(),
      createMidMonthSchedule(scenarioParams),
      createEndgameSchedule(scenarioParams),
    ];
    const knownScheduleIds = new Set(schedules.map((s) => s.id));
    for (const schedule of sampleSchedules) {
      if (knownScheduleIds.has(schedule.id)) continue;
      items.push({ type: SCHEDULE_TYPE, object: schedule });
      // 勤務表ごとの独自勤務帯セット（グローバルのコピー。id=scheduleId）
      items.push({
        type: WORKSHIFT_SET_TYPE,
        object: createSampleWorkShiftSet().withId(schedule.id),
      });
      // 可能勤務帯は人によってばらける（早番・中番のみ／早番不可 など）。勤務表に紐づく別集約
      items.push({
        type: SCHEDULE_AVAILABILITY_TYPE,
        object: createSampleAvailabilityFor(schedule.id),
      });
      // 制約（責任者ルール）も勤務表に紐づく別集約として投入。
      // 終盤シナリオは「1日の休み上限」を絞って、詰みが起きる状況を作る。
      items.push({
        type: SCHEDULE_CONSTRAINTS_TYPE,
        object: createSampleConstraintsFor(
          schedule.id,
          schedule.id === ENDGAME_SCHEDULE_ID ? { maxDayOffPerDay: 5 } : {}
        ),
      });
    }

    // 希望も「まだ無い月・人だけ」足す
    const knownWishKeys = new Set(
      wishes.map((w) => `${w.staffId}:${w.year}-${w.month}`)
    );
    items.push(
      ...createSampleShiftWishes()
        .filter((w) => !knownWishKeys.has(`${w.staffId}:${w.year}-${w.month}`))
        .map((o) => ({ type: STAFF_SHIFT_WISH_TYPE, object: o }))
    );
    // 既に永続化された勤務表（旧データや別経路で作成）に独自勤務帯セットが無ければ補う。
    // 旧モデルの勤務帯ID（early/middle/late）と既定セットの id が一致するので割当は有効なまま。
    const setIds = new Set(workShiftSets.map((s) => s.id));
    for (const schedule of schedules) {
      if (!setIds.has(schedule.id)) {
        items.push({
          type: WORKSHIFT_SET_TYPE,
          object: createSampleWorkShiftSet().withId(schedule.id),
        });
      }
    }
    if (items.length > 0) scope.addObjects(items); // 1回の grow でまとめて投入
    // 初回マウント時に一度だけ
  }, []);
}
