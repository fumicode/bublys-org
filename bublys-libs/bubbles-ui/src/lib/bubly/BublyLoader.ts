import { Bubly, BublyContext, BublyManifest, BublyMenuItem } from "./BublyTypes.js";
import { BubbleRouteRegistry } from "../bubble-routing/BubbleRouteRegistry.js";
import { makeBublyRoute } from "../bubble-routing/makeBublyRoute.js";
import { BublyUniverseBubble } from "./BublyUniverseBubble.js";

/** `<name>-bubly` 形式に揃える。既に `-bubly` で終わっていればそのまま。 */
const toBublyRouteBase = (name: string): string =>
  name.endsWith("-bubly") ? name : `${name}-bubly`;

/** デフォルトの universe バブル既定サイズ */
const DEFAULT_BUBLY_WINDOW_SIZE = { width: 480, height: 360 };

/**
 * このバブリ用の `<name>-bubly` universe バブルルートを登録する。
 * BublyContext.registerBubbleRoutes ではなく BublyLoader が直接登録するので、
 * bubly 側の register 関数で書き忘れても OS にロードした時点で自動的に窓が出る。
 */
const registerBublyUniverseRoute = (bubly: Bubly): void => {
  const base = toBublyRouteBase(bubly.name);
  const route = makeBublyRoute({
    base,
    type: base,
    Component: BublyUniverseBubble,
    initialBubbleUrls: bubly.initialBubbleUrls ?? [],
    bubbleOptions: {
      fillsContainer: true,
      defaultSize: bubly.defaultSize ?? DEFAULT_BUBLY_WINDOW_SIZE,
      backdropColor: bubly.backdropColor,
    },
  });
  BubbleRouteRegistry.registerRoutes([route]);
};

/**
 * バブリを登録するAPI
 * bubly.ts から呼び出される公式API
 */
export const registerBubly = (bubly: Bubly): void => {
  // グローバルレジストリに登録
  window.__BUBLYS_BUBLIES__ = window.__BUBLYS_BUBLIES__ || {};
  window.__BUBLYS_BUBLIES__[bubly.name] = bubly;
};

/**
 * スクリプトを動的にロード
 */
const loadScript = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
    document.head.appendChild(script);
  });
};

/**
 * バブリコンテキストを作成
 */
const createBublyContext = (): BublyContext => ({
  registerBubbleRoutes: (routes) => {
    BubbleRouteRegistry.registerRoutes(routes);
  },
  injectSlice: (_slice) => {
    // sliceのinjectIntoパターンでは、インポート時に自動注入されるため、
    // 通常この関数は使われない
  },
});

/**
 * バブリをURLからロード
 */
export const loadBublyFromUrl = async (url: string): Promise<Bubly | null> => {
  try {
    await loadScript(url);

    // バブリがwindow.__BUBLYS_BUBLIES__に登録されているか確認
    const bublies = window.__BUBLYS_BUBLIES__;
    if (!bublies) {
      console.error("[BublyLoader] No bublies found in window.__BUBLYS_BUBLIES__");
      return null;
    }

    // 最後に登録されたバブリを取得
    const bublyNames = Object.keys(bublies);
    const latestBublyName = bublyNames[bublyNames.length - 1];
    const bubly = bublies[latestBublyName];

    if (!bubly) {
      console.error("[BublyLoader] Bubly not found");
      return null;
    }

    // バブリを登録
    const context = createBublyContext();
    bubly.register(context);

    // このバブリの `<name>-bubly` universe バブルルートを自動登録
    registerBublyUniverseRoute(bubly);

    return bubly;
  } catch (error) {
    console.error("[BublyLoader] Failed to load bubly:", error);
    return null;
  }
};

/**
 * オリジンからバブリをロード
 * 規約: {origin}/bubly.js
 *
 * @param origin - オリジン (例: "http://localhost:4001")
 */
export const loadBublyFromOrigin = async (origin: string): Promise<Bubly | null> => {
  // 末尾のスラッシュを除去
  const normalizedOrigin = origin.replace(/\/$/, "");
  const bublyUrl = `${normalizedOrigin}/bubly.js`;

  return loadBublyFromUrl(bublyUrl);
};

/**
 * ドメインからマニフェストを取得してバブリをロード
 * @deprecated loadBublyFromOrigin を使用してください
 */
export const loadBublyFromDomain = async (domain: string): Promise<Bubly | null> => {
  const manifestUrl = `https://${domain}/bublys-manifest.json`;

  try {
    const response = await fetch(manifestUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const manifest: BublyManifest = await response.json();

    // バブリURLを構築（相対パスの場合はドメインを付与）
    const bublyUrl = manifest.bublyUrl.startsWith("http")
      ? manifest.bublyUrl
      : `https://${domain}/${manifest.bublyUrl}`;

    return loadBublyFromUrl(bublyUrl);
  } catch (error) {
    console.error(`[BublyLoader] Failed to load manifest from ${domain}:`, error);
    return null;
  }
};

/**
 * 名前でバブリを取得
 */
export const getBubly = (name: string): Bubly | undefined => {
  return window.__BUBLYS_BUBLIES__?.[name];
};

/**
 * ロード済みのすべてのバブリを取得
 */
export const getAllBublies = (): Record<string, Bubly> => {
  return window.__BUBLYS_BUBLIES__ ?? {};
};

/**
 * ロード済みのすべてのバブリからメニュー項目を取得。
 *
 * 各バブリにつき:
 *  1. `<name>-bubly` の universe バブルを開く「窓」エントリ（bubly.icon / label / name から派生）
 *  2. レガシーの `bubly.menuItems`（任意）。inner bubble に直接行くショートカット
 * の順で並ぶ。
 */
export const getAllMenuItems = (): BublyMenuItem[] => {
  const bublies = getAllBublies();
  return Object.values(bublies).flatMap((bubly) => {
    const universeEntry: BublyMenuItem = {
      label: bubly.label ?? bubly.name,
      url: toBublyRouteBase(bubly.name),
      icon: bubly.icon ?? null,
    };
    return [universeEntry, ...(bubly.menuItems ?? [])];
  });
};
