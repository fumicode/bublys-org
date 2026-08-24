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
  WorkShiftSet,
  MonthlyStaffSchedule,
  ScheduleAvailability,
  DailyReservationInfo,
  StaffMonthlyShiftWish,
  ScheduleConstraints,
  ScheduleReport,
  type MonthlyStaffSchedulePlain,
} from "@bublys-org/hotel-shift-puzzle-model";
import { objectShape, primitiveShape } from "@bublys-org/domain-registry";
import { defineObjects, makeObjectsProvider } from "./framework.js";
import { localScopeId } from "./commit.js";

/** オブジェクト型名 */
export const STAFF_TYPE = "Staff";
export const WORKSHIFT_SET_TYPE = "WorkShiftSet";
/** グローバルの勤務帯セット（テンプレート）の固定ID。勤務表作成時にこれをコピーする。 */
export const GLOBAL_WORKSHIFT_SET_ID = "global";
export const SCHEDULE_TYPE = "Schedule";
export const SCHEDULE_AVAILABILITY_TYPE = "ScheduleAvailability";
/** 稼働日ごとの予約状況（宿泊人数・部屋数）。勤務表ごとに1つ（id=scheduleId）。 */
export const SCHEDULE_RESERVATION_INFO_TYPE = "ScheduleReservationInfo";
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
    // ドメインスキーマ（object-transformer など横断で使う）
    shape: objectShape([
      { name: "id", shape: primitiveShape("string"), required: true, label: "ID" },
      { name: "name", shape: primitiveShape("string"), required: true, label: "名前" },
      { name: "department", shape: primitiveShape("string"), required: false, label: "所属部署" },
    ]),
  },
  WorkShiftSet: {
    class: WorkShiftSet,
    getId: (s: WorkShiftSet) => s.id,
    // 2通りの使われ方をする集約:
    //   - グローバルのテンプレート（id="global"）… ローカル世界線を持たない
    //   - 勤務表ごとの独自セット（id=scheduleId）… 親 Schedule の世界線に束ねる（case B）
    // state が完全 plain（id ＋ 勤務帯 state 配列）なので serialize 不要。
    localScope: (s: WorkShiftSet) =>
      s.id === GLOBAL_WORKSHIFT_SET_ID ? undefined : localScopeId(SCHEDULE_TYPE, s.id),
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
  ScheduleReservationInfo: {
    class: DailyReservationInfo,
    getId: (r: DailyReservationInfo) => r.id,
    // 稼働日ごとの予約状況（宿泊人数・部屋数）は「実際の予約」という外部の実データ。
    // シフト作成の試行錯誤（勤務表の世界線）とは別物なので、勤務表のローカル世界線には
    // 相乗りさせない（localScope を指定しない）＝アプリ全体スコープのみ。時間移動しても
    // 予約状況は変わらない（ScheduleReport と同じ考え方）。
    // state が完全 plain（scheduleId ＋ byDay マップ）なので serialize 不要。
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
