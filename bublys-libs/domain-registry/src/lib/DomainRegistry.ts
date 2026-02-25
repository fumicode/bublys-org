import type { CasTypeConfig, CasRegistry } from '@bublys-org/world-line-graph';
import type { ReactNode } from 'react';

// ============================================================================
// 型定義
// ============================================================================

export interface DomainObjectConfig<T> extends CasTypeConfig<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  class: new (...args: any[]) => T;
  icon?: ReactNode;
  labelResolver?: (id: string) => string | undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DomainRegistry = Record<string, DomainObjectConfig<any>>;

// ============================================================================
// ヘルパー
// ============================================================================

/** 型推論のためのファクトリ関数 */
export function defineDomainObjects<R extends DomainRegistry>(registry: R): R {
  return registry;
}

/** DomainRegistry から CasRegistry を導出 */
export function toCasRegistry(registry: DomainRegistry): CasRegistry {
  return Object.fromEntries(
    Object.entries(registry).map(([type, config]) => [
      type,
      {
        class: config.class,
        fromJSON: config.fromJSON,
        toJSON: config.toJSON,
        getId: config.getId,
      },
    ])
  );
}
