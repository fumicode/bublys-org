/**
 * メンバードメインモデル
 * gakkai-shiftのStaff_スタッフを汎用化:
 *   - スキルを動的定義（SkillDefinition参照）に変更
 *   - tags（部門・学年等のグループラベル）追加
 *   - memo（内部メモ）追加
 */

// ========== 型定義 ==========

/** メンバーの状態 */
export interface MemberState {
  readonly id: string;
  readonly name: string;
  readonly tags: ReadonlyArray<string>;          // 部門・学年・役職等のグループラベル
  readonly skills: ReadonlyArray<string>;        // SkillDefinition.id への参照
  readonly availableSlotIds: ReadonlyArray<string>; // 参加可能な TimeSlot.id 一覧
  readonly memo: string;                         // 性格・相性等の非公式情報（シフト表には非表示）
  readonly eventId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Redux/JSON用のシリアライズ型 */
export type MemberJSON = {
  id: string;
  name: string;
  tags: string[];
  skills: string[];
  availableSlotIds: string[];
  memo: string;
  eventId: string;
  createdAt: string;
  updatedAt: string;
};

// ========== ドメインクラス ==========

export class Member {
  constructor(readonly state: MemberState) {}

  get id(): string {
    return this.state.id;
  }

  get name(): string {
    return this.state.name;
  }

  get tags(): ReadonlyArray<string> {
    return this.state.tags;
  }

  get skills(): ReadonlyArray<string> {
    return this.state.skills;
  }

  get availableSlotIds(): ReadonlyArray<string> {
    return this.state.availableSlotIds;
  }

  get memo(): string {
    return this.state.memo;
  }

  get eventId(): string {
    return this.state.eventId;
  }

  /** 指定時間帯に参加可能かどうか */
  isAvailableAt(slotId: string): boolean {
    return this.state.availableSlotIds.includes(slotId);
  }

  /** 指定スキルを持っているかどうか */
  hasSkill(skillId: string): boolean {
    return this.state.skills.includes(skillId);
  }

  /** 指定スキルをすべて持っているかどうか */
  hasAllSkills(skillIds: ReadonlyArray<string>): boolean {
    return skillIds.every((id) => this.hasSkill(id));
  }

  /** 指定タグを持っているかどうか */
  hasTag(tag: string): boolean {
    return this.state.tags.includes(tag);
  }

  // ========== 状態変更メソッド ==========

  /** スキルを追加 */
  addSkill(skillId: string): Member {
    if (this.hasSkill(skillId)) return this;
    return this.withUpdatedState({
      skills: [...this.state.skills, skillId],
    });
  }

  /** スキルを削除 */
  removeSkill(skillId: string): Member {
    return this.withUpdatedState({
      skills: this.state.skills.filter((id) => id !== skillId),
    });
  }

  /** タグを追加 */
  addTag(tag: string): Member {
    if (this.hasTag(tag)) return this;
    return this.withUpdatedState({
      tags: [...this.state.tags, tag],
    });
  }

  /** タグを削除 */
  removeTag(tag: string): Member {
    return this.withUpdatedState({
      tags: this.state.tags.filter((t) => t !== tag),
    });
  }

  /** 参加可能時間帯を設定 */
  withAvailableSlots(slotIds: ReadonlyArray<string>): Member {
    return this.withUpdatedState({ availableSlotIds: slotIds });
  }

  /** メモを更新 */
  withMemo(memo: string): Member {
    return this.withUpdatedState({ memo });
  }

  /** 名前を更新 */
  withName(name: string): Member {
    return this.withUpdatedState({ name });
  }

  /** 内部用：状態更新ヘルパー */
  protected withUpdatedState(partial: Partial<MemberState>): Member {
    return new Member({
      ...this.state,
      ...partial,
      updatedAt: new Date().toISOString(),
    });
  }

  // ========== シリアライズ ==========

  toJSON(): MemberJSON {
    return {
      id: this.state.id,
      name: this.state.name,
      tags: [...this.state.tags],
      skills: [...this.state.skills],
      availableSlotIds: [...this.state.availableSlotIds],
      memo: this.state.memo,
      eventId: this.state.eventId,
      createdAt: this.state.createdAt,
      updatedAt: this.state.updatedAt,
    };
  }

  static fromJSON(json: MemberJSON): Member {
    return new Member(json);
  }

  /** 新しいメンバーを作成 */
  static create(
    data: Pick<MemberState, 'name' | 'eventId'> &
      Partial<Pick<MemberState, 'tags' | 'skills' | 'availableSlotIds' | 'memo'>>
  ): Member {
    const now = new Date().toISOString();
    return new Member({
      id: crypto.randomUUID(),
      name: data.name,
      eventId: data.eventId,
      tags: data.tags ?? [],
      skills: data.skills ?? [],
      availableSlotIds: data.availableSlotIds ?? [],
      memo: data.memo ?? '',
      createdAt: now,
      updatedAt: now,
    });
  }
}
