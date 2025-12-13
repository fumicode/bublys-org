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
 * ShellRelations
 * オブジェクト間の関連を管理
 * ID参照のみを保持し、DDDの集約制約を守る
 */
export interface ShellRelations {
  // 他オブジェクトへのID参照
  references: RelationReference[];

  // 逆参照（誰がこのオブジェクトを参照しているか）
  // これは主にクエリ最適化のためのキャッシュ
  referencedBy: string[];
}

/**
 * デフォルトのShellRelationsを作成
 */
export function createDefaultRelations(): ShellRelations {
  return {
    references: [],
    referencedBy: [],
  };
}

/**
 * 参照を追加
 */
export function addReference(
  relations: ShellRelations,
  reference: RelationReference
): ShellRelations {
  // 重複チェック（同じtargetIdとrelationTypeの組み合わせ）
  const exists = relations.references.some(
    r => r.targetId === reference.targetId && r.relationType === reference.relationType
  );

  if (exists) {
    return relations;
  }

  return {
    ...relations,
    references: [...relations.references, reference],
  };
}

/**
 * 参照を削除
 */
export function removeReference(
  relations: ShellRelations,
  targetId: string,
  relationType?: string
): ShellRelations {
  return {
    ...relations,
    references: relations.references.filter(r => {
      if (relationType) {
        return !(r.targetId === targetId && r.relationType === relationType);
      }
      return r.targetId !== targetId;
    }),
  };
}

/**
 * 特定のタイプの参照を取得
 */
export function getReferencesByType(
  relations: ShellRelations,
  relationType: string
): RelationReference[] {
  return relations.references.filter(r => r.relationType === relationType);
}

/**
 * 特定のオブジェクトへの参照を取得
 */
export function getReferencesToObject(
  relations: ShellRelations,
  targetId: string
): RelationReference[] {
  return relations.references.filter(r => r.targetId === targetId);
}

/**
 * 逆参照を追加（referencedByリストに追加）
 */
export function addReferencedBy(
  relations: ShellRelations,
  objectId: string
): ShellRelations {
  if (relations.referencedBy.includes(objectId)) {
    return relations;
  }

  return {
    ...relations,
    referencedBy: [...relations.referencedBy, objectId],
  };
}

/**
 * 逆参照を削除
 */
export function removeReferencedBy(
  relations: ShellRelations,
  objectId: string
): ShellRelations {
  return {
    ...relations,
    referencedBy: relations.referencedBy.filter(id => id !== objectId),
  };
}

/**
 * 関連が存在するか確認
 */
export function hasRelation(
  relations: ShellRelations,
  targetId: string,
  relationType?: string
): boolean {
  if (relationType) {
    return relations.references.some(
      r => r.targetId === targetId && r.relationType === relationType
    );
  }
  return relations.references.some(r => r.targetId === targetId);
}

/**
 * すべての関連先IDを取得（重複除去）
 */
export function getAllRelatedIds(relations: ShellRelations): string[] {
  return Array.from(new Set(relations.references.map(r => r.targetId)));
}

/**
 * JSON形式に変換
 */
export function serializeRelations(relations: ShellRelations): object {
  return { ...relations };
}

/**
 * JSONからRelationsを復元
 */
export function deserializeRelations(json: any): ShellRelations {
  return {
    references: json.references || [],
    referencedBy: json.referencedBy || [],
  };
}
