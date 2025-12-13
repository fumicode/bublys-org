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
 * ShellMetadataState
 * メタデータの状態を表すインターフェース
 */
export interface ShellMetadataState {
  views: ViewReference[];          // このオブジェクトを表示しているView一覧
  permissions: PermissionSet;      // アクセス制御情報
  tags?: string[];                 // タグやラベル
  annotations?: Record<string, any>;  // 任意のアノテーション
  createdAt: number;               // 作成時刻（Unix timestamp）
  updatedAt: number;               // 最終更新時刻（Unix timestamp）
  createdBy?: string;              // 作成者ID
}

/**
 * ShellMetadata
 * オブジェクトシェルのメタデータを管理するクラス
 * 横断的関心事（View関連付け、権限、タグなど）を不変的に管理
 */
export class ShellMetadata {
  constructor(private readonly state: ShellMetadataState) {}

  // Getters for accessing state properties
  get views(): ViewReference[] {
    return this.state.views;
  }

  get permissions(): PermissionSet {
    return this.state.permissions;
  }

  get tags(): string[] | undefined {
    return this.state.tags;
  }

  get annotations(): Record<string, any> | undefined {
    return this.state.annotations;
  }

  get createdAt(): number {
    return this.state.createdAt;
  }

  get updatedAt(): number {
    return this.state.updatedAt;
  }

  get createdBy(): string | undefined {
    return this.state.createdBy;
  }

  /**
   * デフォルトのメタデータを作成
   */
  static create(ownerId: string): ShellMetadata {
    const now = Date.now();
    return new ShellMetadata({
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
    });
  }

  /**
   * メタデータを更新（不変更新）
   */
  update(updates: Partial<ShellMetadataState>): ShellMetadata {
    return new ShellMetadata({
      ...this.state,
      ...updates,
      updatedAt: Date.now(),
    });
  }

  /**
   * View参照を追加
   */
  addViewReference(viewRef: ViewReference): ShellMetadata {
    // 重複チェック
    const exists = this.state.views.some(v => v.viewId === viewRef.viewId);
    if (exists) {
      return this;
    }

    return new ShellMetadata({
      ...this.state,
      views: [...this.state.views, viewRef],
      updatedAt: Date.now(),
    });
  }

  /**
   * View参照を削除
   */
  removeViewReference(viewId: string): ShellMetadata {
    return new ShellMetadata({
      ...this.state,
      views: this.state.views.filter(v => v.viewId !== viewId),
      updatedAt: Date.now(),
    });
  }

  /**
   * 権限確認：読み取り権限があるか
   */
  canRead(userId: string): boolean {
    if (this.state.permissions.isPublic) return true;
    if (this.state.permissions.owner === userId) return true;
    if (this.state.permissions.readers.includes(userId)) return true;
    if (this.state.permissions.writers.includes(userId)) return true;
    return false;
  }

  /**
   * 権限確認：書き込み権限があるか
   */
  canWrite(userId: string): boolean {
    if (this.state.permissions.owner === userId) return true;
    if (this.state.permissions.writers.includes(userId)) return true;
    return false;
  }

  /**
   * JSON形式に変換
   */
  toJSON(): ShellMetadataState {
    return { ...this.state };
  }

  /**
   * JSONからMetadataを復元
   */
  static fromJSON(json: any): ShellMetadata {
    return new ShellMetadata({
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
    });
  }
}
