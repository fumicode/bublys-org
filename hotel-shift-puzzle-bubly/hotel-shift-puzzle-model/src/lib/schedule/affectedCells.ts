/**
 * affectedCells — 1セルの変更で、候補集合を計算し直す必要があるセルの範囲
 *
 * 制約の scope 宣言（ScheduleConstraint.scope）だけを見て範囲を決める。ここが差分再計算の
 * 効き目を決めるので、制約側の scope 宣言が実態より狭いと再計算漏れになる。
 */
import { shiftCellsEqual, type MonthlyStaffSchedule } from "./MonthlyStaffSchedule.js";
import type { ScheduleConstraint } from "./ScheduleConstraint.js";
import type { WorkingDay } from "./WorkingDay.js";

/** 勤務表上の1セルの座標（スタッフ×稼働日） */
export type ScheduleCellRef = {
  staffId: string;
  day: WorkingDay;
};

export function cellRefKey(cell: ScheduleCellRef): string {
  return `${cell.staffId}:${cell.day.key}`;
}

/**
 * 2つの勤務表を比べて、値が変わったセルを返す。
 *
 * 「どのセルが編集されたか」を呼び出し側から引き回さずに済ませるための関数。
 * 割当を持つセルの和集合だけを見るので、盤面全体を舐めるより安い。
 */
export function diffScheduleCells(
  before: MonthlyStaffSchedule,
  after: MonthlyStaffSchedule
): ScheduleCellRef[] {
  const cells = new Map<string, ScheduleCellRef>();
  for (const schedule of [before, after]) {
    for (const assignment of schedule.assignments) {
      const cell = { staffId: assignment.staffId, day: assignment.day };
      cells.set(cellRefKey(cell), cell);
    }
  }
  return Array.from(cells.values()).filter(
    (cell) =>
      !shiftCellsEqual(
        before.statusOf(cell.staffId, cell.day),
        after.statusOf(cell.staffId, cell.day)
      )
  );
}

/**
 * 変更されたセルから、候補の再計算が必要になりうるセル集合を求める。
 *
 * 各制約の scope（'staff' | 'day' | 'cell' | 'global'。省略時は 'global'）を見て、
 * アクティブな制約の中に:
 *   - 'global' が1つでもあれば盤面全体
 *   - それ以外は 'staff'（同じスタッフの全日）・'day'（同じ日の全スタッフ）・
 *     'cell'（そのセルのみ、常に含む）の和集合
 * を返す。
 */
export function affectedCells(
  changed: ScheduleCellRef,
  constraints: ScheduleConstraint[],
  schedule: MonthlyStaffSchedule,
  staffIds: string[]
): ScheduleCellRef[] {
  const scopes = new Set(constraints.map((c) => c.scope ?? "global"));

  if (scopes.has("global")) {
    const days = schedule.workingDays();
    const all: ScheduleCellRef[] = [];
    for (const staffId of staffIds) {
      for (const day of days) all.push({ staffId, day });
    }
    return all;
  }

  const result = new Map<string, ScheduleCellRef>();
  const add = (cell: ScheduleCellRef) => result.set(cellRefKey(cell), cell);

  add(changed); // 'cell' scope 相当（常に含む）

  if (scopes.has("staff")) {
    for (const day of schedule.workingDays()) {
      add({ staffId: changed.staffId, day });
    }
  }
  if (scopes.has("day")) {
    for (const staffId of staffIds) {
      add({ staffId, day: changed.day });
    }
  }

  return Array.from(result.values());
}
