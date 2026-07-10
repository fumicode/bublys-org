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
import AssessmentIcon from "@mui/icons-material/Assessment";
import {
  Staff,
  WorkShift,
  MonthlyStaffSchedule,
  ScheduleAvailability,
  StaffMonthlyShiftWish,
  ScheduleConstraints,
  ScheduleReport,
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
export const SCHEDULE_CONSTRAINTS_TYPE = "ScheduleConstraints";
export const SCHEDULE_REPORT_TYPE = "ScheduleReport";

// 注: バブル URL（開く URL のスキーム）は app 層の関心事なので、ここ（libs）では持たない。
// オブジェクトの正規 URL は app の registration/bubbleUrls.ts が registerObjectUrl で登録する。
export const HOTEL_OBJECTS = defineObjects({
  Staff: {
    class: Staff,
    getId: (s: Staff) => s.id,
    icon: React.createElement(PersonIcon, { fontSize: "small" }),
    // url は app 層（registration/bubbleUrls.ts）で登録する
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
    // url は app 層（registration/bubbleUrls.ts）で登録する
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
  ScheduleConstraints: {
    class: ScheduleConstraints,
    getId: (c: ScheduleConstraints) => c.id,
    // 勤務表ごとの制約。親 Schedule のローカル世界線に束ねる（case B）。
    // 担当者をドロップで足すと、勤務表の世界線にノードが増え、時間移動で一緒に戻る。
    // state が plain（scheduleId ＋ ルール states 配列）なので serialize 不要。
    localScope: (c: ScheduleConstraints) => localScopeId(SCHEDULE_TYPE, c.scheduleId),
  },
  ScheduleReport: {
    class: ScheduleReport,
    getId: (r: ScheduleReport) => r.state.id,
    icon: React.createElement(AssessmentIcon, { fontSize: "small" }),
    // 確定時点のスナップショット。勤務表のローカル世界線には相乗りさせない
    // （相乗りさせると時間移動のたびに現れたり消えたりして確定記録の意味が壊れるため）。
    // state が完全 plain → serialize 不要。localScope も指定しない＝アプリ全体ログのみ。
  },
});

/** 世界線対象オブジェクトをまとめた Provider（バブリ全体で1つ） */
export const HotelObjectsProvider = makeObjectsProvider(HOTEL_OBJECTS);
