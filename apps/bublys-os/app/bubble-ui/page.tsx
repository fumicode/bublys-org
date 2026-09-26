"use client";

import { useEffect } from 'react';
import { FocusedObjectProvider } from "@bublys-org/bubbles-ui";
import { BubblesUI } from "./BubblesUI/feature/BubblesUI";
import { ShellManagerProvider } from "@bublys-org/object-shell";
import { DomainRegistryProvider } from "@bublys-org/domain-registry";
import { LayoutRoutesProvider } from "@bublys-org/bubble-layout-feature";
import { bridgeRoutes } from "@bublys-org/bubble-space-shell";
import { bubbleRoutes } from "./BubblesUI/registration/bubbleRoutes";
import { registerShellTypes } from "../counter/registerShellTypes";
import { APP_DOMAIN_REGISTRY } from "../appDomainRegistry";

/**
 * **いまの中身は、ルートの一覧を配られていないと止まらなくなる。**
 *
 * 一覧の泡（`ListSpace`）は、自分の中に小さな海を作って顔ぶれを並べる。並べる相手は
 * url なので、url から札を作るためのルート一覧（`LayoutRoutesContext`）が要る
 * ── 配られていないと 1 枚も作れず、「まだ足りない」と言い続けて**書き続ける**
 * （実測：1.5 秒に 130 回 `Maximum update depth exceeded`）。
 *
 * いまの海は器（`BubbleSea`）がこれを配っている。レイヤー時代の海には配る所が無いので、
 * ここで同じものを配る（旧のルート定義に橋を架けた一覧）。
 */
const LEGACY_LAYOUT_ROUTES = bridgeRoutes(bubbleRoutes);

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
          <LayoutRoutesProvider routes={LEGACY_LAYOUT_ROUTES}>
            <BubblesUI />
          </LayoutRoutesProvider>
        </DomainRegistryProvider>
      </ShellManagerProvider>
    </FocusedObjectProvider>
  );
}
