/**
 * シフトマッチングサービス
 * 貪欲法による自動シフト配置アルゴリズム
 */

import { Staff_スタッフ } from './Staff_スタッフ.js';
import { Role_係 } from './Role_係.js';
import { TimeSlot_時間帯 } from './TimeSlot_時間帯.js';
import { ShiftAssignment_シフト配置, ShiftAssignmentState } from './ShiftAssignment_シフト配置.js';
import { StaffRequirement_必要人数 } from './StaffRequirement_必要人数.js';
import { StaffAssignmentEvaluation_スタッフ配置評価 } from './StaffAssignmentEvaluation_スタッフ配置評価.js';

// ========== 型定義 ==========

/** マッチング設定 */
export interface MatchingOptions {
  /** 1つの時間帯に同じスタッフを配置可能か（兼務） */
  readonly allowConcurrentAssignment: boolean;
  /** スタッフ1人あたりの最大配置数（0は無制限） */
  readonly maxAssignmentsPerStaff: number;
  /** 既存の配置を維持するか */
  readonly preserveExistingAssignments: boolean;
}

/** マッチング結果 */
export interface MatchingResult {
  readonly assignments: ReadonlyArray<ShiftAssignmentState>;
  readonly stats: MatchingStats;
}

/** マッチング統計 */
export interface MatchingStats {
  readonly totalAssignments: number;
  readonly filledSlots: number;
  readonly unfilledSlots: number;
  readonly unassignedStaff: number;
}

/** スタッフの候補評価 */
interface StaffCandidate {
  readonly staff: Staff_スタッフ;
  readonly evaluation: StaffAssignmentEvaluation_スタッフ配置評価;
  readonly matchingScore: number; // マッチング用の調整後スコア
  readonly reasons: ReadonlyArray<string>;
}

// ========== デフォルト設定 ==========

const DEFAULT_OPTIONS: MatchingOptions = {
  allowConcurrentAssignment: false,
  maxAssignmentsPerStaff: 0, // 無制限
  preserveExistingAssignments: true,
};

// ========== マッチングサービス ==========

export class ShiftMatcher_シフトマッチング {
  constructor(
    private readonly staffList: ReadonlyArray<Staff_スタッフ>,
    private readonly roles: ReadonlyArray<Role_係>,
    private readonly timeSlots: ReadonlyArray<TimeSlot_時間帯>,
    private readonly requirements: ReadonlyArray<StaffRequirement_必要人数>
  ) {}

  /**
   * 自動マッチングを実行
   * @param existingAssignments 既存の配置（オプション）
   * @param options マッチングオプション
   */
  match(
    existingAssignments: ReadonlyArray<ShiftAssignmentState> = [],
    options: Partial<MatchingOptions> = {}
  ): MatchingResult {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // 既存配置を考慮
    const assignments: ShiftAssignmentState[] = opts.preserveExistingAssignments
      ? [...existingAssignments]
      : [];

    // 各スタッフの配置数をトラッキング
    const staffAssignmentCount = new Map<string, number>();
    const staffTimeSlotAssignments = new Map<string, Set<string>>();

    // 既存配置のカウントを初期化
    for (const assignment of assignments) {
      const count = staffAssignmentCount.get(assignment.staffId) ?? 0;
      staffAssignmentCount.set(assignment.staffId, count + 1);

      const slots = staffTimeSlotAssignments.get(assignment.staffId) ?? new Set();
      slots.add(assignment.timeSlotId);
      staffTimeSlotAssignments.set(assignment.staffId, slots);
    }

    // 役職を優先度順にソート（高い順）
    const sortedRoles = [...this.roles].sort((a, b) => b.priority - a.priority);

    // 時間帯ごと、役職ごとにマッチング
    for (const role of sortedRoles) {
      for (const timeSlot of this.timeSlots) {
        // この時間帯×係の必要人数を取得
        const requirement = this.requirements.find(
          (r) => r.timeSlotId === timeSlot.id && r.roleId === role.id
        );
        const requiredCount = requirement?.requiredCount ?? 1;

        // 既存配置数を確認
        const existingCount = assignments.filter(
          (a) => a.timeSlotId === timeSlot.id && a.roleId === role.id
        ).length;

        // 追加が必要な人数
        const neededCount = Math.max(0, requiredCount - existingCount);

        // 候補者を評価してソート
        const candidates = this.evaluateCandidates(
          timeSlot,
          role,
          assignments,
          staffAssignmentCount,
          staffTimeSlotAssignments,
          opts
        );

        // 上位から配置
        for (let i = 0; i < neededCount && i < candidates.length; i++) {
          const candidate = candidates[i];

          // 配置を作成
          const assignment = ShiftAssignment_シフト配置.create(
            candidate.staff.id,
            timeSlot.id,
            role.id,
            true // 自動配置フラグ
          );

          assignments.push(assignment.state);

          // カウントを更新
          const count = staffAssignmentCount.get(candidate.staff.id) ?? 0;
          staffAssignmentCount.set(candidate.staff.id, count + 1);

          const slots = staffTimeSlotAssignments.get(candidate.staff.id) ?? new Set();
          slots.add(timeSlot.id);
          staffTimeSlotAssignments.set(candidate.staff.id, slots);
        }
      }
    }

    // 統計を計算
    const stats = this.calculateStats(assignments, staffAssignmentCount);

    return { assignments, stats };
  }

