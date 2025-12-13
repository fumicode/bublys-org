import { ShellMetadata, type ShellMetadataState } from './ShellMetadata';
import { ShellRelations } from './ShellRelations';
import { ShellHistory, type ShellHistoryNode, type ShellAction } from './ShellHistory';

/**
 * ObjectShellState<T>
 * ObjectShellの内部状態を表す型
 */
export interface ObjectShellState<T> {
  id: string;                               // シェルの一意識別子
  domainObject: T;                          // 包まれたドメインオブジェクト
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
  constructor(readonly state: ObjectShellState<T>) {}

  /**
   * シェルIDを取得
   */
  get id(): string {
    return this.state.id;
  }

  /**
   * 履歴を配列として取得（新しい順）
   */
  get history(): ShellHistoryNode<T>[] {
    return ShellHistory.getAsArray(this.state.historyHead);
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
    return new ObjectShellBase<T>({
      id,
      domainObject,
      metadata: ShellMetadata.create(ownerId),
      historyHead: null,  // 初期状態は履歴なし
      relations: ShellRelations.create(),
    });
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
    const newHistoryHead = ShellHistory.createNode<T>(
      this.state.historyHead,
      action,
      saveSnapshot ? this.state.domainObject : undefined
    );

    // メタデータのupdatedAtを更新
    const newMetadata = this.state.metadata.update({});

    return new ObjectShellBase<T>({
      id: this.id,
      domainObject: newDomainObject,
      metadata: newMetadata,
      historyHead: newHistoryHead,
      relations: this.state.relations,
    });
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
    const newHistoryHead = ShellHistory.createNodeSimple<T>(
      this.state.historyHead,
      actionType,
      payload,
      userId,
      description,
      saveSnapshot ? this.state.domainObject : undefined
    );

    // メタデータのupdatedAtを更新
    const newMetadata = this.state.metadata.update({});

    return new ObjectShellBase<T>({
      id: this.id,
      domainObject: newDomainObject,
      metadata: newMetadata,
      historyHead: newHistoryHead,
      relations: this.state.relations,
    });
  }

  /**
   * メタデータを更新
   */
  updateMetadata(updates: Partial<ShellMetadataState>): ObjectShellBase<T> {
    return new ObjectShellBase<T>({
      ...this.state,
      metadata: this.state.metadata.update(updates),
    });
  }

  /**
   * 関連を更新
   */
  updateRelations(newRelations: ShellRelations): ObjectShellBase<T> {
    return new ObjectShellBase<T>({
      id: this.id,
      domainObject: this.state.domainObject,
      metadata: this.state.metadata.update({}),  // updatedAtを更新
      historyHead: this.state.historyHead,
      relations: newRelations,
    });
  }

  /**
   * 履歴を更新（通常は使用しない、主にデシリアライズ時用）
   */
  updateHistory(newHistoryHead: ShellHistoryNode<T> | null): ObjectShellBase<T> {
    return new ObjectShellBase<T>({
      ...this.state,
      historyHead: newHistoryHead,
    });
  }

  /**
   * View参照を追加（ヘルパーメソッド）
   * 注: Proxyでラップされている場合、ObjectShell<T>を返します
   */
  addViewReference(viewRef: import('./ShellMetadata').ViewReference): this {
    const newMetadata = this.state.metadata.addViewReference(viewRef);
    return this.updateMetadata({ views: newMetadata.views }) as this;
  }

  /**
   * View参照を削除（ヘルパーメソッド）
   * 注: Proxyでラップされている場合、ObjectShell<T>を返します
   */
  removeViewReference(viewId: string): this {
    const newMetadata = this.state.metadata.removeViewReference(viewId);
    return this.updateMetadata({ views: newMetadata.views }) as this;
  }

  /**
   * 関連を追加（ヘルパーメソッド）
   * 注: Proxyでラップされている場合、ObjectShell<T>を返します
   */
  addRelation(reference: import('./ShellRelations').RelationReference): this {
    const newRelations = this.state.relations.addReference(reference);
    return this.updateRelations(newRelations) as this;
  }

  /**
   * 関連を削除（ヘルパーメソッド）
   * 注: Proxyでラップされている場合、ObjectShell<T>を返します
   */
  removeRelation(targetId: string, relationType?: string): this {
    const newRelations = this.state.relations.removeReference(targetId, relationType);
    return this.updateRelations(newRelations) as this;
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
      domainObject: domainObjectSerializer(this.state.domainObject),
      metadata: this.state.metadata.toJSON(),
      history: ShellHistory.toJSON(this.state.historyHead, snapshotSerializer),
      relations: this.state.relations.toJSON(),
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
    return new ObjectShellBase<T>({
      id: json.id,
      domainObject: domainObjectDeserializer(json.domainObject),
      metadata: ShellMetadata.fromJSON(json.metadata),
      historyHead: ShellHistory.fromJSON(json.history, snapshotDeserializer),
      relations: ShellRelations.fromJSON(json.relations),
    });
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
  return shell.state.domainObject;
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
