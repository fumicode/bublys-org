/**
 * スキル定義ドメインモデル
 * gakkai-shiftでハードコードされていた pc/zoom/english を動的定義に変更
 */

// ========== 型定義 ==========

/** スキル定義の状態 */
export interface SkillDefinitionState {
  readonly id: string;
  readonly label: string;  // 表示名（例: "音響操作", "手話通訳", "英語対応"）
}

// ========== ドメインクラス ==========

export class SkillDefinition {
  constructor(readonly state: SkillDefinitionState) {}

  get id(): string {
    return this.state.id;
  }

  get label(): string {
    return this.state.label;
  }

  /** 新しいスキル定義を作成 */
  static create(label: string): SkillDefinition {
    return new SkillDefinition({
      id: crypto.randomUUID(),
      label,
    });
  }
}
