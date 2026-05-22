"use client";

import { useEffect } from 'react';
import { FocusedObjectProvider } from "./world-line/WorldLine/domain/FocusedObjectContext";
import { BubblesUI } from "./bubble-ui/BubblesUI/feature/BubblesUI";
import { ShellManagerProvider } from "@bublys-org/object-shell";
import { DomainRegistryProvider } from "@bublys-org/domain-registry";
import { registerShellTypes } from "./counter/registerShellTypes";
import { BUBBLE_VIEW_DOMAIN } from "./bubble-ui/world-line/bubbleViewDomain";

export default function Index() {
  // 型レジストリの初期化
  useEffect(() => {
    registerShellTypes();
  }, []);

  return (
    <FocusedObjectProvider>
      <ShellManagerProvider>
        <DomainRegistryProvider registry={BUBBLE_VIEW_DOMAIN}>
          <BubblesUI />
        </DomainRegistryProvider>
      </ShellManagerProvider>
    </FocusedObjectProvider>
  );
}
