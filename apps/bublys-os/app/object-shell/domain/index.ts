/**
 * Object Shell Domain Layer
 *
 * オブジェクトシェルのドメイン層をエクスポート
 * すべてのコア型定義と関数をまとめて提供
 */

import { wrapBase } from './ObjectShell';
import { createObjectShell, type ObjectShell } from './ShellProxy';

// ObjectShell（Proxy版） - 推奨
export { type ObjectShell, createObjectShell } from './ShellProxy';

// ObjectShellBase（内部実装） - 通常は使用しない
export {
  ObjectShellBase,
  type ObjectShellState,
  type Shelled,
  unwrap,
  wrapBase,
} from './ObjectShell';

/**
 * ドメインオブジェクトをObjectShellでラップ（Proxy版）
 *
 * @param id - シェルID
 * @param domainObject - ドメインオブジェクト
 * @param ownerId - 所有者ID
 * @returns Proxyでラップされたシェル（ドメインメソッドを直接呼べる）
 */
export function wrap<T>(
  id: string,
  domainObject: T,
  ownerId: string
): ObjectShell<T> {
  const base = wrapBase(id, domainObject, ownerId);
  return createObjectShell(base);
}

// ShellMetadata
export {
  type ViewReference,
  type PermissionSet,
  type ShellMetadata,
  createDefaultMetadata,
  updateMetadata,
  addViewReference,
  removeViewReference,
  canRead,
  canWrite,
  serializeMetadata,
  deserializeMetadata,
} from './ShellMetadata';

// ShellRelations
export {
  type RelationReference,
  type ShellRelations,
  createDefaultRelations,
  addReference,
  removeReference,
  getReferencesByType,
  getReferencesToObject,
  addReferencedBy,
  removeReferencedBy,
  hasRelation,
  getAllRelatedIds,
  serializeRelations,
  deserializeRelations,
} from './ShellRelations';

// ShellHistory
export {
  type ShellAction,
  type ShellHistoryNode,
  type SerializedHistory,
  createHistoryNode,
  createHistoryNodeSimple,
  getHistoryLength,
  getHistoryAsArray,
  findHistoryByActionType,
  findHistoryByOperation,
  getHistorySince,
  getNthPreviousNode,
  compressHistory,
  truncateHistory,
  serializeHistory,
  deserializeHistory,
} from './ShellHistory';
