import { useCallback } from "react";
import {
  ConstraintSet,
  MonthlyStaffSchedule,
  type DayOffStyle,
  type Staff,
} from "../domain/index.js";
import type { ProfileCategoryFieldsProps } from "../ui/ProfileCategoryFields.js";
import { useObject, useObjectRepo, useObjectShell } from "../objects/repository.js";
import { CONSTRAINT_SET_TYPE, SCHEDULE_TYPE, STAFF_TYPE } from "../objects/hotelObjects.js";
import { useStaffProfileDictionary } from "./staffProfile.js";
import { useWorkingStaff } from "./workingStaff.js";

/** プロファイルの欄（ProfileCategoryFields）に渡すもの。分類とスタッフは置き場所が渡す */
export type ProfileFields = Omit<ProfileCategoryFieldsProps, "category" | "staff">;

/**
 * 店舗の既定値を直す欄の中身（スタッフプロファイルの表の ✎。#236）。
 * 辞書の項目・所属・休みの形を Staff に書く。責任者は勤務表ごとなので含めない。
 * Staff は勤務表が生まれるときに焼き付くので、ここで直した値はこれから作る勤務表に効く。
 */
export function useStoreProfileEditing(): (staff: Staff) => ProfileFields {
  const dictionary = useStaffProfileDictionary();
  const repo = useObjectRepo<Staff>(STAFF_TYPE);
  return useCallback(
    (staff: Staff): ProfileFields => {
      const save = (next: Staff) => {
        if (next !== staff) repo.save(next);
      };
      return {
        dictionary,
        onChangeProfileValues: (itemId, ids) => save(staff.setProfileValues(itemId, ids ?? [])),
        department: {
          value: staff.department,
          onChange: (department) => save(staff.changeDepartment(department)),
        },
        dayOffStyle: {
          value: staff.dayOffStyle,
          onChange: (style: DayOffStyle | undefined) => style && save(staff.changeDayOffStyle(style)),
        },
      };
    },
    [dictionary, repo]
  );
}

/**
 * その勤務表での値を直す欄の中身（勤務スタッフの表の ✎・勤務表から開いたスタッフ詳細。#236）。
 * 辞書の項目・休みの形はメンバーの上書き（既定はスタッフの値）、責任者はその勤務表の
 * 制約セットの担当者（制約バブルと同じ値）。所属はその勤務表で上書きする仕組みが無いので読むだけ。
 *
 * 勤務表の世界の中（ScheduleWorld）で使うこと。その勤務表で働いていない人は直す先が無いので読むだけ。
 */
export function useScheduleProfileEditing(
  scheduleId: string | undefined
): (staff: Staff) => ProfileFields {
  const dictionary = useStaffProfileDictionary();
  const working = useWorkingStaff(scheduleId);
  const schedule = useObject<MonthlyStaffSchedule>(SCHEDULE_TYPE, scheduleId);
  const { object: constraintSet, update: updateConstraints } = useObjectShell<ConstraintSet>(
    CONSTRAINT_SET_TYPE,
    schedule?.constraintSetId
  );
  const { group, canEdit, profileValuesOf, overrideProfileValues, dayOffStyleOf, overrideDayOffStyle } =
    working;

  return useCallback(
    (staff: Staff): ProfileFields => {
      // 群がまだ無い勤務表は、編集した瞬間に顔ぶれから群ができる（その人も入る）
      const isMember = group === undefined || group.memberOf(staff.id) !== undefined;
      const editable = isMember && canEdit;
      const { base, override } = dayOffStyleOf(staff.id);
      return {
        dictionary,
        profileValuesOf: (itemId) => {
          const v = profileValuesOf(staff.id, itemId);
          return { value: v.override, inherited: v.base };
        },
        onChangeProfileValues: editable
          ? (itemId, ids) => overrideProfileValues(staff.id, itemId, ids)
          : undefined,
        dayOffStyle: {
          value: override,
          inherited: base,
          onChange: editable ? (style) => overrideDayOffStyle(staff.id, style) : undefined,
        },
        leaderRules: constraintSet?.leaderRules ?? [],
        onToggleLeader: constraintSet
          ? (ruleKey) =>
              updateConstraints((c) =>
                c.leaderRule(ruleKey)?.leaderStaffIds.includes(staff.id)
                  ? c.removeLeader(ruleKey, staff.id)
                  : c.addLeader(ruleKey, staff.id)
              )
          : undefined,
      };
    },
    [
      dictionary,
      group,
      canEdit,
      profileValuesOf,
      overrideProfileValues,
      dayOffStyleOf,
      overrideDayOffStyle,
      constraintSet,
      updateConstraints,
    ]
  );
}
