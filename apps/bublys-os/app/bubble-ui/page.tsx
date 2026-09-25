"use client";

import { useEffect } from 'react';
import { FocusedObjectProvider } from "@bublys-org/bubbles-ui";
import { BubblesUI } from "./BubblesUI/feature/BubblesUI";
import { ShellManagerProvider } from "@bublys-org/object-shell";
import { registerShellTypes } from "../counter/registerShellTypes";

export default function Index() {
  // 型レジストリの初期化
  useEffect(() => {
    registerShellTypes();
  }, []);

  return (
    <FocusedObjectProvider>
      <ShellManagerProvider>
        <BubblesUI />
      </ShellManagerProvider>
    </FocusedObjectProvider>
  );
}
