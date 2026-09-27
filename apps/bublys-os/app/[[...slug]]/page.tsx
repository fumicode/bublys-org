"use client";

// optional catch-all `[[...slug]]` で / と /universe@<node> の両方を同じ SPA に流す。
// /world-line, /bubble-ui 等の specific page は Next.js の優先度ルールで先に当たる。
// slug の中身は useRootArrangementWorldLine 側で location.pathname を直接読むので
// ここでは params を使わない（client component なのと、再帰なルーティングで深いパスも
// 受けるため）。

import { useEffect } from 'react';
import { FocusedObjectProvider } from "@bublys-org/bubbles-ui";
import { BubblesUINext } from "../bubble-ui/BubblesUI/feature/BubblesUINext";
import { ShellManagerProvider } from "@bublys-org/object-shell";
import { DomainRegistryProvider } from "@bublys-org/domain-registry";
import { registerShellTypes } from "../counter/registerShellTypes";
import { APP_DOMAIN_REGISTRY } from "../appDomainRegistry";

export default function Index() {
  // 型レジストリの初期化
  useEffect(() => {
    registerShellTypes();
  }, []);

  return (
    <FocusedObjectProvider>
      <ShellManagerProvider>
        <DomainRegistryProvider registry={APP_DOMAIN_REGISTRY}>
          <BubblesUINext />
        </DomainRegistryProvider>
      </ShellManagerProvider>
    </FocusedObjectProvider>
  );
}
