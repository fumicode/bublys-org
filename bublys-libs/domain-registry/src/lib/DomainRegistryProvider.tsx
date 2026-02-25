'use client';

import React, { useMemo } from 'react';
import { CasProvider } from '@bublys-org/world-line-graph';
import { registerObjectType } from '@bublys-org/bubbles-ui';
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
