/**
 * 局員配置評価ドメインモデル
 * 個別の局員配置に対する適性評価を行う
 */

import { ShiftAssignment } from './ShiftAssignment.js';
import { Member } from '../member/Member.js';
import { Shift } from '../master/Shift.js';

// ========== 型定義 ==========

/** 評価ステータス */
export type EvaluationStatus = 'excellent' | 'good' | 'acceptable' | 'warning' | 'error';

/** 局員配置評価の状態 */
export interface MemberAssignmentEvaluationState {
  readonly assignmentId: string;
  readonly memberId: string;
  readonly shiftId: string;
  readonly isAvailable: boolean;
  readonly isDepartmentMatch: boolean;
  readonly totalScore: number;
  readonly issues: readonly string[];
}

// ========== ドメインクラス ==========

export class MemberAssignmentEvaluation {
  constructor(readonly state: MemberAssignmentEvaluationState) {}

  get assignmentId(): string { return this.state.assignmentId; }
  get memberId(): string { return this.state.memberId; }
  get shiftId(): string { return this.state.shiftId; }
  get isAvailable(): boolean { return this.state.isAvailable; }
  get isDepartmentMatch(): boolean { return this.state.isDepartmentMatch; }
  get totalScore(): number { return this.state.totalScore; }
  get issues(): readonly string[] { return this.state.issues; }

  /** 総合評価ステータスを取得 */
  getOverallStatus(): EvaluationStatus {
    if (!this.state.isAvailable) return 'error';
    if (this.state.isDepartmentMatch) return 'excellent';
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
    shift: Shift,
  ): MemberAssignmentEvaluation {
    const result = this.evaluateCore(member, shift);
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
    shift: Shift,
  ): MemberAssignmentEvaluation {
    const result = this.evaluateCore(member, shift);
    return new MemberAssignmentEvaluation({
      ...result,
      assignmentId: '',
    });
  }

  /** 評価の共通ロジック */
  private static evaluateCore(
    member: Member,
    shift: Shift,
  ): Omit<MemberAssignmentEvaluationState, 'assignmentId'> {
    const issues: string[] = [];

    const isAvailable = member.isAvailableForShift(shift);
    if (!isAvailable) {
      issues.push('このシフトに参加できません');
    }

    const isDepartmentMatch = shift.responsibleDepartment === member.department;

    let totalScore = 0;
    if (!isAvailable) totalScore -= 10;
    if (isDepartmentMatch) totalScore += 3;

    return {
      memberId: member.id,
      shiftId: shift.id,
      isAvailable,
      isDepartmentMatch,
      totalScore,
      issues,
    };
  }
}
