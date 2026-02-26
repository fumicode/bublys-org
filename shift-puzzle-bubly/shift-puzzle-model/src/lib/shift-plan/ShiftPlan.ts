/**
 * シフト案ドメインモデル
 * gakkai-shiftのShiftPlan_シフト案を汎用化:
 *   - scenarioLabel（シナリオラベル）追加
 *   - Assignment（AssignmentReason必須版）を使用
 */

import { Assignment, AssignmentState } from '../assignment/Assignment.js';
import { AssignmentReason } from '../assignment/AssignmentReason.js';
import { ConstraintChecker, ConstraintViolation, RoleFulfillment } from '../assignment/ConstraintChecker.js';
import { MemberState } from '../member/Member.js';
import { RoleState } from '../role/Role.js';
import { TimeSlotState } from '../time/TimeSlot.js';

// ========== 型定義 ==========

/** シフト案の状態 */
export interface ShiftPlanState {
  readonly id: string;
  readonly name: string;
  readonly scenarioLabel: string;   // 例: "晴天用", "雨天用", "人数削減版"
  readonly assignments: ReadonlyArray<AssignmentState>;
  readonly eventId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Redux/JSON用のシリアライズ型 */
export type ShiftPlanJSON = {
  id: string;
  name: string;
  scenarioLabel: string;
  assignments: AssignmentState[];
  eventId: string;
  createdAt: string;
  updatedAt: string;
};

// ========== ドメインクラス ==========

export class ShiftPlan {
  constructor(readonly state: ShiftPlanState) {}

  get id(): string {
    return this.state.id;
  }

  get name(): string {
    return this.state.name;
  }

  get scenarioLabel(): string {
    return this.state.scenarioLabel;
  }

  get eventId(): string {
    return this.state.eventId;
  }

  get assignments(): ReadonlyArray<Assignment> {
    return this.state.assignments.map((s) => new Assignment(s));
  }

  /** 特定メンバーの配置を取得 */
  getAssignmentsByMember(memberId: string): Assignment[] {
    return this.assignments.filter((a) => a.memberId === memberId);
  }

  /** 特定時間帯の配置を取得 */
  getAssignmentsByTimeSlot(timeSlotId: string): Assignment[] {
    return this.assignments.filter((a) => a.timeSlotId === timeSlotId);
  }

  /** 特定役割の配置を取得 */
  getAssignmentsByRole(roleId: string): Assignment[] {
    return this.assignments.filter((a) => a.roleId === roleId);
  }

  /** 特定の時間帯 × 役割の配置を取得 */
  getAssignmentsForSlotRole(timeSlotId: string, roleId: string): Assignment[] {
    return this.assignments.filter(
      (a) => a.timeSlotId === timeSlotId && a.roleId === roleId
    );
  }

  /** メンバーの総拘束分数を計算 */
  getMemberTotalMinutes(
    memberId: string,
    timeSlots: ReadonlyMap<string, TimeSlotState>
  ): number {
    return this.getAssignmentsByMember(memberId).reduce((total, assignment) => {
      const slot = timeSlots.get(assignment.timeSlotId);
      return total + (slot?.durationMinutes ?? 0);
    }, 0);
  }

  // ========== 制約チェック ==========

  /** 制約違反を検出 */
  computeConstraintViolations(
    members: ReadonlyArray<MemberState>,
    roles: ReadonlyArray<RoleState>,
    timeSlots: ReadonlyArray<TimeSlotState>
  ): ConstraintViolation[] {
    const checker = ConstraintChecker.create(
      this.state.assignments,
      members,
      roles,
      timeSlots
    );
    return checker.computeViolations();
  }

  /** 役割充足状況を計算 */
  computeRoleFulfillments(
    roles: ReadonlyArray<RoleState>,
    timeSlots: ReadonlyArray<TimeSlotState>
  ): RoleFulfillment[] {
    const checker = ConstraintChecker.create(
      this.state.assignments,
      [],
      roles,
      timeSlots
    );
    return checker.computeRoleFulfillments();
  }

