'use client';

/**
 * useWorkingStaff — その勤務表で働く人たち（勤務スタッフ群）を読み書きする。
 *
 * 勤務表の行は「この世界に居るスタッフ全員」ではなく、**勤務表が指す群**が決める。
 * 群は勤務表と同じ世界線に載るので、足す・外す・並べ替えるとその世界線にノードが増え、
 * 時間移動で一緒に戻る。名簿（固定メンバー）はそのままで、グローバルには何も起きない。
 *
 * 誰が働くかが変わると、連れて動くものが3つある。同じ1ノードに載せる（#110 と同じ理由）:
 *   - 可能勤務帯 … 新しく入った人に席が無いと、その人のセルには何も入れられない
 *   - 勤務表     … 外した人の割当が残ると、表に居ない人をフッターが数え続ける
 *   - 制約       … 外した人が責任者候補に残ると、満たしようのない日ができる
 *
 * 群をまだ持たない勤務表（この集約より前に作られたもの）は、これまで通り
 * 「この世界に居るスタッフ全員」が行になる。編集しようとした瞬間に、その顔ぶれから
 * 群が生まれる（読みの経路では作らない ——「読みは世界線を進めない」）。
 */
import { useCallback, useMemo } from "react";
import { useAppStore } from "@bublys-org/state-management";
import {
  Staff,
  WorkingStaffGroup,
  MonthlyStaffSchedule,
  WorkShiftSet,
  ScheduleAvailability,
  ScheduleConstraints,
} from "@bublys-org/hotel-shift-puzzle-model";
import {
  useObject,
  useObjects,
  useIsAbsent,
} from "../objects/repository.js";
import {
  STAFF_TYPE,
  SCHEDULE_TYPE,
  WORKSHIFT_SET_TYPE,
  SCHEDULE_AVAILABILITY_TYPE,
  SCHEDULE_CONSTRAINTS_TYPE,
  WORKING_STAFF_GROUP_TYPE,
} from "../objects/hotelObjects.js";
import { recordMembershipEdit } from "./recordScheduleEdit.js";
import { buildMembershipChange } from "./membershipChange.js";

/** 新しい臨時スタッフの ID を生成する（採番は feature 層の仕事） */
const newStaffId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `staff-${Date.now()}`;

export type WorkingStaffValue = {
  /** 勤務表の行（並び順は群が決める）。臨時の人も混ざる */
  staffList: Staff[];
  /** この世界に焼き付いた名簿。群に入れていない人もここには居る */
  roster: Staff[];
  /** 勤務スタッフ群。まだ無ければ undefined */
  group: WorkingStaffGroup | undefined;
  /** その人がこの勤務表の中だけで足した臨時の人か */
  isTemporary: (staffId: string) => boolean;
  /**
   * いま編集してよいか。値が「本当に無い」のか「メモリ上の CAS から追い出されただけ」か
   * 分からない間は false。追い出されただけのものを名簿から作り直すと、臨時の人が消える。
   */
  canEdit: boolean;
  /** 名簿の人をこの勤務表に加える */
  addFromRoster: (staffId: string) => void;
  /** この勤務表の中だけの臨時スタッフを作って加える */
  addTemporary: (name: string, department?: string) => void;
  /** この勤務表から外す（名簿は動かない。臨時の人は実体ごと消える） */
  remove: (staffId: string) => void;
  /** 行の並びを変える */
  move: (staffId: string, toIndex: number) => void;
  /** 臨時の人の名前を変える */
  renameTemporary: (staffId: string, name: string) => void;
  /** 臨時の人の部署を変える */
  changeTemporaryDepartment: (staffId: string, department: string) => void;
};

