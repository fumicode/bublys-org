/**
 * RelationReference
 * 他オブジェクトへのID参照
 * DDDの集約制約を遵守：集約外へは直接参照ではなくIDのみ
 */
export interface RelationReference {
  targetId: string;                // 参照先オブジェクトのID
  relationType: string;            // 関連の種類（例：parent, dependency, reference, link）
  metadata?: Record<string, any>;  // 関連に関する追加情報（オプション）
}

/**
 * ShellRelationsState
 * 関連の状態を表すインターフェース
 */
export interface ShellRelationsState {
  // 他オブジェクトへのID参照
  references: RelationReference[];

  // 逆参照（誰がこのオブジェクトを参照しているか）
  // これは主にクエリ最適化のためのキャッシュ
  referencedBy: string[];
}

/**
 * ShellRelations
 * オブジェクト間の関連を管理するクラス
 * ID参照のみを保持し、DDDの集約制約を守る
 */
export class ShellRelations {
  constructor(private readonly state: ShellRelationsState) {}

  // Getters for accessing state properties
  get references(): RelationReference[] {
    return this.state.references;
  }

  get referencedBy(): string[] {
    return this.state.referencedBy;
  }

  /**
   * デフォルトのShellRelationsを作成
   */
  static create(): ShellRelations {
    return new ShellRelations({
      references: [],
      referencedBy: [],
    });
  }

  /**
   * 参照を追加
   */
  addReference(reference: RelationReference): ShellRelations {
    // 重複チェック（同じtargetIdとrelationTypeの組み合わせ）
    const exists = this.state.references.some(
      r => r.targetId === reference.targetId && r.relationType === reference.relationType
    );

    if (exists) {
      return this;
    }

    return new ShellRelations({
      ...this.state,
      references: [...this.state.references, reference],
    });
  }

  /**
   * 参照を削除
   */
  removeReference(targetId: string, relationType?: string): ShellRelations {
    return new ShellRelations({
      ...this.state,
      references: this.state.references.filter(r => {
        if (relationType) {
          return !(r.targetId === targetId && r.relationType === relationType);
        }
        return r.targetId !== targetId;
      }),
    });
  }

  /**
   * 特定のタイプの参照を取得
   */
  getReferencesByType(relationType: string): RelationReference[] {
    return this.state.references.filter(r => r.relationType === relationType);
  }

  /**
   * 特定のオブジェクトへの参照を取得
   */
  getReferencesToObject(targetId: string): RelationReference[] {
    return this.state.references.filter(r => r.targetId === targetId);
  }

  /**
   * 逆参照を追加（referencedByリストに追加）
   */
  addReferencedBy(objectId: string): ShellRelations {
    if (this.state.referencedBy.includes(objectId)) {
      return this;
    }

    return new ShellRelations({
      ...this.state,
      referencedBy: [...this.state.referencedBy, objectId],
    });
  }

  /**
   * 逆参照を削除
   */
  removeReferencedBy(objectId: string): ShellRelations {
    return new ShellRelations({
      ...this.state,
      referencedBy: this.state.referencedBy.filter(id => id !== objectId),
    });
  }

  /**
   * 関連が存在するか確認
   */
  hasRelation(targetId: string, relationType?: string): boolean {
    if (relationType) {
      return this.state.references.some(
        r => r.targetId === targetId && r.relationType === relationType
      );
    }
    return this.state.references.some(r => r.targetId === targetId);
  }

  /**
   * すべての関連先IDを取得（重複除去）
   */
  getAllRelatedIds(): string[] {
    return Array.from(new Set(this.state.references.map(r => r.targetId)));
  }

  /**
   * JSON形式に変換
   */
  toJSON(): ShellRelationsState {
    return { ...this.state };
  }

  /**
   * JSONからRelationsを復元
   */
  static fromJSON(json: any): ShellRelations {
    return new ShellRelations({
      references: json.references || [],
      referencedBy: json.referencedBy || [],
    });
  }
}
