/**
 * Bublys Bubly Entry Point for ekikyo
 *
 * このファイルはスタンドアロンバンドルとしてビルドされ、
 * 動的にロードされるバブリとして動作する
 */

import React from "react";
import type { BubbleRoute } from "@bublys-org/bubbles-ui";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";

// Bubble Routes
import { ekikyoBubbleRoutes } from "./registration/index.js";

// バブリインターフェース
type BublyMenuItem = {
  label: string;
  url: string | (() => string);
  icon: React.ReactNode;
};

type Bubly = {
  name: string;
  version: string;
  menuItems?: BublyMenuItem[];
  register: (context: BublyContext) => void;
  unregister?: () => void;
};

type BublyContext = {
  registerBubbleRoutes: (routes: BubbleRoute[]) => void;
  injectSlice: (slice: unknown) => void;
};

const EkikyoBubly: Bubly = {
  name: "ekikyo",
  version: "0.0.1",

  menuItems: [
    {
      label: "九星盤",
      url: "ekikyo/kyuseis/五黄",
      icon: React.createElement(AutoAwesomeIcon, { color: "action" }),
    },
  ],

  register(context: BublyContext) {
    // Bubble routesを登録
    context.registerBubbleRoutes(ekikyoBubbleRoutes);
  },

  unregister() {
    // cleanup if needed
  },
};

// グローバルに登録
declare global {
  interface Window {
    __BUBLYS_BUBLIES__?: Record<string, Bubly>;
  }
}

window.__BUBLYS_BUBLIES__ = window.__BUBLYS_BUBLIES__ || {};
window.__BUBLYS_BUBLIES__["ekikyo"] = EkikyoBubly;

export default EkikyoBubly;