export function useWorkingStaff(
  scheduleId: string | undefined
): WorkingStaffValue {
  const store = useAppStore();
  // 世界に焼き付いた名簿（固定メンバー）。群の名簿メンバーはここから実体を引く。
  const roster = useObjects<Staff>(STAFF_TYPE);
  // 群の住所は勤務表が持つ。勤務帯を勤務帯IDで引くのと同じで、間に集約を1つ挟む。
  const schedule = useObject<MonthlyStaffSchedule>(SCHEDULE_TYPE, scheduleId);
  const workingStaffGroupId = schedule?.workingStaffGroupId;
  const group = useObject<WorkingStaffGroup>(
    WORKING_STAFF_GROUP_TYPE,
    workingStaffGroupId
  );
  const absent = useIsAbsent(WORKING_STAFF_GROUP_TYPE, workingStaffGroupId);
  // 顔ぶれと一緒に動くもの
  const workShiftSet = useObject<WorkShiftSet>(WORKSHIFT_SET_TYPE, scheduleId);
  const availability = useObject<ScheduleAvailability>(
    SCHEDULE_AVAILABILITY_TYPE,
    scheduleId
  );
  const constraints = useObject<ScheduleConstraints>(
    SCHEDULE_CONSTRAINTS_TYPE,
    scheduleId
  );

  // 群がまだ無い勤務表は、これまで通り「この世界に居るスタッフ全員」が行になる。
  const staffList = useMemo(
    () => (group ? group.resolve(roster) : roster),
    [group, roster]
  );

  const canEdit = workingStaffGroupId !== undefined && (group !== undefined || absent);

  /**
   * 群にメソッドを1つ適用し、連れて動くものと一緒に1ノードで記録する。
   *
   * 群がまだ無ければ、**いまの行の顔ぶれ**から作ってから適用する。ここを「空から作る」に
   * すると、群を持たない勤務表を1回触っただけで全員が行から消える。
   */
  const updateGroup = useCallback(
    (
      fn: (group: WorkingStaffGroup) => WorkingStaffGroup,
      meta: {
        summary: (group: WorkingStaffGroup) => string;
        staffId?: string;
        /** その人がこの勤務表で働き始める／働かなくなる（連れて動くものがある） */
        joining?: string;
        leaving?: string;
      }
    ) => {
      if (scheduleId === undefined || workingStaffGroupId === undefined) return;
      if (group === undefined && !absent) return; // 読めないだけかもしれない
      const base =
        group ??
        WorkingStaffGroup.ofRoster(
          workingStaffGroupId,
          roster.map((s) => s.id)
        );
      const next = fn(base);
      if (next === base && group !== undefined) return; // 何も変わらなかった

      // 顔ぶれと一緒に動くもの（可能勤務帯・割当・責任者候補）を同じノードに載せる
      const changed = buildMembershipChange({
        group: next,
        joining: meta.joining,
        leaving: meta.leaving,
        schedule,
        workShiftSet,
        availability,
        constraints,
      });

      recordMembershipEdit(store, {
        scheduleId,
        schedule,
        changed,
        summary: meta.summary(next),
        staffId: meta.staffId,
      });
    },
    [
      store,
      scheduleId,
      workingStaffGroupId,
      group,
      absent,
      roster,
      schedule,
      workShiftSet,
      availability,
      constraints,
    ]
  );

  const nameOf = useCallback(
    (staffId: string) =>
      staffList.find((s) => s.id === staffId)?.name ??
      roster.find((s) => s.id === staffId)?.name ??
      staffId,
    [staffList, roster]
  );

  return {
    staffList,
    roster,
    group,
    isTemporary: useCallback(
      (staffId: string) => group?.isTemporary(staffId) ?? false,
      [group]
    ),
    canEdit,
    addFromRoster: useCallback(
      (staffId: string) =>
        updateGroup((g) => g.addRoster(staffId), {
          summary: () => `${nameOf(staffId)} をこの勤務表に加えた`,
          staffId,
          joining: staffId,
        }),
      [updateGroup, nameOf]
    ),
    addTemporary: useCallback(
      (name: string, department?: string) => {
        const staff = new Staff({
          id: newStaffId(),
          name,
          department: department || undefined,
        });
        updateGroup((g) => g.addTemporary(staff), {
          summary: () => `臨時スタッフ ${staff.name} を加えた`,
          staffId: staff.id,
          joining: staff.id,
        });
      },
      [updateGroup]
    ),
    remove: useCallback(
      (staffId: string) => {
        const name = nameOf(staffId);
        updateGroup((g) => g.remove(staffId), {
          summary: () => `${name} をこの勤務表から外した`,
          staffId,
          leaving: staffId,
        });
      },
      [updateGroup, nameOf]
    ),
    move: useCallback(
      (staffId: string, toIndex: number) =>
        updateGroup((g) => g.move(staffId, toIndex), {
          summary: () => `${nameOf(staffId)} の行を ${toIndex + 1} 番目へ移した`,
          staffId,
        }),
      [updateGroup, nameOf]
    ),
    renameTemporary: useCallback(
      (staffId: string, name: string) =>
        updateGroup((g) => g.renameTemporary(staffId, name), {
          summary: () => `臨時スタッフの名前を ${name} に変えた`,
          staffId,
        }),
      [updateGroup]
    ),
    changeTemporaryDepartment: useCallback(
      (staffId: string, department: string) =>
        updateGroup((g) => g.changeTemporaryDepartment(staffId, department), {
          summary: () => `${nameOf(staffId)} の部署を ${department} に変えた`,
          staffId,
        }),
      [updateGroup, nameOf]
    ),
  };
}
