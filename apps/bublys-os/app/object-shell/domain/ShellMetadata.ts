/**
 * ViewReference
 * オブジェクトを表示しているViewへの参照
 */
export interface ViewReference {
  viewId: string;                  // View識別子
  viewType: string;                // Viewの種類（例：bubble, modal, panel）
  position?: {                     // View内での位置（オプション）
    x: number;
    y: number;
    z: number;
  };
}

/**
 * PermissionSet
 * オブジェクトへのアクセス制御情報
 */
export interface PermissionSet {
  owner: string;                   // 所有者ID
  readers: string[];               // 読み取り権限を持つユーザーID一覧
  writers: string[];               // 書き込み権限を持つユーザーID一覧
  isPublic: boolean;               // 公開フラグ
}

/**
 * ShellMetadata
 * オブジェクトシェルのメタデータ
 * 横断的関心事（View関連付け、権限、タグなど）を管理
 */
export interface ShellMetadata {
  // View関連付け
  views: ViewReference[];          // このオブジェクトを表示しているView一覧

  // 権限
  permissions: PermissionSet;      // アクセス制御情報

  // タグとアノテーション
  tags?: string[];                 // タグやラベル
  annotations?: Record<string, any>;  // 任意のアノテーション

  // 作成・更新情報
  createdAt: number;               // 作成時刻（Unix timestamp）
  updatedAt: number;               // 最終更新時刻（Unix timestamp）
  createdBy?: string;              // 作成者ID
}

/**
 * ShellMetadata のデフォルト値を作成
 */
export function createDefaultMetadata(ownerId: string): ShellMetadata {
  const now = Date.now();
  return {
    views: [],
    permissions: {
      owner: ownerId,
      readers: [],
      writers: [],
      isPublic: false,
    },
    tags: [],
    annotations: {},
    createdAt: now,
    updatedAt: now,
    createdBy: ownerId,
  };
}

/**
 * Metadata を更新（不変更新）
 */
export function updateMetadata(
  metadata: ShellMetadata,
  updates: Partial<ShellMetadata>
): ShellMetadata {
  return {
    ...metadata,
    ...updates,
    updatedAt: Date.now(),
  };
}

/**
 * View参照を追加
 */
export function addViewReference(
  metadata: ShellMetadata,
  viewRef: ViewReference
): ShellMetadata {
  // 重複チェック
  const exists = metadata.views.some(v => v.viewId === viewRef.viewId);
  if (exists) {
    return metadata;
  }

  return {
    ...metadata,
    views: [...metadata.views, viewRef],
    updatedAt: Date.now(),
  };
}

/**
 * View参照を削除
 */
export function removeViewReference(
  metadata: ShellMetadata,
  viewId: string
): ShellMetadata {
  return {
    ...metadata,
    views: metadata.views.filter(v => v.viewId !== viewId),
    updatedAt: Date.now(),
  };
}

/**
 * 権限確認：読み取り権限があるか
 */
export function canRead(metadata: ShellMetadata, userId: string): boolean {
  if (metadata.permissions.isPublic) return true;
  if (metadata.permissions.owner === userId) return true;
  if (metadata.permissions.readers.includes(userId)) return true;
  if (metadata.permissions.writers.includes(userId)) return true;
  return false;
}

/**
 * 権限確認：書き込み権限があるか
 */
export function canWrite(metadata: ShellMetadata, userId: string): boolean {
  if (metadata.permissions.owner === userId) return true;
  if (metadata.permissions.writers.includes(userId)) return true;
  return false;
}

/**
 * JSON形式に変換
 */
export function serializeMetadata(metadata: ShellMetadata): object {
  return { ...metadata };
}

/**
 * JSONからMetadataを復元
 */
export function deserializeMetadata(json: any): ShellMetadata {
  return {
    views: json.views || [],
    permissions: json.permissions || {
      owner: '',
      readers: [],
      writers: [],
      isPublic: false,
    },
    tags: json.tags || [],
    annotations: json.annotations || {},
    createdAt: json.createdAt || Date.now(),
    updatedAt: json.updatedAt || Date.now(),
    createdBy: json.createdBy,
  };
}
