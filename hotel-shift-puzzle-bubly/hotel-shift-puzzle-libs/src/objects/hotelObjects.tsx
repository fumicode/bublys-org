'use client';

/**
 * このバブリのオブジェクト型を「1箇所」で定義する。
 *
 * 1つの型に1エントリ書くだけで:
 *   - ドラッグ&ドロップ（registerObjects 経由）
 *   - バブルのダブルクリック展開（open）
 *   - 世界線記録（serialize を付けると対象になる）
 * がすべて効く。型を増やしても Provider を作る必要はない。
 */
import React from "react";
import PersonIcon from "@mui/icons-material/Person";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import {
  Staff,
  WorkShift,
  MonthlyStaffSchedule,
  ScheduleAvailability,
  StaffMonthlyShiftWish,
  type MonthlyStaffSchedulePlain,
} from "@bublys-org/hotel-shift-puzzle-model";
import { defineObjects, makeObjectsProvider } from "./framework.js";
import { localScopeId } from "./commit.js";

/** オブジェクト型名 */
export const STAFF_TYPE = "Staff";
export const WORKSHIFT_TYPE = "WorkShift";
export const SCHEDULE_TYPE = "Schedule";
export const SCHEDULE_AVAILABILITY_TYPE = "ScheduleAvailability";
export const STAFF_SHIFT_WISH_TYPE = "StaffMonthlyShiftWish";

export const HOTEL_OBJECTS = defineObjects({
  Staff: {
    class: Staff,
    getId: (s: Staff) => s.id,
    icon: React.createElement(PersonIcon, { fontSize: "small" }),
    url: (id) => `hotel-shift-puzzle/staffs/${id}`,
    // serialize 無し → state-object 規約で plain 化（ドラッグ/表示・世界線記録の対象外）
  },
  WorkShift: {
    class: WorkShift,
    getId: (w: WorkShift) => w.id,
    // 表示専用ではなくリポジトリ保存用に登録（state-object 規約で plain 化）
  },
  Schedule: {
    class: MonthlyStaffSchedule,
    getId: (s: MonthlyStaffSchedule) => s.state.id,
    icon: React.createElement(CalendarMonthIcon, { fontSize: "small" }),
    url: (id) => `hotel-shift-puzzle/schedules/${id}`,
    // 入れ子にインスタンスを持つので codec を明示
    serialize: {
      toJSON: (s: MonthlyStaffSchedule) => s.toPlain(),
      fromJSON: (j) => MonthlyStaffSchedule.fromPlain(j as MonthlyStaffSchedulePlain),
    },
    // 勤務表ごとのローカル世界線（自分のスコープ）
    localScope: (s: MonthlyStaffSchedule) => localScopeId(SCHEDULE_TYPE, s.state.id),
  },
  ScheduleAvailability: {
    class: ScheduleAvailability,
    getId: (a: ScheduleAvailability) => a.id,
    // 親 Schedule のローカル世界線に束ねる（case B）
    localScope: (a: ScheduleAvailability) => localScopeId(SCHEDULE_TYPE, a.scheduleId),
  },
  StaffMonthlyShiftWish: {
    class: StaffMonthlyShiftWish,
    getId: (w: StaffMonthlyShiftWish) => w.id,
    // スタッフ×月で1つ。店舗・勤務表には依存しないのでアプリ全体スコープのみ。
    // state が完全 plain なので state-object 規約で plain 化（serialize 不要）。
  },
});

/** 世界線対象オブジェクトをまとめた Provider（バブリ全体で1つ） */
export const HotelObjectsProvider = makeObjectsProvider(HOTEL_OBJECTS);
