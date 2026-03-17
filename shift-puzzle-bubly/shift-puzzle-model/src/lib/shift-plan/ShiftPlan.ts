/**
 * シフト案ドメインモデル
 * 全配置を取りまとめて、シフト全体の評価を行う
 */

import { ShiftAssignment, ShiftAssignmentState } from './ShiftAssignment.js';
import { TaskRequirement } from '../master/TimeSlot.js';
import { SlotTaskEvaluation } from './SlotTaskEvaluation.js';

// ========== 型定義 ==========

/** 天候条件 */
export type WeatherCondition = '晴れ' | '雨';

/** 制約違反の種類 */
export type ConstraintViolationType = 'duplicate_member_in_timeslot';

/** 制約違反 */
export interface ConstraintViolation {
  readonly type: ConstraintViolationType;
  readonly memberId: string;
  readonly timeSlotId: string;
  readonly assignmentIds: readonly string[];
  readonly message: string;
}

/** シフト案の状態 */
export interface ShiftPlanState {
  readonly id: string;
  readonly name: string;
  readonly weatherCondition: WeatherCondition;
  readonly assignments: readonly ShiftAssignmentState[];
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
  readonly slotTaskEvaluations: readonly SlotTaskEvaluation[];
}

// ========== ドメインクラス ==========

export class ShiftPlan {
  constructor(readonly state: ShiftPlanState) {}

  get id(): string {
    return this.state.id;
  }

  get name(): string {
    return this.state.name;
  }

  get weatherCondition(): WeatherCondition {
    return this.state.weatherCondition;
  }

  get assignments(): readonly ShiftAssignment[] {
    return this.state.assignments.map((s) => new ShiftAssignment(s));
  }

  get constraintViolations(): readonly ConstraintViolation[] {
    return this.state.constraintViolations ?? ShiftPlan.computeConstraintViolations(this.state.assignments);
  }

  /** 特定局員の配置を取得 */
  getAssignmentsByMember(memberId: string): ShiftAssignment[] {
    return this.assignments.filter((a) => a.staffId === memberId);
  }

  /** 特定時間帯の配置を取得 */
  getAssignmentsByTimeSlot(timeSlotId: string): ShiftAssignment[] {
    return this.assignments.filter((a) => a.timeSlotId === timeSlotId);
  }

  /** 特定タスクの配置を取得 */
  getAssignmentsByTask(taskId: string): ShiftAssignment[] {
    return this.assignments.filter((a) => a.roleId === taskId);
  }

  /** 特定の時間帯×タスクの配置を取得 */
  getAssignmentsForSlotTask(timeSlotId: string, taskId: string): ShiftAssignment[] {
    return this.assignments.filter(
      (a) => a.timeSlotId === timeSlotId && a.roleId === taskId
    );
  }

  /** シフト案を評価（必要人数と照合） */
  evaluate(requirements: TaskRequirement[]): ShiftPlanEvaluation {
    const slotTaskEvaluations: SlotTaskEvaluation[] = [];

    for (const req of requirements) {
      const assignedMemberIds = this.getAssignmentsForSlotTask(
        req.timeSlotId,
        req.taskId
      ).map((a) => a.staffId);

      const evaluation = SlotTaskEvaluation.evaluate(req, assignedMemberIds);
      slotTaskEvaluations.push(evaluation);
    }

    const totalAssignmentCount = this.state.assignments.length;
    const shortageCount = slotTaskEvaluations.filter((e) => e.hasShortage).length;
    const excessCount = slotTaskEvaluations.filter((e) => e.hasExcess).length;

    const totalFulfillmentRate =
      slotTaskEvaluations.length > 0
        ? slotTaskEvaluations.reduce((sum, e) => sum + e.fulfillmentRate, 0) /
          slotTaskEvaluations.length
        : 100;

    return {
      totalAssignmentCount,
      totalFulfillmentRate,
      shortageCount,
      excessCount,
      slotTaskEvaluations,
    };
  }

  /** 総合スコアを計算（高いほど良い） */
  calculateOverallScore(requirements: TaskRequirement[]): number {
    const evaluation = this.evaluate(requirements);

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

  isMemberTimeSlotInViolation(memberId: string, timeSlotId: string): boolean {
    return this.constraintViolations.some(
      (v) => v.memberId === memberId && v.timeSlotId === timeSlotId
    );
  }

  static computeConstraintViolations(
    assignments: readonly ShiftAssignmentState[]
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    const groupedByTimeSlotAndMember = new Map<string, ShiftAssignmentState[]>();

    for (const assignment of assignments) {
      const key = `${assignment.timeSlotId}:${assignment.staffId}`;
      const existing = groupedByTimeSlotAndMember.get(key) ?? [];
      existing.push(assignment);
      groupedByTimeSlotAndMember.set(key, existing);
    }

    for (const [key, grouped] of groupedByTimeSlotAndMember) {
      if (grouped.length > 1) {
        const [timeSlotId, memberId] = key.split(':');
        violations.push({
          type: 'duplicate_member_in_timeslot',
          memberId,
          timeSlotId,
          assignmentIds: grouped.map((a) => a.id),
          message: `同一時間帯に同じ局員が${grouped.length}件配置されています`,
        });
      }
    }

    return violations;
  }

  // ========== 状態変更メソッド ==========

  addAssignment(assignment: ShiftAssignment): ShiftPlan {
    return this.withUpdatedState({
      assignments: [...this.state.assignments, assignment.state],
    });
  }

  removeAssignment(assignmentId: string): ShiftPlan {
    return this.withUpdatedState({
      assignments: this.state.assignments.filter((a) => a.id !== assignmentId),
    });
  }

  withName(name: string): ShiftPlan {
    return this.withUpdatedState({ name });
  }

  withWeatherCondition(weatherCondition: WeatherCondition): ShiftPlan {
    return this.withUpdatedState({ weatherCondition });
  }

  protected withUpdatedState(partial: Partial<ShiftPlanState>): ShiftPlan {
    const newAssignments = partial.assignments ?? this.state.assignments;
    const constraintViolations = partial.assignments
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
      constraintViolations: [],
      createdAt: now,
      updatedAt: now,
    });
  }
}