  /**
   * 特定の時間帯×係への候補者を評価
   */
  private evaluateCandidates(
    timeSlot: TimeSlot_時間帯,
    role: Role_係,
    currentAssignments: ReadonlyArray<ShiftAssignmentState>,
    staffAssignmentCount: Map<string, number>,
    staffTimeSlotAssignments: Map<string, Set<string>>,
    opts: MatchingOptions
  ): StaffCandidate[] {
    const candidates: StaffCandidate[] = [];

    for (const staff of this.staffList) {
      const reasons: string[] = [];

      // 1. 参加可能性チェック（必須）
      if (!staff.isAvailableAt(timeSlot.id)) {
        continue; // この時間帯は参加不可
      }

      // 2. 既にこの時間帯×係に配置されているかチェック
      const alreadyAssigned = currentAssignments.some(
        (a) =>
          a.staffId === staff.id &&
          a.timeSlotId === timeSlot.id &&
          a.roleId === role.id
      );
      if (alreadyAssigned) {
        continue;
      }

      // 3. 同一時間帯への兼務チェック
      const assignedSlots = staffTimeSlotAssignments.get(staff.id);
      if (assignedSlots?.has(timeSlot.id) && !opts.allowConcurrentAssignment) {
        // 兼務可能な係でなければスキップ
        if (!role.isConcurrentOk()) {
          continue;
        }
      }

      // 4. 最大配置数チェック
      if (opts.maxAssignmentsPerStaff > 0) {
        const count = staffAssignmentCount.get(staff.id) ?? 0;
        if (count >= opts.maxAssignmentsPerStaff) {
          continue;
        }
      }

      // 5. StaffAssignmentEvaluationで評価
      const evaluation = StaffAssignmentEvaluation_スタッフ配置評価.evaluateCandidate(
        staff,
        role,
        timeSlot
      );

      // ベーススコア（評価結果から取得）
      let matchingScore = evaluation.totalScore;

      // マッチング固有の調整を追加
      if (evaluation.meetsRequirements) {
        reasons.push('要件満たす');
      } else {
        reasons.push('要件不足');
      }

      if (evaluation.roleFitScore > 0) {
        reasons.push(`適性+${evaluation.roleFitScore}`);
      }

      if (evaluation.isPreferredRole) {
        reasons.push(`第${evaluation.preferredRoleRank}希望`);
      }

      // 6. 既存配置数が少ないスタッフを優先（均等配置）
      const currentCount = staffAssignmentCount.get(staff.id) ?? 0;
      matchingScore -= currentCount * 2;
      if (currentCount === 0) {
        reasons.push('未配置');
      }

      // 7. 参加可能時間帯が多いスタッフを優先（柔軟性）
      const availableCount = staff.availableTimeSlots.length;
      matchingScore += Math.min(availableCount, 5);

      candidates.push({ staff, evaluation, matchingScore, reasons });
    }

    // マッチングスコア順にソート（高い順）
    return candidates.sort((a, b) => b.matchingScore - a.matchingScore);
  }

  /**
   * マッチング統計を計算
   */
  private calculateStats(
    assignments: ReadonlyArray<ShiftAssignmentState>,
    staffAssignmentCount: Map<string, number>
  ): MatchingStats {
    let filledSlots = 0;
    let unfilledSlots = 0;

    for (const requirement of this.requirements) {
      const assignedCount = assignments.filter(
        (a) =>
          a.timeSlotId === requirement.timeSlotId &&
          a.roleId === requirement.roleId
      ).length;

      if (assignedCount >= requirement.requiredCount) {
        filledSlots++;
      } else {
        unfilledSlots++;
      }
    }

    const assignedStaffIds = new Set(assignments.map((a) => a.staffId));
    const unassignedStaff = this.staffList.filter(
      (s) => !assignedStaffIds.has(s.id)
    ).length;

    return {
      totalAssignments: assignments.length,
      filledSlots,
      unfilledSlots,
      unassignedStaff,
    };
  }

  // ========== 静的ファクトリーメソッド ==========

  /**
   * デフォルトのマッチングを実行するシンプルなファクトリー
   */
  static autoAssign(
    staffList: ReadonlyArray<Staff_スタッフ>,
    roles: ReadonlyArray<Role_係>,
    timeSlots: ReadonlyArray<TimeSlot_時間帯>,
    existingAssignments: ReadonlyArray<ShiftAssignmentState> = [],
    options: Partial<MatchingOptions> = {}
  ): MatchingResult {
    // 必要人数のデフォルト（各時間帯×係に1人）
    const requirements = ShiftMatcher_シフトマッチング.createDefaultRequirements(
      timeSlots,
      roles
    );

    const matcher = new ShiftMatcher_シフトマッチング(
      staffList,
      roles,
      timeSlots,
      requirements
    );

    return matcher.match(existingAssignments, options);
  }

  /**
   * デフォルトの必要人数を作成（各時間帯×係に1人）
   */
  static createDefaultRequirements(
    timeSlots: ReadonlyArray<TimeSlot_時間帯>,
    roles: ReadonlyArray<Role_係>
  ): StaffRequirement_必要人数[] {
    const requirements: StaffRequirement_必要人数[] = [];

    for (const timeSlot of timeSlots) {
      for (const role of roles) {
        // 懇親会専用係は懇親会時間帯のみ
        if (role.isPartyOnly() && timeSlot.period !== 'party') {
          continue;
        }
        // 懇親会時間帯には懇親会専用係のみ
        if (!role.isPartyOnly() && timeSlot.period === 'party') {
          continue;
        }

        requirements.push(
          StaffRequirement_必要人数.create(timeSlot.id, role.id, 1)
        );
      }
    }

    return requirements;
  }
}
