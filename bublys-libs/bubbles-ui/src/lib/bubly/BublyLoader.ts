import { Bubly, BublyContext, BublyManifest, BublyMenuItem } from "./BublyTypes.js";
import type { BubbleRoute } from "../bubble-routing/BubbleRouting.js";
import { BubbleRouteRegistry } from "../bubble-routing/BubbleRouteRegistry.js";
import { makeBublyRoute } from "../bubble-routing/makeBublyRoute.js";
import { BublyUniverseBubble } from "./BublyUniverseBubble.js";
import { injectedSlicePaths } from "@bublys-org/state-management";
import {
  forgetBublyOrigin,
  getSavedBublyOrigins,
  normalizeBublyOrigin,
  rememberBublyOrigin,
} from "./BublyOriginStore.js";

/** バブリ名 → そのバブリの呼び出しを溜めるランチャーの url */
export const toBublyLauncherUrl = (name: string): string => `launchers/${name}`;

/** バブリ名 → OS が自動登録する universe バブルの url（`<name>-bubly`） */
export const toBublyRouteBase = (name: string): string =>
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
    /**
     * ★ **窓の岸には、そのバブリの呼び出しを貼っておく。** 単体で開いたときに
     *   脇の帯に並んでいたものが、OS の中では岸の呼び出しになる（OS の左の岸と同じ形）。
     *   名乗りが無いバブリには貼らない ── 空の呼び出しを置いても場所を取るだけ。
     */
    ...(bubly.menuItems?.length ? { shoreUrls: [toBublyLauncherUrl(bubly.name)] } : {}),
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
  /**
   * このバブリが持ち込んだ置き場の名前（Redux の `reducerPath`）。
   *
   * 注入は**バンドルを読む最中の副作用**なので、誰が注いだかはどこにも書かれていない。
   * 読む前と後で見比べて、増えたぶんをここに控える ── 「このバブリの中身だけ
   * 片付ける」は、この一覧が無いと言えない。
   */
  slicePaths: string[];
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
 * **読み込みは 1 本ずつ。**
 *
 * 「増えたものが、いま読んだバブリ」と言えるのは、その間に**ほかが増えない**とき
 * だけ。復元は保存済みのオリジンを一斉に読むので（`restoreSavedBublies`）、
 * 並べて走らせると控えと突き合わせる相手がずれ、**別のバブリを掴む**
 * ── 実測：4 本を復元すると、取ってきた先が 3 本ぶん行方不明になった。
 * 読むのは script 1 枚ぶんなので、順に読んでも待ち時間はほとんど変わらない。
 */
let loadingChain: Promise<unknown> = Promise.resolve();

/**
 * バブリをURLからロード
 */
export const loadBublyFromUrl = async (url: string): Promise<Bubly | null> => {
  const mine = loadingChain.then(() => loadBublyFromUrlOnce(url), () => loadBublyFromUrlOnce(url));
  loadingChain = mine;
  return mine;
};

const loadBublyFromUrlOnce = async (url: string): Promise<Bubly | null> => {
  try {
    /**
     * ★ **読み込む前の顔ぶれを控える。**
     *
     *   読み込んだあと「最後に登録されたバブリ」を掴んでいたが、これは
     *   **何も登録されなかったときに、もとから居たものを掴む**
     *   ── 取りに行った先が JavaScript でなければ（相対パスとして OS 自身を叩いて
     *   404 の HTML が返る、など）script は読めてしまい（`onload` は走り、中で
     *   `Unexpected token '<'` になるだけ）、失敗が**別のバブリのロード成功**として
     *   返っていた。そのバブリのルートが二重に登録され、間違ったオリジンが覚えられる。
     *
     *   控えるのは**名前ではなく実体**。同じ名前で読み直したとき（作り直した
     *   バンドルを入れ直す）は名前が変わらないので、名前だけでは増減が分からない。
     */
    const before = new Map(Object.entries(window.__BUBLYS_BUBLIES__ ?? {}));
    // 置き場も同じやり方で見比べる（`LoadedBublyRecord.slicePaths` の註）
    const slicesBefore = new Set(injectedSlicePaths());

    await loadScript(url);

    const bublies = window.__BUBLYS_BUBLIES__;
    if (!bublies) {
      console.error("[BublyLoader] No bublies found in window.__BUBLYS_BUBLIES__");
      return null;
    }

    // 増えた／入れ替わったものが、いま読んだバブリ
    const bubly = Object.values(bublies).find((b) => before.get(b.name) !== b);

    if (!bubly) {
      console.error(
        `[BublyLoader] ${url} を読んでも、バブリは 1 つも名乗り出なかった` +
          "（取りに行った先が bubly.js ではないかもしれない）",
      );
      return null;
    }

    // バブリを登録。登録されたルートは「外す」ときのために控えておく
    const registeredRoutes: BubbleRoute[] = [];
    bubly.register(createBublyContext(registeredRoutes));

    // このバブリの `<name>-bubly` universe バブルルートを自動登録
    registeredRoutes.push(registerBublyUniverseRoute(bubly));

    const previous = loadedBublyRecords.get(bubly.name);
    const added = [...new Set(injectedSlicePaths().filter((path) => !slicesBefore.has(path)))];
    loadedBublyRecords.set(bubly.name, {
      origin: previous?.origin,
      routes: registeredRoutes,
      /**
       * 読み直し（同じバンドルを入れ直す）では置き場は増えない ── 注入は 1 度きりなので。
       * そのときは前に控えたものをそのまま持ち越す。
       */
      slicePaths: added.length > 0 ? added : previous?.slicePaths ?? [],
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
 * ロード済みのバブリ 1 つの素性 ── **どこから来たか付き**。
 *
 * `Bubly` は自分がどのオリジンから来たかを知らない（知らなくてよい）。
 * それを知っているのはロードした側（{@link loadedBublyRecords}）なので、
 * 外して直すときに要る一式は、ここで 1 つにして渡す。
 */
export type LoadedBubly = {
  name: string;
  /** 人に見せる名前（無ければ name） */
  label: string;
  version: string;
  /** 取ってきた先。復元されたものも、いまロードしたものも入る */
  origin?: string;
  /** このバブリが持ち込んだ置き場の名前（中身を片付けるときに要る） */
  slicePaths: readonly string[];
};

/** ロード済みのバブリを、取ってきた先と一緒に並べる */
export const getLoadedBublies = (): LoadedBubly[] =>
  Object.values(getAllBublies()).map((bubly) => ({
    name: bubly.name,
    label: bubly.label ?? bubly.name,
    version: bubly.version,
    origin: loadedBublyRecords.get(bubly.name)?.origin,
    slicePaths: loadedBublyRecords.get(bubly.name)?.slicePaths ?? [],
  }));

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
