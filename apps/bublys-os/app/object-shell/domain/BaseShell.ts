/**
 * BaseShell
 * ObjectShellを継承し、型特化したShellを作成するための基底クラス
 *
 * 関連管理を担当：
 * - メモリ上での直接参照（ID参照ではなく）
 * - シリアライズ時にIDを抽出
 * - デシリアライズ時にIDから関連を復元
 */

import { ObjectShellBase, DomainEntity } from './ObjectShell';

/**
 * 型特化Shellの基底クラス
 *
 * サブクラスで関連を定義する例：
 * ```typescript
 * class UserShell extends BaseShell<User> {
 *   ownedTasks: TaskShell[] = []
 *   friends: UserShell[] = []
 *
 *   protected getRelationIds() {
 *     return {
 *       ownedTasks: this.ownedTasks.map(t => t.id),
 *       friends: this.friends.map(f => f.id)
 *     }
 *   }
 *
 *   restoreRelations(shellMap, relationIds) {
 *     this.ownedTasks = (relationIds.ownedTasks || [])
 *       .map(id => shellMap.get(id))
 *       .filter((s): s is TaskShell => s instanceof TaskShell)
 *   }
 * }
 * ```
 */
export abstract class BaseShell<T extends DomainEntity> extends ObjectShellBase<T> {
  /**
   * 関連のIDを取得（シリアライズ用）
   *
   * サブクラスで実装し、メモリ上の関連からIDを抽出する
   *
   * @returns 関連名 → IDの配列 のマップ
   * @example
   * ```typescript
   * protected getRelationIds() {
   *   return {
   *     ownedTasks: this.ownedTasks.map(t => t.id),
   *     friends: this.friends.map(f => f.id)
   *   }
   * }
   * ```
   */
  protected abstract getRelationIds(): Record<string, string[]>;

  /**
   * 関連を復元（デシリアライズ用）
   *
   * サブクラスで実装し、IDからメモリ上の関連を再構築する
   *
   * @param shellMap - 全Shellのマップ（ID → Shell）
   * @param relationIds - 関連名 → IDの配列 のマップ
   * @example
   * ```typescript
   * restoreRelations(shellMap, relationIds) {
   *   this.ownedTasks = (relationIds.ownedTasks || [])
   *     .map(id => shellMap.get(id))
   *     .filter((s): s is TaskShell => s instanceof TaskShell)
   * }
   * ```
   */
  abstract restoreRelations(
    shellMap: Map<string, BaseShell<any>>,
    relationIds: Record<string, string[]>
  ): void;

  /**
   * シリアライズ時に関連IDを含めてエクスポート
   *
   * サブクラスから呼び出して、ドメインデータと関連IDの両方を含めたJSONを取得
   */
  toJsonWithRelations<DomainJson, HistoryJson>(
    domainSerializer: (obj: T) => DomainJson,
    historySerializer: (obj: T) => HistoryJson
  ): {
    domainData: object;
    relationIds: Record<string, string[]>;
  } {
    return {
      domainData: this.toJson(domainSerializer, historySerializer),
      relationIds: this.getRelationIds(),
    };
  }
}
