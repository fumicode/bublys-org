/**
 * CounterShell
 * Counter専用の型特化Shell
 *
 * Counterは他のオブジェクトと関連を持たないため、
 * 関連管理メソッドは空実装となる。
 */

import { BaseShell, ObjectShellBase, type DomainEntity } from '@bublys-org/object-shell';
import { Counter } from './Counter';

/**
 * Counter専用Shell
 *
 * Counterは単純なドメインオブジェクトで、他のオブジェクトとの関連を持たない。
 * そのため、関連管理メソッドは空実装となる。
 *
 * @example
 * ```typescript
 * const counter = new Counter('counter-001', 0);
 * const shell = CounterShell.create(counter, 'user-001');
 *
 * // ドメインメソッドを直接呼べる
 * shell.countUp();
 * shell.countDown();
 * ```
 */
export class CounterShell extends BaseShell<Counter> {
  /**
   * 関連IDを取得（Counterは関連を持たないため空オブジェクトを返す）
   */
  protected getRelationIds(): Record<string, string[]> {
    return {}; // 関連なし
  }

  /**
   * 関連を復元（Counterは関連を持たないため何もしない）
   */
  restoreRelations(
    _shellMap: Map<string, BaseShell<any>>,
    _relationIds: Record<string, string[]>
  ): void {
    // 関連なし - 何もしない
  }

  /**
   * JSONからCounterShellを作成（デシリアライズ）
   */
  static override fromJson<T extends DomainEntity>(
    json: any,
    domainObjectDeserializer: (data: any) => T,
    snapshotDeserializer?: (data: any) => T
  ): BaseShell<T> {
    // ObjectShellBase.fromJson を呼び出して基底データを復元
    const baseShell = ObjectShellBase.fromJson(
      json,
      domainObjectDeserializer,
      snapshotDeserializer
    );

    // CounterShell インスタンスを作成（BaseShell のコンストラクタは ObjectShellBase を継承）
    const counterShell = Object.create(CounterShell.prototype);
    Object.assign(counterShell, baseShell);

    return counterShell as BaseShell<T>;
  }
}
