/**
 * 役割ドメインモデル
 * gakkai-shiftのRole_係を汎用化:
 *   - 必要人数を範囲（minRequired / maxRequired）に変更
 *   - color（ガントチャート表示色）追加
 *   - requiredSkills を SkillDefinition.id 参照に変更
 */

// ========== 型定義 ==========

/** 役割の状態 */
export interface RoleState {
  readonly id: string;
  readonly name: string;                          // 例: "受付係", "司会"
  readonly description: string;
  readonly requiredSkillIds: ReadonlyArray<string>; // 必須スキル（SkillDefinition.id参照）
  readonly minRequired: number;                   // 最小必要人数（時間帯ごとに上書き可能）
  readonly maxRequired: number | null;            // 最大必要人数（null = 上限なし）
  readonly color: string;                         // ガントチャートの配置ブロック色（CSS色値）
  readonly eventId: string;
}

/** Redux/JSON用のシリアライズ型 */
export type RoleJSON = {
  id: string;
  name: string;
  description: string;
  requiredSkillIds: string[];
  minRequired: number;
  maxRequired: number | null;
  color: string;
  eventId: string;
};

// ========== ドメインクラス ==========

export class Role {
  constructor(readonly state: RoleState) {}

  get id(): string {
    return this.state.id;
  }

  get name(): string {
    return this.state.name;
  }

  get description(): string {
    return this.state.description;
  }

  get requiredSkillIds(): ReadonlyArray<string> {
    return this.state.requiredSkillIds;
  }

  get minRequired(): number {
    return this.state.minRequired;
  }

  get maxRequired(): number | null {
    return this.state.maxRequired;
  }

  get color(): string {
    return this.state.color;
  }

  get eventId(): string {
    return this.state.eventId;
  }

  /** 指定スキルがこの役割に必要かどうか */
  requiresSkill(skillId: string): boolean {
    return this.state.requiredSkillIds.includes(skillId);
  }

  /** 配置人数が充足条件を満たすかどうか */
  isFulfilled(assignedCount: number): boolean {
    return assignedCount >= this.state.minRequired;
  }

  /** 配置人数が上限を超えているかどうか */
  isOverFilled(assignedCount: number): boolean {
    return this.state.maxRequired !== null && assignedCount > this.state.maxRequired;
  }

  // Roleはマスターデータのため、更新メソッドは最小限

  toJSON(): RoleJSON {
    return {
      id: this.state.id,
      name: this.state.name,
      description: this.state.description,
      requiredSkillIds: [...this.state.requiredSkillIds],
      minRequired: this.state.minRequired,
      maxRequired: this.state.maxRequired,
      color: this.state.color,
      eventId: this.state.eventId,
    };
  }

  static fromJSON(json: RoleJSON): Role {
    return new Role(json);
  }

  /** 新しい役割を作成 */
  static create(
    data: Pick<RoleState, 'name' | 'eventId'> &
      Partial<Pick<RoleState, 'description' | 'requiredSkillIds' | 'minRequired' | 'maxRequired' | 'color'>>
  ): Role {
    return new Role({
      id: crypto.randomUUID(),
      name: data.name,
      description: data.description ?? '',
      requiredSkillIds: data.requiredSkillIds ?? [],
      minRequired: data.minRequired ?? 1,
      maxRequired: data.maxRequired ?? null,
      color: data.color ?? '#6366f1',
      eventId: data.eventId,
    });
  }
}
