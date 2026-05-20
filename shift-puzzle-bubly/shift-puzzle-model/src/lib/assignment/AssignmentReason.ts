/**
 * 配置理由ドメインモデル
 * 「なぜこの人をここに配置したか」を構造化して記録する新コアコンセプト
 * gakkai-shiftには存在しなかった新規追加
 */

// ========== 型定義 ==========

/** 配置理由のカテゴリ */
export type ReasonCategory =
  | 'skill_match'    // スキル適合（「PC操作が得意なため」）
  | 'training'       // 育成目的（「経験を積ませたい」）
  | 'compatibility'  // 相性考慮（「Aさんと組むと機能する」）
  | 'availability'   // 空き時間調整（「この時間帯しか空いていない」）
  | 'other';         // その他

/** 配置理由の状態 */
export interface AssignmentReasonState {
  readonly category: ReasonCategory;
  readonly text: string;      // 自由記述（空でもよい）
  readonly createdBy: string; // 記録者名
  readonly createdAt: string; // ISO 8601
}

// ========== ドメインクラス ==========

export class AssignmentReason {
  constructor(readonly state: AssignmentReasonState) {}

  get category(): ReasonCategory {
    return this.state.category;
  }

  get text(): string {
    return this.state.text;
  }

  get createdBy(): string {
    return this.state.createdBy;
  }

  get createdAt(): string {
    return this.state.createdAt;
  }

  /** カテゴリの日本語ラベルを取得 */
  get categoryLabel(): string {
    return AssignmentReason.getCategoryLabel(this.state.category);
  }

  /** テキストを更新 */
  withText(text: string): AssignmentReason {
    return new AssignmentReason({ ...this.state, text });
  }

  /** カテゴリを変更 */
  withCategory(category: ReasonCategory): AssignmentReason {
    return new AssignmentReason({ ...this.state, category });
  }

  // ========== 静的メソッド ==========

  /** カテゴリの日本語ラベルを取得 */
  static getCategoryLabel(category: ReasonCategory): string {
    const labels: Record<ReasonCategory, string> = {
      skill_match: 'スキル適合',
      training: '育成目的',
      compatibility: '相性考慮',
      availability: '空き時間調整',
      other: 'その他',
    };
    return labels[category];
  }

  /** 全カテゴリの一覧 */
  static getAllCategories(): ReasonCategory[] {
    return ['skill_match', 'training', 'compatibility', 'availability', 'other'];
  }

  /** 新しい配置理由を作成 */
  static create(
    category: ReasonCategory,
    createdBy: string,
    text = ''
  ): AssignmentReason {
    return new AssignmentReason({
      category,
      text,
      createdBy,
      createdAt: new Date().toISOString(),
    });
  }
}
