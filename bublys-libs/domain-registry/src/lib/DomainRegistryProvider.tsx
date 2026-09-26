'use client';

import React, { useMemo } from 'react';
import { CasProvider } from '@bublys-org/world-line-graph';
/**
 * ★ 取りに行く先は**型の登録簿そのもの**（`@bublys-org/object-types`）。
 *   前は `bubbles-ui` から取っていたが、あちらはこちらを取り込んでいるので
 *   `bubbles-ui → domain-registry → bubbles-ui` の輪になっていた。
 */
import { registerObjectType } from '@bublys-org/object-types';
import { type DomainRegistry, toCasRegistry } from './DomainRegistry';

export function DomainRegistryProvider({
  registry,
  children,
}: {
  registry: DomainRegistry;
  children: React.ReactNode;
}) {
  const casRegistry = useMemo(() => {
    for (const [type, config] of Object.entries(registry)) {
      const opts: { icon?: React.ReactNode; labelResolver?: (id: string) => string | undefined } = {};
      if (config.icon) opts.icon = config.icon;
      if (config.labelResolver) opts.labelResolver = config.labelResolver;
      registerObjectType(type, Object.keys(opts).length > 0 ? opts : undefined);
    }
    return toCasRegistry(registry);
  }, [registry]);

  return <CasProvider registry={casRegistry}>{children}</CasProvider>;
}
