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
  MonthlyStaffSchedule,
  type MonthlyStaffSchedulePlain,
} from "@bublys-org/hotel-shift-puzzle-model";
import { defineObjects, makeObjectsProvider } from "./framework.js";

export const HOTEL_OBJECTS = defineObjects({
  Staff: {
    class: Staff,
    getId: (s: Staff) => s.id,
    icon: React.createElement(PersonIcon, { fontSize: "small" }),
    url: (id) => `hotel-shift-puzzle/staffs/${id}`,
    // serialize 無し → ドラッグ/表示のみ（世界線記録の対象外）
  },
  Schedule: {
    class: MonthlyStaffSchedule,
    getId: (s: MonthlyStaffSchedule) => s.state.id,
    icon: React.createElement(CalendarMonthIcon, { fontSize: "small" }),
    url: (id) => `hotel-shift-puzzle/schedules/${id}`,
    // serialize 有り → 世界線記録の対象（toPlain/fromPlain をそのまま使う）
    serialize: {
      toJSON: (s: MonthlyStaffSchedule) => s.toPlain(),
      fromJSON: (j) => MonthlyStaffSchedule.fromPlain(j as MonthlyStaffSchedulePlain),
    },
  },
});

/** 世界線対象オブジェクトをまとめた Provider（バブリ全体で1つ） */
export const HotelObjectsProvider = makeObjectsProvider(HOTEL_OBJECTS);

/** オブジェクト型名 */
export const STAFF_TYPE = "Staff";
export const SCHEDULE_TYPE = "Schedule";
