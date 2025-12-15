/**
 * Object Shell Domain Layer
 *
 * オブジェクトシェルのドメイン層をエクスポート
 * すべてのコア型定義と関数をまとめて提供
 */

import { ObjectShellBase, wrapBase } from './ObjectShell';
import { createObjectShell, type ObjectShell } from './ShellProxy';

// ObjectShell（Proxy版） - 推奨API
export { type ObjectShell, createObjectShell } from './ShellProxy';

// BaseShell - 型特化Shell用の基底クラス
export { BaseShell } from './BaseShell';

// 内部実装の型のみエクスポート（ObjectShellBase自体はエクスポートしない）
export type { ObjectShellState, Shelled, DomainEntity } from './ObjectShell';

// Serializable インターフェース
export {
  type Serializable,
  type SerializableConstructor,
  isSerializable,
  hasFromJSON,
} from './Serializable';

/**
 * ドメインオブジェクトをObjectShellでラップ（Proxy版）
 *
 * @param domainObject - ドメインオブジェクト（idプロパティを持つ必要がある）
 * @param ownerId - 所有者ID
 * @returns Proxyでラップされたシェル（ドメインメソッドを直接呼べる）
 */
export function wrap<T extends import('./ObjectShell').DomainEntity>(
  domainObject: T,
  ownerId: string
): ObjectShell<T> {
  const base = wrapBase(domainObject, ownerId);
  return createObjectShell(base);
}

/**
 * JSONからObjectShellを復元
 *
 * @param json - シリアライズされたJSON
 * @param domainObjectDeserializer - ドメインオブジェクトのデシリアライザー
 * @param snapshotDeserializer - スナップショットのデシリアライザー（省略可能）
 * @returns Proxyでラップされたシェル
 */
export function fromJson<T extends import('./ObjectShell').DomainEntity>(
  json: any,
  domainObjectDeserializer: (data: any) => T,
  snapshotDeserializer?: (data: any) => T
): ObjectShell<T> {
  const base = ObjectShellBase.fromJson(
    json,
    domainObjectDeserializer,
    snapshotDeserializer
  );
  return createObjectShell(base);
}

// ShellMetadata
export {
  ShellMetadata,
  type ViewReference,
  type PermissionSet,
  type ShellMetadataState,
} from './ShellMetadata';

// ShellRelations
export {
  ShellRelations,
  type RelationReference,
  type ShellRelationsState,
} from './ShellRelations';

// ShellHistory
export {
  ShellHistory,
  type ShellAction,
  type ShellHistoryNode,
  type SerializedHistory,
} from './ShellHistory';

// ShellEventEmitter
export {
  shellEventEmitter,
  type ShellChangedEvent,
  type ShellChangeHandler,
} from './ShellEventEmitter';
