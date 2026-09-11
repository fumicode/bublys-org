/**
 * 例データ（デバッグ用のデータパターン）の組み立て。
 *
 * 以前はバブルのマウント時に自動投入していたが、今は投入しない。
 * ファイルバブルの「例データ読み込み」から明示的に呼ばれるだけ。
 *
 * 自動投入をやめたことで「まだ無いものだけ足す」という差分ロジックも要らなくなった。
 * あれは毎回のマウントで走っても壊れないようにするためのもので、ボタン 1 回の操作なら
 * 「この一式をそのまま入れる」で足りる（呼び出し側が先に世界を空にする）。
 *
 * ここは組み立てるだけで、どこにどう書き込むかは知らない（React も store も触らない）。
 */
import {
  createSampleStaffList,
  createSampleWorkShiftSet,
  createSampleSchedules,
  createSampleShiftWishes,
  createSampleAvailabilityFor,
  createSampleConstraintsFor,
  createEndgameSchedule,
  createMidMonthSchedule,
  ENDGAME_MAX_DAY_OFF_PER_DAY,
  ENDGAME_SCHEDULE_ID,
  ALLOWED_SHIFT_IDS_BY_STAFF,
} from "../data/index.js";
import { WorkingStaffGroup } from "@bublys-org/hotel-shift-puzzle-model";
import type { BundleItem } from "./commit.js";
import {
  STAFF_TYPE,
  WORKING_STAFF_GROUP_TYPE,
  WORKSHIFT_SET_TYPE,
  SCHEDULE_TYPE,
  SCHEDULE_AVAILABILITY_TYPE,
  SCHEDULE_CONSTRAINTS_TYPE,
  STAFF_SHIFT_WISH_TYPE,
} from "./hotelObjects.js";

/**
 * 例データ一式を「世界線へ書き込める形」で組み立てる。
 *
 * 中身:
 *   - スタッフ 9 人、グローバルの勤務帯セット（テンプレート）、全員の希望（6〜9月）
 *   - 勤務表 4 つ
 *       空の勤務表（6月・7月） … 自動シフトを一から動かす用
 *       作成途中（8月）       … 候補集合・確定提案を見る用（実際に人が触る状態）
 *       終盤・詰みあり（9月）  … 埋められないセルがある状態
 *   - 勤務表ごとの勤務帯セット・勤務スタッフ群・可能勤務帯・制約
 */
export function buildSampleItems(): BundleItem[] {
  const items: BundleItem[] = [];

  for (const staff of createSampleStaffList()) {
    items.push({ type: STAFF_TYPE, obj: staff });
  }

  // グローバルの勤務帯セット（テンプレート）。勤務表作成時にこれをコピーする。
  items.push({ type: WORKSHIFT_SET_TYPE, obj: createSampleWorkShiftSet() });

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

  for (const schedule of sampleSchedules) {
    items.push({ type: SCHEDULE_TYPE, obj: schedule });
    // 勤務表ごとの独自勤務帯セット（グローバルのコピー。id=scheduleId）
    items.push({
      type: WORKSHIFT_SET_TYPE,
      obj: createSampleWorkShiftSet().withId(schedule.id),
    });
    // その勤務表で働く人たち。例データではどの勤務表も名簿の全員（臨時は入れていない）
    items.push({
      type: WORKING_STAFF_GROUP_TYPE,
      obj: WorkingStaffGroup.ofRoster(schedule.workingStaffGroupId, scenarioParams.staffIds),
    });
    // 可能勤務帯は人によってばらける（早番・中番のみ／早番不可 など）。勤務表に紐づく別集約
    items.push({
      type: SCHEDULE_AVAILABILITY_TYPE,
      obj: createSampleAvailabilityFor(schedule.id),
    });
    // 制約（責任者ルール）も勤務表に紐づく別集約として投入。
    // 終盤シナリオだけは「その日に休める枠がもう残っていない」状況を作るため、
    // 1日の休み上限を需要から決まる人数ちょうどまで絞る。
    items.push({
      type: SCHEDULE_CONSTRAINTS_TYPE,
      obj: createSampleConstraintsFor(
        schedule.id,
        schedule.id === ENDGAME_SCHEDULE_ID
          ? { maxDayOffPerDay: ENDGAME_MAX_DAY_OFF_PER_DAY }
          : {}
      ),
    });
  }

  for (const wish of createSampleShiftWishes()) {
    items.push({ type: STAFF_SHIFT_WISH_TYPE, obj: wish });
  }

  return items;
}
