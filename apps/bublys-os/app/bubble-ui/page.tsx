"use client";

import { useEffect } from 'react';
import { FocusedObjectProvider } from "@bublys-org/bubbles-ui";
import { BubblesUI } from "./BubblesUI/feature/BubblesUI";
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
        {/*
          ★ **型の一覧が無いと、この画面は開いた瞬間に落ちる。**
            世界線の口（`BubbleArrangementWorldLineControls`）が CAS を引くので、
            親に `DomainRegistryProvider` が要る ── いまの海の画面にはあり、
            こちらには無かった（実測：`useCas must be used within a CasProvider` で真っ白）。
            渡す一覧は**同じもの**（`appDomainRegistry`）── 画面ごとに書き写さない。
        */}
        <DomainRegistryProvider registry={APP_DOMAIN_REGISTRY}>
          <BubblesUI />
        </DomainRegistryProvider>
      </ShellManagerProvider>
    </FocusedObjectProvider>
  );
}
