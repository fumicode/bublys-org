import { Bubly, BublyContext, BublyManifest, BublyMenuItem } from "./BublyTypes.js";
import type { BubbleRoute } from "../bubble-routing/BubbleRouting.js";
import { BubbleRouteRegistry } from "../bubble-routing/BubbleRouteRegistry.js";
import { makeBublyRoute } from "../bubble-routing/makeBublyRoute.js";
import { BublyUniverseBubble } from "./BublyUniverseBubble.js";
import {
  forgetBublyOrigin,
  getSavedBublyOrigins,
  normalizeBublyOrigin,
  rememberBublyOrigin,
} from "./BublyOriginStore.js";

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
const registerBublyUniverseRoute = (bubly: Bubly): BubbleRoute => {
  const base = toBublyRouteBase(bubly.name);
  const route = makeBublyRoute({
    base,
    type: base,
    Component: BublyUniverseBubble,
    initialBubbleUrls: bubly.initialBubbleUrls ?? [],
    bubbleOptions: {
      universe: true,
      defaultSize: bubly.defaultSize ?? DEFAULT_BUBLY_WINDOW_SIZE,
      backdropColor: bubly.backdropColor,
    },
  });
  BubbleRouteRegistry.registerRoutes([route]);
  return route;
};

/**
 * ロード済みバブリの素性。OS から外すときに必要になるものを持つ。
 * ページをまたいでは残らない（復元時に作り直される）。
 */
type LoadedBublyRecord = {
  /** 取得元。サイドバーから外したときに保存済みオリジンからも消すために持つ */
  origin?: string;
  /** このバブリがロード時に登録したルート。外すときはこれだけを剥がす */
  routes: BubbleRoute[];
};

const loadedBublyRecords = new Map<string, LoadedBublyRecord>();

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
 * バンドルの再ビルドが確実に反映されるよう、毎回異なるクエリを付ける。
 * これがないとブラウザキャッシュの古い bubly.js を掴み、
 * 「再ロードしたのに変更が反映されない」が起きる。
 */
const withCacheBust = (url: string): string => {
  try {
    const parsed = new URL(url, window.location.href);
    parsed.searchParams.set("v", Date.now().toString());
    return parsed.toString();
  } catch {
    return url;
  }
};

/**
 * スクリプトを動的にロード
 */
const loadScript = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = withCacheBust(url);
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
    document.head.appendChild(script);
  });
};

/**
 * バブリコンテキストを作成
 */
const createBublyContext = (registeredRoutes: BubbleRoute[]): BublyContext => ({
  registerBubbleRoutes: (routes) => {
    BubbleRouteRegistry.registerRoutes(routes);
    registeredRoutes.push(...routes);
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

    // バブリを登録。登録されたルートは「外す」ときのために控えておく
    const registeredRoutes: BubbleRoute[] = [];
    bubly.register(createBublyContext(registeredRoutes));

    // このバブリの `<name>-bubly` universe バブルルートを自動登録
    registeredRoutes.push(registerBublyUniverseRoute(bubly));

    loadedBublyRecords.set(bubly.name, {
      origin: loadedBublyRecords.get(bubly.name)?.origin,
      routes: registeredRoutes,
    });

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
const loadingByOrigin = new Map<string, Promise<Bubly | null>>();

export const loadBublyFromOrigin = async (origin: string): Promise<Bubly | null> => {
  const normalizedOrigin = normalizeBublyOrigin(origin);

  // 同じオリジンへのロードが走っている間は、その 1 本に相乗りする。
  // dev の StrictMode では復元の effect が 2 回走り、bubly.js が二重に読まれて
  // ルートも二重登録されていた。
  const inFlight = loadingByOrigin.get(normalizedOrigin);
  if (inFlight) return inFlight;

  const loading = loadBublyOnce(normalizedOrigin);
  loadingByOrigin.set(normalizedOrigin, loading);
  try {
    return await loading;
  } finally {
    loadingByOrigin.delete(normalizedOrigin);
  }
};

/** 実際の 1 回ぶんのロード。再ロード（ビルドし直した bubly を読み直す）は毎回走る */
const loadBublyOnce = async (normalizedOrigin: string): Promise<Bubly | null> => {
  const bubly = await loadBublyFromUrl(`${normalizedOrigin}/bubly.js`);

  // ロードできたオリジンだけ覚える。次回の起動でここから復元する
  if (bubly) {
    rememberBublyOrigin(normalizedOrigin);
    const record = loadedBublyRecords.get(bubly.name);
    if (record) record.origin = normalizedOrigin;
  }

  return bubly;
};

/**
 * バブリを OS から外す。
 *
 * そのバブリが登録したルートを剥がし、保存済みオリジンからも消すので、
 * 次回の起動でも復元されない。
 *
 * すでに開いているそのバブリのバブルはその場では消えず、ルートが無くなった
 * ぶん `Unknown bubble type` として残る（閉じれば消える）。
 */
export const unloadBubly = (name: string): void => {
  const bubly = window.__BUBLYS_BUBLIES__?.[name];
  const record = loadedBublyRecords.get(name);

  if (record) {
    BubbleRouteRegistry.unregisterRoutes(record.routes);
    if (record.origin) forgetBublyOrigin(record.origin);
    loadedBublyRecords.delete(name);
  }

  bubly?.unregister?.();
  if (window.__BUBLYS_BUBLIES__) delete window.__BUBLYS_BUBLIES__[name];
};

/**
 * 前回までにロードしたバブリを復元する。
 *
 * OS 起動時、**バブルを描画する前に**呼ぶこと。ルート登録が間に合わないと
 * 永続化されたバブルが `Unknown bubble type` として描かれてしまう。
 *
 * 配信元が落ちているなどで失敗したオリジンは、保存から消さずに残す
 * （次に立ち上がっていれば復元される）。
 */
export const restoreSavedBublies = async (): Promise<Bubly[]> => {
  const origins = getSavedBublyOrigins();
  if (origins.length === 0) return [];

  const results = await Promise.all(
    origins.map(async (origin) => {
      const bubly = await loadBublyFromOrigin(origin);
      if (!bubly) {
        console.warn(`[BublyLoader] Failed to restore bubly from ${origin}`);
      }
      return bubly;
    }),
  );

  return results.filter((bubly): bubly is Bubly => bubly !== null);
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
 * バブリ 1 個 = メニュー 1 個。`<name>-bubly` の universe バブルを開く「窓」エントリ
 * （bubly.icon / label / name から派生）だけを返す。
 * バブリの中身（inner bubble）は universe の中からしか開けない。
 */
export const getAllMenuItems = (): BublyMenuItem[] =>
  Object.values(getAllBublies()).map((bubly) => ({
    label: bubly.label ?? bubly.name,
    url: toBublyRouteBase(bubly.name),
    icon: bubly.icon ?? null,
  }));
