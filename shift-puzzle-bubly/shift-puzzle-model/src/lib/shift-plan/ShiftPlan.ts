/**
 * シフト案ドメインモデル
 * 全配置を取りまとめて、シフト全体の評価を行う
 */

import { ShiftAssignment, ShiftAssignmentState } from './ShiftAssignment.js';
import { Shift, type ShiftState, type WeatherCondition } from '../master/Shift.js';
import { type TimeScheduleState, TimeSchedule } from '../master/TimeSchedule.js';
import { ShiftEvaluation } from './ShiftEvaluation.js';

// ========== 型定義 ==========

/** 制約違反の種類 */
export type ConstraintViolationType = 'overlapping_assignments';

/** 制約違反 */
export interface ConstraintViolation {
  readonly type: ConstraintViolationType;
  readonly memberId: string;
  readonly assignmentIds: readonly string[];
  readonly message: string;
}

/** シフト案の状態 */
export interface ShiftPlanState {
  readonly id: string;
  readonly name: string;
  readonly weatherCondition: WeatherCondition;
  // プリミティブUI用フィールド（新規）
  readonly timeSchedules?: readonly TimeScheduleState[];
  readonly shifts?: readonly ShiftState[];        // BlockList組み込み
  // 旧フィールド（既存D&D互換: deprecated）
  /** @deprecated shifts + blockList ベースに移行 */
  readonly assignments?: readonly ShiftAssignmentState[];
  readonly constraintViolations?: readonly ConstraintViolation[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** シフト案の評価結果 */
export interface ShiftPlanEvaluation {
  readonly totalAssignmentCount: number;
  readonly totalFulfillmentRate: number;
  readonly shortageCount: number;
  readonly excessCount: number;
  readonly shiftEvaluations: readonly ShiftEvaluation[];
}

// ========== ドメインクラス ==========

export class ShiftPlan {
  constructor(readonly state: ShiftPlanState) {}

  get id(): string { return this.state.id; }
  get name(): string { return this.state.name; }
  get weatherCondition(): WeatherCondition { return this.state.weatherCondition; }

  get assignments(): readonly ShiftAssignment[] {
    return (this.state.assignments ?? []).map((s) => new ShiftAssignment(s));
  }

  get constraintViolations(): readonly ConstraintViolation[] {
    return this.state.constraintViolations ?? ShiftPlan.computeConstraintViolations(this.state.assignments ?? []);
  }

  get timeSchedules(): readonly TimeSchedule[] {
    return (this.state.timeSchedules ?? []).map((ts) => new TimeSchedule(ts));
  }

  get shifts(): readonly Shift[] {
    return (this.state.shifts ?? []).map((s) => new Shift(s));
  }

  /** 特定局員の配置を取得（旧: assignments ベース） */
  getAssignmentsByMember(memberId: string): ShiftAssignment[] {
    return this.assignments.filter((a) => a.staffId === memberId);
  }

  /** 特定シフトの配置を取得（旧: assignments ベース） */
  getAssignmentsByShift(shiftId: string): ShiftAssignment[] {
    return this.assignments.filter((a) => a.shiftId === shiftId);
  }

  /** IDでシフトを取得（新: shifts ベース） */
  getShiftById(shiftId: string): Shift | undefined {
    return this.shifts.find((s) => s.id === shiftId);
  }

  /** IDでTimeScheduleを取得 */
  getTimeScheduleById(tsId: string): TimeSchedule | undefined {
    return this.timeSchedules.find((ts) => ts.id === tsId);
  }

  /** シフト案を評価（Shift マスターと照合） */
  evaluate(shifts: Shift[]): ShiftPlanEvaluation {
    const shiftEvaluations = shifts.map((shift) =>
      ShiftEvaluation.evaluate(shift, this.assignments),
    );

    const totalAssignmentCount = (this.state.assignments ?? []).length;
    const shortageCount = shiftEvaluations.filter((e) => e.hasShortage).length;
    const excessCount = shiftEvaluations.filter((e) => e.hasExcess).length;

    const totalFulfillmentRate =
      shiftEvaluations.length > 0
        ? shiftEvaluations.reduce((sum, e) => sum + e.fulfillmentRate, 0) /
          shiftEvaluations.length
        : 100;

    return {
      totalAssignmentCount,
      totalFulfillmentRate,
      shortageCount,
      excessCount,
      shiftEvaluations,
    };
  }

  /** 総合スコアを計算（高いほど良い） */
  calculateOverallScore(shifts: Shift[]): number {
    const evaluation = this.evaluate(shifts);
    let score = evaluation.totalFulfillmentRate;
    score -= evaluation.shortageCount * 5;
    score -= evaluation.excessCount * 2;
    return Math.max(0, score);
  }

  // ========== 制約違反 ==========

  detectConstraintViolations(): readonly ConstraintViolation[] {
    return this.constraintViolations;
  }

  hasConstraintViolations(): boolean {
    return this.constraintViolations.length > 0;
  }

  isAssignmentInViolation(assignmentId: string): boolean {
    return this.constraintViolations.some((v) => v.assignmentIds.includes(assignmentId));
  }

  isMemberShiftInViolation(memberId: string, shiftId: string): boolean {
    return this.constraintViolations.some(
      (v) => v.memberId === memberId && v.assignmentIds.some(
        (id) => (this.state.assignments ?? []).find((a) => a.id === id)?.shiftId === shiftId,
      ),
    );
  }

  /**
   * 制約違反を計算する。
   * 同一局員が担当時間の重複する配置を複数持っていないかチェック。
   */
  static computeConstraintViolations(
    assignments: readonly ShiftAssignmentState[]
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    // 局員ごとにグループ化
    const byMember = new Map<string, ShiftAssignmentState[]>();
    for (const a of assignments) {
      const list = byMember.get(a.staffId) ?? [];
      list.push(a);
      byMember.set(a.staffId, list);
    }

    for (const [memberId, memberAssignments] of byMember) {
      // 全ペアで時間重複チェック
      for (let i = 0; i < memberAssignments.length; i++) {
        for (let j = i + 1; j < memberAssignments.length; j++) {
          const a1 = memberAssignments[i];
          const a2 = memberAssignments[j];
          // 重複: a1.start < a2.end AND a2.start < a1.end
          if (a1.assignedStartMinute < a2.assignedEndMinute &&
              a2.assignedStartMinute < a1.assignedEndMinute) {
            violations.push({
              type: 'overlapping_assignments',
              memberId,
              assignmentIds: [a1.id, a2.id],
              message: `同じ局員が時間の重複する配置を${2}件持っています`,
            });
          }
        }
      }
    }

    return violations;
  }

  // ========== 状態変更メソッド ==========

  addAssignment(assignment: ShiftAssignment): ShiftPlan {
    return this.withUpdatedState({
      assignments: [...(this.state.assignments ?? []), assignment.state],
    });
  }

  removeAssignment(assignmentId: string): ShiftPlan {
    return this.withUpdatedState({
      assignments: (this.state.assignments ?? []).filter((a) => a.id !== assignmentId),
    });
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

  /** 配置を移動（担当局員・開始・終了時刻を変更）。制約違反を再計算する。 */
  moveAssignment(
    assignmentId: string,
    newStaffId: string,
    newStartMinute: number,
    newEndMinute: number,
  ): ShiftPlan {
    const updatedAssignments = (this.state.assignments ?? []).map((a) =>
      a.id === assignmentId
        ? { ...a, staffId: newStaffId, assignedStartMinute: newStartMinute, assignedEndMinute: newEndMinute }
        : a,
    );
    return this.withUpdatedState({ assignments: updatedAssignments });
  }

  withName(name: string): ShiftPlan {
    return this.withUpdatedState({ name });
  }

  withWeatherCondition(weatherCondition: WeatherCondition): ShiftPlan {
    return this.withUpdatedState({ weatherCondition });
  }

  protected withUpdatedState(partial: Partial<ShiftPlanState>): ShiftPlan {
    const newAssignments = partial.assignments ?? this.state.assignments ?? [];
    const constraintViolations = partial.assignments !== undefined
      ? ShiftPlan.computeConstraintViolations(newAssignments)
      : this.state.constraintViolations;

    return new ShiftPlan({
      ...this.state,
      ...partial,
      constraintViolations,
      updatedAt: new Date().toISOString(),
    });
  }

  // ========== 静的メソッド ==========

  static create(name: string, weatherCondition: WeatherCondition): ShiftPlan {
    const now = new Date().toISOString();
    return new ShiftPlan({
      id: crypto.randomUUID(),
      name,
      weatherCondition,
      assignments: [],
      timeSchedules: [],
      shifts: [],
      constraintViolations: [],
      createdAt: now,
      updatedAt: now,
    });
  }
}
