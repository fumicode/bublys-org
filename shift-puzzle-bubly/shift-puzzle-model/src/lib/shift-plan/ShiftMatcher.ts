/**
 * シフトマッチングサービス
 * 貪欲法による自動シフト配置アルゴリズム
 */

import { Member } from '../member/Member.js';
import { Shift } from '../master/Shift.js';
import { ShiftAssignment, ShiftAssignmentState } from './ShiftAssignment.js';

// ========== 型定義 ==========

/** マッチング設定 */
export interface MatchingOptions {
  /** 担当時間が重複する配置を同一局員に許可するか */
  readonly allowConcurrentAssignment: boolean;
  /** 局員1人あたりの最大配置数（0は無制限） */
  readonly maxAssignmentsPerMember: number;
  /** 既存の配置を維持するか */
  readonly preserveExistingAssignments: boolean;
}

/** マッチング結果 */
export interface MatchingResult {
  readonly assignments: readonly ShiftAssignmentState[];
  readonly stats: MatchingStats;
}

/** マッチング統計 */
export interface MatchingStats {
  readonly totalAssignments: number;
  readonly filledSlots: number;
  readonly unfilledSlots: number;
  readonly unassignedMembers: number;
}

/** 局員の候補評価 */
interface MemberCandidate {
  readonly member: Member;
  readonly matchingScore: number;
}

// ========== デフォルト設定 ==========

const DEFAULT_OPTIONS: MatchingOptions = {
  allowConcurrentAssignment: false,
  maxAssignmentsPerMember: 0,
  preserveExistingAssignments: true,
};

// ========== マッチングサービス ==========

export class ShiftMatcher {
  constructor(
    private readonly memberList: readonly Member[],
    private readonly shifts: readonly Shift[],
  ) {}

  /**
   * 自動マッチングを実行
   */
  match(
    existingAssignments: readonly ShiftAssignmentState[] = [],
    options: Partial<MatchingOptions> = {}
  ): MatchingResult {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    const assignments: ShiftAssignmentState[] = opts.preserveExistingAssignments
      ? [...existingAssignments]
      : [];

    const memberAssignmentCount = new Map<string, number>();

    for (const assignment of assignments) {
      const count = memberAssignmentCount.get(assignment.staffId) ?? 0;
      memberAssignmentCount.set(assignment.staffId, count + 1);
    }

    for (const shift of this.shifts) {
      const existingCount = assignments.filter((a) => a.shiftId === shift.id).length;
      const neededCount = Math.max(0, shift.requiredCount - existingCount);

      const candidates = this.evaluateCandidates(
        shift,
        assignments,
        memberAssignmentCount,
        opts,
      );

      for (let i = 0; i < neededCount && i < candidates.length; i++) {
        const candidate = candidates[i];
        const assignment = ShiftAssignment.create(
          shift.id,
          candidate.member.id,
          shift.startMinute,
          shift.endMinute,
          true,
        );
        assignments.push(assignment.state);

        const count = memberAssignmentCount.get(candidate.member.id) ?? 0;
        memberAssignmentCount.set(candidate.member.id, count + 1);
      }
    }

    const stats = this.calculateStats(assignments, memberAssignmentCount);
    return { assignments, stats };
  }

  private evaluateCandidates(
    shift: Shift,
    currentAssignments: readonly ShiftAssignmentState[],
    memberAssignmentCount: Map<string, number>,
    opts: MatchingOptions,
  ): MemberCandidate[] {
    const candidates: MemberCandidate[] = [];

    for (const member of this.memberList) {
      // 1. 参加可能性チェック（必須）
      if (!member.isAvailableForShift(shift)) continue;

      // 2. 既にこのシフトに配置されているかチェック
      const alreadyAssigned = currentAssignments.some(
        (a) => a.staffId === member.id && a.shiftId === shift.id,
      );
      if (alreadyAssigned) continue;

      // 3. 担当時間の重複チェック
      if (!opts.allowConcurrentAssignment) {
        const hasOverlap = currentAssignments.some(
          (a) =>
            a.staffId === member.id &&
            a.assignedStartMinute < shift.endMinute &&
            shift.startMinute < a.assignedEndMinute,
        );
        if (hasOverlap) continue;
      }

      // 4. 最大配置数チェック
      if (opts.maxAssignmentsPerMember > 0) {
        const count = memberAssignmentCount.get(member.id) ?? 0;
        if (count >= opts.maxAssignmentsPerMember) continue;
      }

      let matchingScore = 0;

      // 5. 同局優先
      if (shift.responsibleDepartment === member.department) {
        matchingScore += 5;
      }

      // 6. 配置数が少ない局員を優先（ロードバランス）
      const currentCount = memberAssignmentCount.get(member.id) ?? 0;
      matchingScore -= currentCount * 2;

      candidates.push({ member, matchingScore });
    }

    return candidates.sort((a, b) => b.matchingScore - a.matchingScore);
  }

  private calculateStats(
    assignments: readonly ShiftAssignmentState[],
    memberAssignmentCount: Map<string, number>,
  ): MatchingStats {
    let filledSlots = 0;
    let unfilledSlots = 0;

    for (const shift of this.shifts) {
      const assignedCount = assignments.filter((a) => a.shiftId === shift.id).length;
      if (assignedCount >= shift.requiredCount) {
        filledSlots++;
      } else {
        unfilledSlots++;
      }
    }

    const assignedMemberIds = new Set(assignments.map((a) => a.staffId));
    const unassignedMembers = this.memberList.filter((m) => !assignedMemberIds.has(m.id)).length;

    return {
      totalAssignments: assignments.length,
      filledSlots,
      unfilledSlots,
      unassignedMembers,
    };
  }

  // ========== 静的ファクトリーメソッド ==========

  static autoAssign(
    memberList: readonly Member[],
    shifts: readonly Shift[],
    existingAssignments: readonly ShiftAssignmentState[] = [],
    options: Partial<MatchingOptions> = {}
  ): MatchingResult {
    const matcher = new ShiftMatcher(memberList, shifts);
    return matcher.match(existingAssignments, options);
  }
}
