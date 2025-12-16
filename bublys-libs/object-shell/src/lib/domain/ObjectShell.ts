import { ShellMetadata, type ShellMetadataState } from './ShellMetadata';
import { ShellHistory, type ShellHistoryNode, type ShellAction } from './ShellHistory';
import { shellEventEmitter } from './ShellEventEmitter';

/**
 * DomainEntity
 * ObjectShellで包むドメインオブジェクトは必ずidを持つ
 */
export interface DomainEntity {
  readonly id: string;
}

/**
 * ObjectShellState<T>
 * ObjectShellの内部状態を表す型
 */
export interface ObjectShellState<T extends DomainEntity> {
  domainObject: T;                          // 包まれたドメインオブジェクト
  metadata: ShellMetadata;
  historyHead: ShellHistoryNode<T> | null;  // 履歴チェーンの先頭
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
 *
 * 注意：
 * - 関連管理はBaseShellサブクラスで行います
 * - Shell自体は可変です（ドメインオブジェクトと履歴は不変）
 * - React再レンダリングはShellManager側で制御します
 */
export class ObjectShellBase<T extends DomainEntity> {
  private _internalState: ObjectShellState<T>;

  constructor(initialState: ObjectShellState<T>) {
    this._internalState = initialState;
  }

  /**
   * シェルIDを取得（ドメインオブジェクトのIDと同じ）
   */
  get id(): string {
    return this._internalState.domainObject.id;
  }

  /**
   * ドメインオブジェクトを取得
   *
   * ⚠️ 警告: このメソッドは慎重に使用してください
   * - ドメインオブジェクトを直接操作しないでください（不変性が壊れます）
   * - 読み取り専用の用途（シリアライズ、デバッグなど）に限定してください
   * - 通常はShellのメソッドやProxyを通じて操作してください
   */
  dangerouslyGetDomainObject(): T {
    return this._internalState.domainObject;
  }

  /**
   * 履歴を配列として取得（新しい順）
   */
  get history(): ShellHistoryNode<T>[] {
    return ShellHistory.getAsArray(this._internalState.historyHead);
  }

  /**
   * メタデータを取得
   */
  get metadata(): ShellMetadata {
    return this._internalState.metadata;
  }

  /**
   * 新しいObjectShellBaseを作成（ファクトリーメソッド）
   */
  static create<T extends DomainEntity>(
    domainObject: T,
    ownerId: string
  ): ObjectShellBase<T> {
    return new ObjectShellBase<T>({
      domainObject,
      metadata: ShellMetadata.create(ownerId),
      historyHead: null,  // 初期状態は履歴なし
    });
  }

  /**
   * ドメインオブジェクトを更新（in-place）
   * actionオブジェクトを指定する版
   */
  updateDomainObjectWithAction(
    newDomainObject: T,
    action: ShellAction,
    saveSnapshot = false
  ): void {
    // 履歴ノードを作成
    const newHistoryHead = ShellHistory.createNode<T>(
      this._internalState.historyHead,
      action,
      saveSnapshot ? this._internalState.domainObject : undefined
    );

    // メタデータのupdatedAtを更新
    const newMetadata = this._internalState.metadata.update({});

    // in-place更新
    this._internalState = {
      domainObject: newDomainObject,
      metadata: newMetadata,
      historyHead: newHistoryHead,
    };
  }

  /**
   * ドメインオブジェクトを更新（in-place）
   * 簡易版：actionTypeとpayloadを指定
   */
  updateDomainObject(
    newDomainObject: T,
    actionType: string,
    payload?: any,
    userId?: string,
    description?: string,
    saveSnapshot = false
  ): void {
    // 履歴ノードを作成
    const newHistoryHead = ShellHistory.createNodeSimple<T>(
      this._internalState.historyHead,
      actionType,
      payload,
      userId,
      description,
      saveSnapshot ? this._internalState.domainObject : undefined
    );

    // メタデータのupdatedAtを更新
    const newMetadata = this._internalState.metadata.update({});

    // in-place更新
    this._internalState = {
      domainObject: newDomainObject,
      metadata: newMetadata,
      historyHead: newHistoryHead,
    };

    // イベントを発火（外部リスナーに通知）
    shellEventEmitter.emit({
      shellId: this.id,
      actionType,
      domainObject: newDomainObject,
      userId: userId || 'system',
      description: description || `${actionType}を実行`,
      timestamp: Date.now(),
    });
  }

  /**
   * メタデータを更新（in-place）
   */
  updateMetadata(updates: Partial<ShellMetadataState>): void {
    this._internalState = {
      ...this._internalState,
      metadata: this._internalState.metadata.update(updates),
    };
  }

  /**
   * 履歴を更新（通常は使用しない、主にデシリアライズ時用）
   */
  updateHistory(newHistoryHead: ShellHistoryNode<T> | null): void {
    this._internalState = {
      ...this._internalState,
      historyHead: newHistoryHead,
    };
  }

  /**
   * View参照を追加（ヘルパーメソッド）
   * 注: Proxyでラップされている場合、ObjectShell<T>を返します
   */
  addViewReference(viewRef: import('./ShellMetadata').ViewReference): this {
    const newMetadata = this._internalState.metadata.addViewReference(viewRef);
    this.updateMetadata({ views: newMetadata.views });
    return this;
  }

  /**
   * View参照を削除（ヘルパーメソッド）
   * 注: Proxyでラップされている場合、ObjectShell<T>を返します
   */
  removeViewReference(viewId: string): this {
    const newMetadata = this._internalState.metadata.removeViewReference(viewId);
    this.updateMetadata({ views: newMetadata.views });
    return this;
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
      domainObject: domainObjectSerializer(this._internalState.domainObject),
      metadata: this._internalState.metadata.toJSON(),
      history: ShellHistory.toJSON(this._internalState.historyHead, snapshotSerializer),
    };
  }

  /**
   * JSONからObjectShellBaseインスタンスを作成
   */
  static fromJson<T extends DomainEntity>(
    json: any,
    domainObjectDeserializer: (data: any) => T,
    snapshotDeserializer?: (data: any) => T
  ): ObjectShellBase<T> {
    return new ObjectShellBase<T>({
      domainObject: domainObjectDeserializer(json.domainObject),
      metadata: ShellMetadata.fromJSON(json.metadata),
      historyHead: ShellHistory.fromJSON(json.history, snapshotDeserializer),
    });
  }
}

/**
 * ユーティリティ型：Shellでラップされたオブジェクト
 */
export type Shelled<T extends DomainEntity> = ObjectShellBase<T>;

/**
 * ユーティリティ関数：ドメインオブジェクトを取得
 *
 * ⚠️ 警告: このメソッドは慎重に使用してください
 * 通常はShellのメソッドやProxyを通じて操作してください
 */
export function unwrap<T extends DomainEntity>(shell: ObjectShellBase<T>): T {
  return shell.dangerouslyGetDomainObject();
}

/**
 * ユーティリティ関数：ドメインオブジェクトを取得（内部実装用）
 *
 * 注意：通常はwrap()から返されたObjectShell<T>を使用してください。
 * この関数は内部実装やテスト用です。
 */
export function wrapBase<T extends DomainEntity>(
  domainObject: T,
  ownerId: string
): ObjectShellBase<T> {
  return ObjectShellBase.create(domainObject, ownerId);
}
