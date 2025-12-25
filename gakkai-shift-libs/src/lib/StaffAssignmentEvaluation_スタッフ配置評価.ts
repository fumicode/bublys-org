/**
 * スタッフ配置評価ドメインモデル
 * 個別のスタッフ配置に対する適性評価を行う
 */

import { ShiftAssignment_シフト配置 } from './ShiftAssignment_シフト配置.js';
import { Staff_スタッフ } from './Staff_スタッフ.js';
import { Role_係, SkillLevel_スキルレベル } from './Role_係.js';
import { TimeSlot_時間帯 } from './TimeSlot_時間帯.js';

// ========== 型定義 ==========

/** 評価ステータス */
export type EvaluationStatus = 'excellent' | 'good' | 'acceptable' | 'warning' | 'error';

/** スキルマッチング詳細 */
export interface SkillMatchDetail {
  readonly skillName: string;
  readonly required: SkillLevel_スキルレベル | 'none' | 'any';
  readonly staffHas: SkillLevel_スキルレベル | string;
  readonly isMatch: boolean;
  readonly scoreDiff: number;
}

/** スタッフ配置評価の状態 */
export interface StaffAssignmentEvaluationState {
  readonly assignmentId: string;
  readonly staffId: string;
  readonly timeSlotId: string;
  readonly roleId: string;
  readonly isAvailable: boolean;
  readonly meetsRequirements: boolean;
  readonly isPreferredRole: boolean;
  readonly preferredRoleRank: number | null; // 第何希望か（1始まり）、希望でなければnull
  readonly hasPresentationConflict: boolean;
  readonly skillMatches: ReadonlyArray<SkillMatchDetail>;
  readonly roleFitScore: number;
  readonly totalScore: number;
  readonly issues: ReadonlyArray<string>;
}

// ========== ドメインクラス ==========

export class StaffAssignmentEvaluation_スタッフ配置評価 {
  constructor(readonly state: StaffAssignmentEvaluationState) {}

  get assignmentId(): string {
    return this.state.assignmentId;
  }

  get staffId(): string {
    return this.state.staffId;
  }

  get timeSlotId(): string {
    return this.state.timeSlotId;
  }

  get roleId(): string {
    return this.state.roleId;
  }

  get isAvailable(): boolean {
    return this.state.isAvailable;
  }

  get meetsRequirements(): boolean {
    return this.state.meetsRequirements;
  }

  get isPreferredRole(): boolean {
    return this.state.isPreferredRole;
  }

  get preferredRoleRank(): number | null {
    return this.state.preferredRoleRank;
  }

  get hasPresentationConflict(): boolean {
    return this.state.hasPresentationConflict;
  }

  get skillMatches(): ReadonlyArray<SkillMatchDetail> {
    return this.state.skillMatches;
  }

  get roleFitScore(): number {
    return this.state.roleFitScore;
  }

  get totalScore(): number {
    return this.state.totalScore;
  }

  get issues(): ReadonlyArray<string> {
    return this.state.issues;
  }

  /** 総合評価ステータスを取得 */
  getOverallStatus(): EvaluationStatus {
    const { issues, totalScore } = this.state;

    // エラーレベルの問題がある場合
    if (!this.state.isAvailable || this.state.hasPresentationConflict) {
      return 'error';
    }

    // 要件を満たさない場合
    if (!this.state.meetsRequirements) {
      return 'warning';
    }

    // スコアに基づく評価
    if (totalScore >= 10) return 'excellent';
    if (totalScore >= 5) return 'good';
    if (totalScore >= 0) return 'acceptable';
    if (issues.length > 0) return 'warning';

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
    assignment: ShiftAssignment_シフト配置,
    staff: Staff_スタッフ,
    role: Role_係,
    timeSlot: TimeSlot_時間帯
  ): StaffAssignmentEvaluation_スタッフ配置評価 {
    const result = this.evaluateCore(staff, role, timeSlot);
    return new StaffAssignmentEvaluation_スタッフ配置評価({
      ...result,
      assignmentId: assignment.id,
    });
  }

  /**
   * 候補者を評価（配置前の仮評価用）
   * ShiftMatcherなどのマッチングアルゴリズムから使用
   */
  static evaluateCandidate(
    staff: Staff_スタッフ,
    role: Role_係,
    timeSlot: TimeSlot_時間帯
  ): StaffAssignmentEvaluation_スタッフ配置評価 {
    const result = this.evaluateCore(staff, role, timeSlot);
    return new StaffAssignmentEvaluation_スタッフ配置評価({
      ...result,
      assignmentId: '', // 配置前なのでID未定
    });
  }

