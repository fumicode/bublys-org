"use client";

import { useEffect } from 'react';
import { FocusedObjectProvider } from "../world-line/WorldLine/domain/FocusedObjectContext";
import { BubblesUI } from "./BubblesUI/feature/BubblesUI";
import { ShellManagerProvider } from "../object-shell/feature/ShellManager";
import { registerShellTypes } from "../object-shell/setup/registerShellTypes";

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
