/**
 * 局員配置評価ドメインモデル
 * 個別の局員配置に対する適性評価を行う
 */

import { ShiftAssignment } from './ShiftAssignment.js';
import { Member } from '../member/Member.js';
import { Task } from '../master/Task.js';
import { TimeSlot } from '../master/TimeSlot.js';

// ========== 型定義 ==========

/** 評価ステータス */
export type EvaluationStatus = 'excellent' | 'good' | 'acceptable' | 'warning' | 'error';

/** 局員配置評価の状態 */
export interface MemberAssignmentEvaluationState {
  readonly assignmentId: string;
  readonly memberId: string;
  readonly timeSlotId: string;
  readonly taskId: string;
  readonly isAvailable: boolean;
  readonly isDepartmentMatch: boolean;
  readonly totalScore: number;
  readonly issues: readonly string[];
}

// ========== ドメインクラス ==========

export class MemberAssignmentEvaluation {
  constructor(readonly state: MemberAssignmentEvaluationState) {}

  get assignmentId(): string {
    return this.state.assignmentId;
  }

  get memberId(): string {
    return this.state.memberId;
  }

  get timeSlotId(): string {
    return this.state.timeSlotId;
  }

  get taskId(): string {
    return this.state.taskId;
  }

  get isAvailable(): boolean {
    return this.state.isAvailable;
  }

  get isDepartmentMatch(): boolean {
    return this.state.isDepartmentMatch;
  }

  get totalScore(): number {
    return this.state.totalScore;
  }

  get issues(): readonly string[] {
    return this.state.issues;
  }

  /** 総合評価ステータスを取得 */
  getOverallStatus(): EvaluationStatus {
    if (!this.state.isAvailable) {
      return 'error';
    }
    if (this.state.isDepartmentMatch) {
      return 'excellent';
    }
    return 'acceptable';
  }

  /** ステータスの日本語ラベルを取得 */
  static getStatusLabel(status: EvaluationStatus): string {
    const labels: Record<EvaluationStatus, string> = {
      excellent: '最適',
      good: '良好',
      acceptable: '可',
      warning: '注意',
      error: '問題あり',
    };
    return labels[status];
  }

  /** 配置を評価（既存配置の評価用） */
  static evaluate(
    assignment: ShiftAssignment,
    member: Member,
    task: Task,
    timeSlot: TimeSlot
  ): MemberAssignmentEvaluation {
    const result = this.evaluateCore(member, task, timeSlot);
    return new MemberAssignmentEvaluation({
      ...result,
      assignmentId: assignment.id,
    });
  }

  /**
   * 候補者を評価（配置前の仮評価用）
   * ShiftMatcherなどのマッチングアルゴリズムから使用
   */
  static evaluateCandidate(
    member: Member,
    task: Task,
    timeSlot: TimeSlot
  ): MemberAssignmentEvaluation {
    const result = this.evaluateCore(member, task, timeSlot);
    return new MemberAssignmentEvaluation({
      ...result,
      assignmentId: '',
    });
  }

  /** 評価の共通ロジック */
  private static evaluateCore(
    member: Member,
    task: Task,
    timeSlot: TimeSlot
  ): Omit<MemberAssignmentEvaluationState, 'assignmentId'> {
    const issues: string[] = [];

    const isAvailable = member.isAvailableAt(timeSlot.id);
    if (!isAvailable) {
      issues.push('この時間帯に参加できません');
    }

    const isDepartmentMatch = task.responsibleDepartment === member.department;

    let totalScore = 0;
    if (!isAvailable) totalScore -= 10;
    if (isDepartmentMatch) totalScore += 3;

    return {
      memberId: member.id,
      timeSlotId: timeSlot.id,
      taskId: task.id,
      isAvailable,
      isDepartmentMatch,
      totalScore,
      issues,
    };
  }
}