  /** 総合スコアを計算（高いほど良い） */
  calculateOverallScore(
    roles: ReadonlyArray<RoleState>,
    timeSlots: ReadonlyArray<TimeSlotState>
  ): number {
    const fulfillments = this.computeRoleFulfillments(roles, timeSlots);
    if (fulfillments.length === 0) return 100;

    const fulfillmentRate =
      fulfillments.filter((f) => f.isFulfilled).length / fulfillments.length * 100;
    const overFillPenalty = fulfillments.filter((f) => f.isOverFilled).length * 2;

    return Math.max(0, fulfillmentRate - overFillPenalty);
  }

  // ========== 状態変更メソッド ==========

  /** 配置を追加（reasonは必須） */
  addAssignment(assignment: Assignment): ShiftPlan {
    return this.withUpdatedState({
      assignments: [...this.state.assignments, assignment.state],
    });
  }

  /** 配置を削除 */
  removeAssignment(assignmentId: string): ShiftPlan {
    const target = this.state.assignments.find((a) => a.id === assignmentId);
    if (target?.locked) {
      throw new Error(`配置 ${assignmentId} はロックされているため削除できません`);
    }
    return this.withUpdatedState({
      assignments: this.state.assignments.filter((a) => a.id !== assignmentId),
    });
  }

  /** 配置理由を更新 */
  updateAssignmentReason(assignmentId: string, reason: AssignmentReason): ShiftPlan {
    return this.withUpdatedState({
      assignments: this.state.assignments.map((a) =>
        a.id === assignmentId
          ? new Assignment(a).withReason(reason).state
          : a
      ),
    });
  }

  /** シフト案名を変更 */
  withName(name: string): ShiftPlan {
    return this.withUpdatedState({ name });
  }

  /** シナリオラベルを変更 */
  withScenarioLabel(label: string): ShiftPlan {
    return this.withUpdatedState({ scenarioLabel: label });
  }

  /** このシフト案をコピーして新しい案を作成（配置・理由ごとコピー） */
  fork(newName: string, newScenarioLabel = ''): ShiftPlan {
    const now = new Date().toISOString();
    return new ShiftPlan({
      ...this.state,
      id: crypto.randomUUID(),
      name: newName,
      scenarioLabel: newScenarioLabel,
      // 配置はIDを新規発行してコピー
      assignments: this.state.assignments.map((a) => ({
        ...a,
        id: crypto.randomUUID(),
        shiftPlanId: crypto.randomUUID(), // 仮、後でIDを差し替える
        createdAt: now,
        updatedAt: now,
      })),
      createdAt: now,
      updatedAt: now,
    });
  }

  /** 内部用：状態更新ヘルパー */
  protected withUpdatedState(partial: Partial<ShiftPlanState>): ShiftPlan {
    return new ShiftPlan({
      ...this.state,
      ...partial,
      updatedAt: new Date().toISOString(),
    });
  }

  // ========== シリアライズ ==========

  toJSON(): ShiftPlanJSON {
    return {
      id: this.state.id,
      name: this.state.name,
      scenarioLabel: this.state.scenarioLabel,
      assignments: [...this.state.assignments],
      eventId: this.state.eventId,
      createdAt: this.state.createdAt,
      updatedAt: this.state.updatedAt,
    };
  }

  static fromJSON(json: ShiftPlanJSON): ShiftPlan {
    return new ShiftPlan(json);
  }

  /** 新しいシフト案を作成 */
  static create(
    data: Pick<ShiftPlanState, 'name' | 'eventId'> &
      Partial<Pick<ShiftPlanState, 'scenarioLabel'>>
  ): ShiftPlan {
    const now = new Date().toISOString();
    return new ShiftPlan({
      id: crypto.randomUUID(),
      name: data.name,
      scenarioLabel: data.scenarioLabel ?? '',
      assignments: [],
      eventId: data.eventId,
      createdAt: now,
      updatedAt: now,
    });
  }
}
