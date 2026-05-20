/**
 * イベントドメインモデル
 * メンバー・役割・日程・シフト案を束ねる最上位コンテキスト
 * gakkai-shiftでは単一学会固定だったが、本モデルでは複数イベントを管理可能
 */

import { SkillDefinition, SkillDefinitionState } from './SkillDefinition.js';

// ========== 型定義 ==========

/** イベントの状態 */
export interface EventState {
  readonly id: string;
  readonly name: string;                               // 例: "第72回大学祭"
  readonly description: string;
  readonly startDate: string;                          // ISO 8601 (YYYY-MM-DD)
  readonly endDate: string;                            // ISO 8601 (YYYY-MM-DD)
  readonly timezone: string;                           // 例: "Asia/Tokyo"
  readonly skillDefinitions: ReadonlyArray<SkillDefinitionState>;
  readonly defaultSlotDuration: number;                // デフォルト時間粒度（分）
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Redux/JSON用のシリアライズ型 */
export type EventJSON = {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  timezone: string;
  skillDefinitions: SkillDefinitionState[];
  defaultSlotDuration: number;
  createdAt: string;
  updatedAt: string;
};

// ========== ドメインクラス ==========

export class Event {
  constructor(readonly state: EventState) {}

  get id(): string {
    return this.state.id;
  }

  get name(): string {
    return this.state.name;
  }

  get description(): string {
    return this.state.description;
  }

  get startDate(): string {
    return this.state.startDate;
  }

  get endDate(): string {
    return this.state.endDate;
  }

  get timezone(): string {
    return this.state.timezone;
  }

  get defaultSlotDuration(): number {
    return this.state.defaultSlotDuration;
  }

  /** スキル定義一覧を取得 */
  get skillDefinitions(): ReadonlyArray<SkillDefinition> {
    return this.state.skillDefinitions.map((s) => new SkillDefinition(s));
  }

  /** IDからスキル定義を取得 */
  getSkillDefinition(skillId: string): SkillDefinition | undefined {
    const state = this.state.skillDefinitions.find((s) => s.id === skillId);
    return state ? new SkillDefinition(state) : undefined;
  }

  /** イベントの日数を取得 */
  getDurationDays(): number {
    const start = new Date(this.state.startDate);
    const end = new Date(this.state.endDate);
    const diffMs = end.getTime() - start.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
  }

  // ========== 状態変更メソッド ==========

  /** スキル定義を追加 */
  addSkillDefinition(skill: SkillDefinition): Event {
    return this.withUpdatedState({
      skillDefinitions: [...this.state.skillDefinitions, skill.state],
    });
  }

  /** スキル定義を削除 */
  removeSkillDefinition(skillId: string): Event {
    return this.withUpdatedState({
      skillDefinitions: this.state.skillDefinitions.filter((s) => s.id !== skillId),
    });
  }

  /** イベント名を変更 */
  withName(name: string): Event {
    return this.withUpdatedState({ name });
  }

  /** デフォルト時間粒度を変更 */
  withDefaultSlotDuration(minutes: number): Event {
    return this.withUpdatedState({ defaultSlotDuration: minutes });
  }

  /** 内部用：状態更新ヘルパー */
  protected withUpdatedState(partial: Partial<EventState>): Event {
    return new Event({
      ...this.state,
      ...partial,
      updatedAt: new Date().toISOString(),
    });
  }

  // ========== シリアライズ ==========

  toJSON(): EventJSON {
    return {
      id: this.state.id,
      name: this.state.name,
      description: this.state.description,
      startDate: this.state.startDate,
      endDate: this.state.endDate,
      timezone: this.state.timezone,
      skillDefinitions: [...this.state.skillDefinitions],
      defaultSlotDuration: this.state.defaultSlotDuration,
      createdAt: this.state.createdAt,
      updatedAt: this.state.updatedAt,
    };
  }

  static fromJSON(json: EventJSON): Event {
    return new Event(json);
  }

  /** 新しいイベントを作成 */
  static create(
    data: Pick<EventState, 'name' | 'description' | 'startDate' | 'endDate'> &
      Partial<Pick<EventState, 'timezone' | 'defaultSlotDuration' | 'skillDefinitions'>>
  ): Event {
    const now = new Date().toISOString();
    return new Event({
      id: crypto.randomUUID(),
      name: data.name,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate,
      timezone: data.timezone ?? 'Asia/Tokyo',
      defaultSlotDuration: data.defaultSlotDuration ?? 30,
      skillDefinitions: data.skillDefinitions ?? [],
      createdAt: now,
      updatedAt: now,
    });
  }
}
