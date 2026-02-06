import { BubbleRoute } from "../bubble-routing/BubbleRouting.js";

/**
 * バブリが提供するメニュー項目
 */
export type BublyMenuItem = {
  /** メニューのラベル */
  label: string;
  /** バブルを開くURL（文字列または関数） */
  url: string | (() => string);
  /** アイコン（React要素） */
  icon: React.ReactNode;
};

/**
 * バブリコンテキスト
 * バブリがOS機能にアクセスするためのインターフェース
 */
export type BublyContext = {
  /** バブルルートを登録 */
  registerBubbleRoutes: (routes: BubbleRoute[]) => void;
  /** Redux sliceを注入（injectIntoパターンで自動注入される場合は不要） */
  injectSlice: (slice: unknown) => void;
};

/**
 * バブリインターフェース
 */
export type Bubly = {
  /** バブリ名（識別子） */
  name: string;
  /** バージョン */
  version: string;
  /** サイドバーに表示するメニュー項目（オプション） */
  menuItems?: BublyMenuItem[];
  /** バブリ登録時に呼ばれる */
  register: (context: BublyContext) => void;
  /** バブリ解除時に呼ばれる（オプション） */
  unregister?: () => void;
};

/**
 * バブリマニフェスト
 * ドメインからバブリをロードする際に使用
 */
export type BublyManifest = {
  /** バブリ名 */
  name: string;
  /** バージョン */
  version: string;
  /** バブリJSのURL（相対パスまたは絶対URL） */
  bublyUrl: string;
  /** 説明 */
  description?: string;
  /** 作者 */
  author?: string;
};

// グローバル型定義
declare global {
  interface Window {
    __BUBLYS_BUBLIES__?: Record<string, Bubly>;
    __BUBLYS_SHARED__?: {
      React: typeof import("react");
      ReactDOM: typeof import("react-dom");
      Redux: typeof import("@reduxjs/toolkit");
      ReactRedux: typeof import("react-redux");
      styled: typeof import("styled-components");
      StateManagement: typeof import("@bublys-org/state-management");
      BubblesUI: typeof import("@bublys-org/bubbles-ui");
      MuiMaterial?: unknown;
      MuiIcons?: unknown;
      Mui?: unknown;
      Emotion?: unknown;
      [key: string]: unknown;
    };
  }
}
