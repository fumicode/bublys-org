import { BubbleRoute } from "../bubble-routing/BubbleRouting.js";
import type { Size2 } from "@bublys-org/bubbles-ui-util";

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
  /** バブリ名（識別子）。OS にロードされたとき `<name>-bubly` 形式の universe バブル
      ルートが自動登録される。`name` が既に `-bubly` で終わっていればそのまま使う。 */
  name: string;
  /** バージョン */
  version: string;
  /** サイドバーに表示する表示名（任意。省略時は name） */
  label?: string;
  /** サイドバーに表示するアイコン（任意） */
  icon?: React.ReactNode;
  /**
   * OS が自動登録する `<name>-bubly` universe バブル内に最初に開かれるバブルの url 群。
   * 空のときは何も seed しない。
   */
  initialBubbleUrls?: string[];
  /**
   * **このバブリで開けるもの**（名前・url・アイコン）。
   *
   * ★ **名乗るのは持ち主。** 前は単体で開くときの画面（`app.tsx` / `page.tsx`）に
   *   だけ書いてあったので、**OS にロードすると誰も知らなかった** ── 窓を開いても
   *   種（`initialBubbleUrls`）しか出てこず、ほかの一覧へは辿り着けなかった。
   * ★ 出る所は 2 つ。単体なら脇の帯（`BublyApp`）、OS の中なら**その窓の岸**に
   *   貼った呼び出し（`launchers/<name>`）── どちらも同じこの 1 つを読む。
   */
  menuItems?: BublyMenuItem[];
  /**
   * **世界線に使う名前の頭。**
   *
   * 世界線に持つバブリ（囲碁・Tailor Genie など）は Redux の置き場を 1 つも使わず、
   * ぜんぶ世界線に入れる。どの世界線が自分のものかは**バブリしか知らない**
   * ── `igo-game-<対局id>` のような頭は、名乗ってもらうほかない。
   *
   * ★ 自分の名前と同じ世界線（`sekaisen-igo`）は、名乗らなくても自分のものとして数える。
   * ★ 使い道は「このバブリの中身だけ片付ける」。名乗らなければ、世界線のぶんは
   *   片付けの対象から外れる（**嘘は言わず、そう出す**）。
   */
  worldLineScopePrefixes?: string[];
  /** 自動登録される universe バブルの既定サイズ（任意） */
  defaultSize?: Size2;
  /**
   * このバブリの「夜空」色。任意の CSS color 文字列。
   * - スタンドアロン実行時（BublyApp）はメインエリア背景
   * - bublys-os にネストされたとき UniverseBubbleView シェルの色
   * 個別のバブリルートで `bubbleOptions.backdropColor` を上書きすることも可能。
   */
  backdropColor?: string;
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
