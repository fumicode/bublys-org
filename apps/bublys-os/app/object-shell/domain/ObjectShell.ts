import type { ShellMetadata } from './ShellMetadata';
import type { ShellRelations } from './ShellRelations';
import type { ShellHistoryNode } from './ShellHistory';
import {
  createDefaultMetadata,
  updateMetadata,
  serializeMetadata,
  deserializeMetadata,
} from './ShellMetadata';
import {
  createDefaultRelations,
  serializeRelations,
  deserializeRelations,
} from './ShellRelations';
import {
  createHistoryNode,
  createHistoryNodeSimple,
  serializeHistory,
  deserializeHistory,
  getHistoryAsArray,
  type ShellAction,
} from './ShellHistory';

/**
 * ObjectShellState<T>
 * ObjectShellの内部状態を表す型
 */
export interface ObjectShellState<T> {
  metadata: ShellMetadata;
  historyHead: ShellHistoryNode<T> | null;  // 履歴チェーンの先頭
  relations: ShellRelations;
}

/**
 * ObjectShellBase<T>
 * ドメインオブジェクトTを包むシェル構造の基底クラス（内部実装）
 *
 * 通常は ObjectShell<T>（Proxy版）を使用してください。
 * このクラスは内部実装の詳細です。
 *
 * DDDの原則を守りつつ、以下の機能を提供：
 * - 履歴管理（線形リスト）
 * - メタデータ管理（View関連、権限など）
 * - ID参照による関連管理
 */
export class ObjectShellBase<T> {
  constructor(
    readonly id: string,              // シェルの一意識別子
    readonly domainObject: T,         // 包まれたドメインオブジェクト
    readonly state: ObjectShellState<T>  // シェルの状態
  ) {}

  /**
   * 履歴を配列として取得（新しい順）
   */
  get history(): ShellHistoryNode<T>[] {
    return getHistoryAsArray(this.state.historyHead);
  }

  /**
   * メタデータを取得
   */
  get metadata(): ShellMetadata {
    return this.state.metadata;
  }

  /**
   * 関連を取得
   */
  get relations(): ShellRelations {
    return this.state.relations;
  }

  /**
   * 新しいObjectShellBaseを作成（ファクトリーメソッド）
   */
  static create<T>(
    id: string,
    domainObject: T,
    ownerId: string
  ): ObjectShellBase<T> {
    return new ObjectShellBase<T>(
      id,
      domainObject,
      {
        metadata: createDefaultMetadata(ownerId),
        historyHead: null,  // 初期状態は履歴なし
        relations: createDefaultRelations(),
      }
    );
  }

  /**
   * ドメインオブジェクトを更新（新しいシェルを返す）
   * actionオブジェクトを指定する版
   */
  updateDomainObjectWithAction(
    newDomainObject: T,
    action: ShellAction,
    saveSnapshot: boolean = false
  ): ObjectShellBase<T> {
    // 履歴ノードを作成
    const newHistoryHead = createHistoryNode<T>(
      this.state.historyHead,
      action,
      saveSnapshot ? this.domainObject : undefined
    );

    // メタデータのupdatedAtを更新
    const newMetadata = updateMetadata(this.state.metadata, {});

    return new ObjectShellBase<T>(
      this.id,
      newDomainObject,
      {
        metadata: newMetadata,
        historyHead: newHistoryHead,
        relations: this.state.relations,
      }
    );
  }

  /**
   * ドメインオブジェクトを更新（新しいシェルを返す）
   * 簡易版：actionTypeとpayloadを指定
   */
  updateDomainObject(
    newDomainObject: T,
    actionType: string,
    payload?: any,
    userId?: string,
    description?: string,
    saveSnapshot: boolean = false
  ): ObjectShellBase<T> {
    // 履歴ノードを作成
    const newHistoryHead = createHistoryNodeSimple<T>(
      this.state.historyHead,
      actionType,
      payload,
      userId,
      description,
      saveSnapshot ? this.domainObject : undefined
    );

    // メタデータのupdatedAtを更新
    const newMetadata = updateMetadata(this.state.metadata, {});

    return new ObjectShellBase<T>(
      this.id,
      newDomainObject,
      {
        metadata: newMetadata,
        historyHead: newHistoryHead,
        relations: this.state.relations,
      }
    );
  }

  /**
   * メタデータを更新
   */
  updateMetadata(updates: Partial<ShellMetadata>): ObjectShellBase<T> {
    return new ObjectShellBase<T>(
      this.id,
      this.domainObject,
      {
        ...this.state,
        metadata: updateMetadata(this.state.metadata, updates),
      }
    );
  }

  /**
   * 関連を更新
   */
  updateRelations(newRelations: ShellRelations): ObjectShellBase<T> {
    return new ObjectShellBase<T>(
      this.id,
      this.domainObject,
      {
        metadata: updateMetadata(this.state.metadata, {}),  // updatedAtを更新
        historyHead: this.state.historyHead,
        relations: newRelations,
      }
    );
  }

  /**
   * 履歴を更新（通常は使用しない、主にデシリアライズ時用）
   */
  updateHistory(newHistoryHead: ShellHistoryNode<T> | null): ObjectShellBase<T> {
    return new ObjectShellBase<T>(
      this.id,
      this.domainObject,
      {
        ...this.state,
        historyHead: newHistoryHead,
      }
    );
  }

  /**
   * JSON形式に変換
   */
  toJson(
    domainObjectSerializer: (obj: T) => any,
    snapshotSerializer?: (obj: T) => any
  ): object {
    return {
      id: this.id,
      domainObject: domainObjectSerializer(this.domainObject),
      metadata: serializeMetadata(this.state.metadata),
      history: serializeHistory(this.state.historyHead, snapshotSerializer),
      relations: serializeRelations(this.state.relations),
    };
  }

  /**
   * JSONからObjectShellBaseインスタンスを作成
   */
  static fromJson<T>(
    json: any,
    domainObjectDeserializer: (data: any) => T,
    snapshotDeserializer?: (data: any) => T
  ): ObjectShellBase<T> {
    return new ObjectShellBase<T>(
      json.id,
      domainObjectDeserializer(json.domainObject),
      {
        metadata: deserializeMetadata(json.metadata),
        historyHead: deserializeHistory(json.history, snapshotDeserializer),
        relations: deserializeRelations(json.relations),
      }
    );
  }
}

/**
 * ユーティリティ型：Shellでラップされたオブジェクト
 */
export type Shelled<T> = ObjectShellBase<T>;

/**
 * ユーティリティ関数：ドメインオブジェクトを取得
 */
export function unwrap<T>(shell: ObjectShellBase<T>): T {
  return shell.domainObject;
}

/**
 * ユーティリティ関数：ドメインオブジェクトを取得（内部実装用）
 *
 * 注意：通常はwrap()から返されたObjectShell<T>を使用してください。
 * この関数は内部実装やテスト用です。
 */
export function wrapBase<T>(
  id: string,
  domainObject: T,
  ownerId: string
): ObjectShellBase<T> {
  return ObjectShellBase.create(id, domainObject, ownerId);
}
