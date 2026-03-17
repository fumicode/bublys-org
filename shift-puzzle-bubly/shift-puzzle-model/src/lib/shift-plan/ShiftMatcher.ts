/**
 * シフトマッチングサービス
 * 貪欲法による自動シフト配置アルゴリズム
 */

import { Member } from '../member/Member.js';
import { Task } from '../master/Task.js';
import { TimeSlot, TaskRequirement } from '../master/TimeSlot.js';
import { ShiftAssignment, ShiftAssignmentState } from './ShiftAssignment.js';

// ========== 型定義 ==========

/** マッチング設定 */
export interface MatchingOptions {
  /** 1つの時間帯に同じ局員を配置可能か（兼務） */
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
  readonly reasons: readonly string[];
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
    private readonly tasks: readonly Task[],
    private readonly timeSlots: readonly TimeSlot[],
    private readonly requirements: readonly TaskRequirement[]
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
    const memberTimeSlotAssignments = new Map<string, Set<string>>();

    for (const assignment of assignments) {
      const count = memberAssignmentCount.get(assignment.staffId) ?? 0;
      memberAssignmentCount.set(assignment.staffId, count + 1);

      const slots = memberTimeSlotAssignments.get(assignment.staffId) ?? new Set();
      slots.add(assignment.timeSlotId);
      memberTimeSlotAssignments.set(assignment.staffId, slots);
    }

    for (const task of this.tasks) {
      for (const timeSlot of this.timeSlots) {
        const requirement = this.requirements.find(
          (r) => r.timeSlotId === timeSlot.id && r.taskId === task.id
        );

        if (!requirement) continue;

        const existingCount = assignments.filter(
          (a) => a.timeSlotId === timeSlot.id && a.roleId === task.id
        ).length;

        const neededCount = Math.max(0, requirement.requiredCount - existingCount);

        const candidates = this.evaluateCandidates(
          timeSlot,
          task,
          assignments,
          memberAssignmentCount,
          memberTimeSlotAssignments,
          opts
        );

        for (let i = 0; i < neededCount && i < candidates.length; i++) {
          const candidate = candidates[i];

          const assignment = ShiftAssignment.create(
            candidate.member.id,
            timeSlot.id,
            task.id,
            true
          );

          assignments.push(assignment.state);

          const count = memberAssignmentCount.get(candidate.member.id) ?? 0;
          memberAssignmentCount.set(candidate.member.id, count + 1);

          const slots = memberTimeSlotAssignments.get(candidate.member.id) ?? new Set();
          slots.add(timeSlot.id);
          memberTimeSlotAssignments.set(candidate.member.id, slots);
        }
      }
    }

    const stats = this.calculateStats(assignments, memberAssignmentCount);
    return { assignments, stats };
  }

  private evaluateCandidates(
    timeSlot: TimeSlot,
    task: Task,
    currentAssignments: readonly ShiftAssignmentState[],
    memberAssignmentCount: Map<string, number>,
    memberTimeSlotAssignments: Map<string, Set<string>>,
    opts: MatchingOptions
  ): MemberCandidate[] {
    const candidates: MemberCandidate[] = [];

    for (const member of this.memberList) {
      const reasons: string[] = [];

      // 1. 参加可能性チェック（必須）
      if (!member.isAvailableAt(timeSlot.id)) continue;

      // 2. 既にこの時間帯×タスクに配置されているかチェック
      const alreadyAssigned = currentAssignments.some(
        (a) => a.staffId === member.id && a.timeSlotId === timeSlot.id && a.roleId === task.id
      );
      if (alreadyAssigned) continue;

      // 3. 同一時間帯への兼務チェック
      const assignedSlots = memberTimeSlotAssignments.get(member.id);
      if (assignedSlots?.has(timeSlot.id) && !opts.allowConcurrentAssignment) continue;

      // 4. 最大配置数チェック
      if (opts.maxAssignmentsPerMember > 0) {
        const count = memberAssignmentCount.get(member.id) ?? 0;
        if (count >= opts.maxAssignmentsPerMember) continue;
      }

      let matchingScore = 0;

      // 5. 同局優先
      const isDepartmentMatch = task.responsibleDepartment === member.department;
      if (isDepartmentMatch) {
        matchingScore += 5;
        reasons.push('同局');
      }

      // 6. 配置数が少ない局員を優先（ロードバランス）
      const currentCount = memberAssignmentCount.get(member.id) ?? 0;
      matchingScore -= currentCount * 2;
      if (currentCount === 0) reasons.push('未配置');

      candidates.push({ member, matchingScore, reasons });
    }

    return candidates.sort((a, b) => b.matchingScore - a.matchingScore);
  }

  private calculateStats(
    assignments: readonly ShiftAssignmentState[],
    memberAssignmentCount: Map<string, number>
  ): MatchingStats {
    let filledSlots = 0;
    let unfilledSlots = 0;

    for (const requirement of this.requirements) {
      const assignedCount = assignments.filter(
        (a) => a.timeSlotId === requirement.timeSlotId && a.roleId === requirement.taskId
      ).length;

      if (assignedCount >= requirement.requiredCount) {
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
    tasks: readonly Task[],
    timeSlots: readonly TimeSlot[],
    existingAssignments: readonly ShiftAssignmentState[] = [],
    options: Partial<MatchingOptions> = {}
  ): MatchingResult {
    const requirements = ShiftMatcher.extractRequirements(timeSlots);
    const matcher = new ShiftMatcher(memberList, tasks, timeSlots, requirements);
    return matcher.match(existingAssignments, options);
  }

  static extractRequirements(timeSlots: readonly TimeSlot[]): TaskRequirement[] {
    const requirements: TaskRequirement[] = [];
    for (const timeSlot of timeSlots) {
      requirements.push(...timeSlot.taskRequirements);
    }
    return requirements;
  }
}
