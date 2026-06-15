/**
 * シフト案ドメインモデル
 * 全配置を取りまとめて、シフト全体の評価を行う
 */

import { Shift, type ShiftState, type WeatherCondition } from '../master/Shift.js';
import { type TimeScheduleState, TimeSchedule } from '../master/TimeSchedule.js';

// ========== 型定義 ==========

/** シフト案の状態 */
export interface ShiftPlanState {
  readonly id: string;
  readonly name: string;
  readonly date: string;
  readonly weatherCondition?: WeatherCondition;
  readonly timeSchedules?: readonly TimeScheduleState[];
  readonly shifts?: readonly ShiftState[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

// ========== ドメインクラス ==========

export class ShiftPlan {
  constructor(readonly state: ShiftPlanState) {}

  get id(): string { return this.state.id; }
  get name(): string { return this.state.name; }
  get date(): string { return this.state.date; }
  get weatherCondition(): WeatherCondition | undefined { return this.state.weatherCondition; }

  get timeSchedules(): readonly TimeSchedule[] {
    return (this.state.timeSchedules ?? []).map((ts) => new TimeSchedule(ts));
  }

  get shifts(): readonly Shift[] {
    return (this.state.shifts ?? []).map((s) => new Shift(s));
  }

  /** IDでシフトを取得 */
  getShiftById(shiftId: string): Shift | undefined {
    return this.shifts.find((s) => s.id === shiftId);
  }

  /** IDでTimeScheduleを取得 */
  getTimeScheduleById(tsId: string): TimeSchedule | undefined {
    return this.timeSchedules.find((ts) => ts.id === tsId);
  }

  // ========== プリミティブUI: BlockList操作 ==========

  /** 指定シフトの指定ブロックに局員を追加 */
  addUserToBlock(shiftId: string, blockIndex: number, userId: string): ShiftPlan {
    return this._updateShift(shiftId, (shift) => shift.addUser(blockIndex, userId));
  }

  /** 指定シフトの指定ブロックから局員を削除 */
  removeUserFromBlock(shiftId: string, blockIndex: number, userId: string): ShiftPlan {
    return this._updateShift(shiftId, (shift) => shift.removeUser(blockIndex, userId));
  }

  /** 指定シフトの範囲ブロックに局員を追加（startBlock 以上 endBlock 未満） */
  addUserToBlockRange(shiftId: string, startBlock: number, endBlock: number, userId: string): ShiftPlan {
    return this._updateShift(shiftId, (shift) => shift.addUserToRange(startBlock, endBlock, userId));
  }

  /** 指定シフトの範囲ブロックから局員を削除（startBlock 以上 endBlock 未満） */
  removeUserFromBlockRange(shiftId: string, startBlock: number, endBlock: number, userId: string): ShiftPlan {
    return this._updateShift(shiftId, (shift) => {
      let bl = shift.blockList;
      for (let b = startBlock; b < endBlock; b++) {
        bl = bl.removeUser(b, userId);
      }
      return new Shift({ ...shift.state, blockList: bl.state });
    });
  }

  private _updateShift(shiftId: string, fn: (shift: Shift) => Shift): ShiftPlan {
    const currentShifts = this.state.shifts ?? [];
    const updatedShifts = currentShifts.map((s) =>
      s.id === shiftId ? fn(new Shift(s)).state : s
    );
    return new ShiftPlan({
      ...this.state,
      shifts: updatedShifts,
      updatedAt: new Date().toISOString(),
    });
  }

  withName(name: string): ShiftPlan {
    return this.withUpdatedState({ name });
  }

  withWeatherCondition(weatherCondition: WeatherCondition): ShiftPlan {
    return this.withUpdatedState({ weatherCondition });
  }

  protected withUpdatedState(partial: Partial<ShiftPlanState>): ShiftPlan {
    return new ShiftPlan({
      ...this.state,
      ...partial,
      updatedAt: new Date().toISOString(),
    });
  }

  // ========== 静的メソッド ==========

  static create(name: string, date = '', weatherCondition?: WeatherCondition): ShiftPlan {
    const now = new Date().toISOString();
    return new ShiftPlan({
      id: crypto.randomUUID(),
      name,
      date,
      weatherCondition,
      timeSchedules: [],
      shifts: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  /** TimeSchedule付きで空のシフト計画を作成する */
  static createWithSchedule(
    name: string,
    date: string,
    startTime = '00:00',
    endTime = '23:59',
  ): ShiftPlan {
    const now = new Date().toISOString();
    return new ShiftPlan({
      id: crypto.randomUUID(),
      name,
      date,
      timeSchedules: [{
        id: crypto.randomUUID(),
        dayType: name,
        startTime,
        endTime,
      }],
      shifts: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  /** 世界線の状態から新しいシフト計画を作成する（配置済みシフトを引き継ぐ） */
  static createFromWorldLine(
    name: string,
    date: string,
    shifts: readonly ShiftState[],
    timeSchedules: readonly TimeScheduleState[],
    weatherCondition?: WeatherCondition,
  ): ShiftPlan {
    const now = new Date().toISOString();
    return new ShiftPlan({
      id: crypto.randomUUID(),
      name,
      date,
      weatherCondition,
      shifts: shifts.map((s) => ({ ...s })),
      timeSchedules: timeSchedules.map((ts) => ({ ...ts })),
      createdAt: now,
      updatedAt: now,
    });
  }
}