  /** 評価の共通ロジック */
  private static evaluateCore(
    staff: Staff_スタッフ,
    role: Role_係,
    timeSlot: TimeSlot_時間帯
  ): Omit<StaffAssignmentEvaluationState, 'assignmentId'> {
    const issues: string[] = [];

    // 1. 時間帯の参加可否
    const isAvailable = staff.isAvailableAt(timeSlot.id);
    if (!isAvailable) {
      issues.push('この時間帯に参加できません');
    }

    // 2. 発表との重複チェック
    const hasPresentationConflict = staff.hasPresentationAt(timeSlot.date, timeSlot.period);
    if (hasPresentationConflict) {
      issues.push('発表と時間が重複しています');
    }

    // 3. 係の要件チェック
    const meetsRequirements = staff.meetsRoleRequirements(role);
    if (!meetsRequirements) {
      issues.push('係の要件を満たしていません');
    }

    // 4. 希望係かどうか
    const preferredRoleIndex = staff.state.preferredRoles.indexOf(role.id);
    const isPreferredRole = preferredRoleIndex !== -1;
    const preferredRoleRank = isPreferredRole ? preferredRoleIndex + 1 : null;

    // 5. スキルマッチング詳細
    const skillMatches = this.evaluateSkillMatches(staff, role);

    // 6. 適性スコア計算
    const roleFitScore = staff.calculateRoleFitScore(role);

    // 7. 総合スコア計算
    let totalScore = roleFitScore;
    if (isPreferredRole) {
      // 第1希望は+5、第2希望は+3、第3希望以降は+1
      totalScore += preferredRoleRank === 1 ? 5 : preferredRoleRank === 2 ? 3 : 1;
    }
    if (!isAvailable) totalScore -= 20;
    if (hasPresentationConflict) totalScore -= 20;
    if (!meetsRequirements) totalScore -= 10;

    return {
      staffId: staff.id,
      timeSlotId: timeSlot.id,
      roleId: role.id,
      isAvailable,
      meetsRequirements,
      isPreferredRole,
      preferredRoleRank,
      hasPresentationConflict,
      skillMatches,
      roleFitScore,
      totalScore,
      issues,
    };
  }

  /** スキルマッチングを評価 */
  private static evaluateSkillMatches(
    staff: Staff_スタッフ,
    role: Role_係
  ): SkillMatchDetail[] {
    const matches: SkillMatchDetail[] = [];
    const req = role.requirements;
    const skills = staff.skills;

    // PCスキル
    const pcRequired = req.minPcSkill ?? 'none';
    const pcDiff =
      Role_係.skillLevelToNumber(skills.pc) -
      Role_係.skillLevelToNumber(pcRequired === 'none' ? 'none' : pcRequired);
    matches.push({
      skillName: 'PC',
      required: pcRequired,
      staffHas: skills.pc,
      isMatch: pcDiff >= 0,
      scoreDiff: pcDiff,
    });

    // Zoomスキル
    const zoomRequired = req.minZoomSkill ?? 'none';
    const zoomDiff =
      Role_係.skillLevelToNumber(skills.zoom) -
      Role_係.skillLevelToNumber(zoomRequired === 'none' ? 'none' : zoomRequired);
    matches.push({
      skillName: 'Zoom',
      required: zoomRequired,
      staffHas: skills.zoom,
      isMatch: zoomDiff >= 0,
      scoreDiff: zoomDiff,
    });

    // 英語スキル
    const englishRequired = req.requireEnglish ? 'any' : 'none';
    const englishMatch = !req.requireEnglish || skills.english === 'daily_conversation';
    matches.push({
      skillName: '英語',
      required: englishRequired,
      staffHas: skills.english === 'daily_conversation' ? '日常会話' : 'なし',
      isMatch: englishMatch,
      scoreDiff: skills.english === 'daily_conversation' ? 2 : 0,
    });

    // イベント経験
    const expRequired = req.requireEventExperience ? 'any' : 'none';
    const expMatch = !req.requireEventExperience || skills.eventExperience;
    matches.push({
      skillName: '経験',
      required: expRequired,
      staffHas: skills.eventExperience ? 'あり' : 'なし',
      isMatch: expMatch,
      scoreDiff: skills.eventExperience ? 2 : 0,
    });

    return matches;
  }
}
