/**
 * メンバーフィルタリングドメインモデル
 */

import { Member } from './Member.js';

// ========== 型定義 ==========

/** フィルタ条件の状態 */
export interface MemberFilterState {
  readonly availableAtSlotId?: string;            // 指定時間帯に参加可能
  readonly requiredSkillIds: ReadonlyArray<string>; // 必要スキル（AND条件）
  readonly tags: ReadonlyArray<string>;            // タグ（OR条件）
  readonly assignmentStatus?: 'unassigned' | 'assigned' | 'over_assigned'; // 配置状況
}

// ========== ドメインクラス ==========

export class MemberFilter {
  constructor(readonly state: MemberFilterState) {}

  /** フィルタ条件に一致するメンバーを抽出 */
  apply(
    members: ReadonlyArray<Member>,
    assignedCountMap?: ReadonlyMap<string, number>  // memberId → 配置数
  ): Member[] {
    return members.filter((member) => this.matches(member, assignedCountMap));
  }

  /** メンバーがフィルタ条件に一致するかどうか */
  matches(member: Member, assignedCountMap?: ReadonlyMap<string, number>): boolean {
    // 参加可能時間帯チェック
    if (
      this.state.availableAtSlotId &&
      !member.isAvailableAt(this.state.availableAtSlotId)
    ) {
      return false;
    }

    // 必要スキルチェック（AND条件）
    if (!member.hasAllSkills(this.state.requiredSkillIds)) {
      return false;
    }

    // タグチェック（OR条件: 指定タグのいずれかを持つ）
    if (
      this.state.tags.length > 0 &&
      !this.state.tags.some((tag) => member.hasTag(tag))
    ) {
      return false;
    }

    // 配置状況チェック
    if (this.state.assignmentStatus && assignedCountMap) {
      const count = assignedCountMap.get(member.id) ?? 0;
      if (this.state.assignmentStatus === 'unassigned' && count > 0) return false;
      if (this.state.assignmentStatus === 'assigned' && count === 0) return false;
      if (this.state.assignmentStatus === 'over_assigned' && count <= 1) return false;
    }

    return true;
  }

  /** フィルタ条件を変更 */
  withAvailableAtSlot(slotId: string | undefined): MemberFilter {
    return new MemberFilter({ ...this.state, availableAtSlotId: slotId });
  }

  withRequiredSkills(skillIds: ReadonlyArray<string>): MemberFilter {
    return new MemberFilter({ ...this.state, requiredSkillIds: skillIds });
  }

  withTags(tags: ReadonlyArray<string>): MemberFilter {
    return new MemberFilter({ ...this.state, tags });
  }

  withAssignmentStatus(
    status: MemberFilterState['assignmentStatus']
  ): MemberFilter {
    return new MemberFilter({ ...this.state, assignmentStatus: status });
  }

  /** 条件なしの初期フィルタを作成 */
  static empty(): MemberFilter {
    return new MemberFilter({
      requiredSkillIds: [],
      tags: [],
    });
  }
}
