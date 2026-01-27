import { Bubly, BublyContext, BublyManifest, BublyMenuItem } from "./BublyTypes.js";
import { BubbleRouteRegistry } from "../bubble-routing/BubbleRouteRegistry.js";

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
  injectSlice: (slice) => {
    // sliceのinjectIntoパターンでは、インポート時に自動注入されるため、
    // 通常この関数は使われない
    console.log("[BublyLoader] injectSlice called (usually auto-injected)", slice);
  },
});

/**
 * バブリをURLからロード
 */
export const loadBublyFromUrl = async (url: string): Promise<Bubly | null> => {
  console.log(`[BublyLoader] Loading bubly from: ${url}`);

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

    console.log(`[BublyLoader] Bubly "${bubly.name}" v${bubly.version} loaded successfully`);
    return bubly;
  } catch (error) {
    console.error("[BublyLoader] Failed to load bubly:", error);
    return null;
  }
};

/**
 * ドメインからマニフェストを取得してバブリをロード
 */
export const loadBublyFromDomain = async (domain: string): Promise<Bubly | null> => {
  const manifestUrl = `https://${domain}/bublys-manifest.json`;
  console.log(`[BublyLoader] Fetching manifest from: ${manifestUrl}`);

  try {
    const response = await fetch(manifestUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const manifest: BublyManifest = await response.json();
    console.log(`[BublyLoader] Manifest loaded:`, manifest);

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
 * ロード済みのすべてのバブリからメニュー項目を取得
 */
export const getAllMenuItems = (): BublyMenuItem[] => {
  const bublies = getAllBublies();
  return Object.values(bublies).flatMap((bubly) => bubly.menuItems ?? []);
};
