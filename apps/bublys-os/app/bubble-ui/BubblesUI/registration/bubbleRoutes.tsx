"use client";
/**
 * **この OS で何が開けるか** ── url と、それを描く部品の対応表。
 *
 * ★ **ここは domain ではない**（2026-09-26 に `domain/` から移した）。中身は
 *   「どの url を、どの React 部品で描くか」で、ドメインの要素は 1 つも無い
 *   ── むしろ画面の部品を 20 個 import する。`domain` は何にも依存しない層なので、
 *   そこに置くと**層の名前が嘘になる**（CLAUDE.md の依存の向き）。
 * ★ 置き場所は `registration/` ── ほかのバブリ（`users-libs` / `launcher-libs` /
 *   `task-libs` / `memo-libs`）が既にそう置いている。同じものは同じ所に。
 * ★ まだ残っている宿題：登録が `BubbleRouteRegistry.registerRoutes()` 個別のまま。
 *   domain-registry に寄せて「バブリの定義 1 か所で全部」にするのが次
 *   （CLAUDE.md 残課題 2）── これは置き場所とは別の話。
 */

import { BubbleRoute, BubbleRouteRegistry, makeSnapshotRoute, makeBublyRoute, BublyUniverseBubble } from "@bublys-org/bubbles-ui";

// 外部バブリのルート
import { usersBubbleRoutes } from "@bublys-org/users-libs";
// gakkai-shiftは動的ロードに移行（プラグインテスト）
// import { gakkaiShiftBubbleRoutes } from "@bublys-org/gakkai-shift-libs";
import { taskManagementBubbleRoutes } from "@bublys-org/task-libs";
import { memoBubbleRoutes } from "@bublys-org/memo-libs";
import { csvImporterBubbleRoutes } from "@bublys-org/csv-importer-libs";
import { objectTransformerBubbleRoutes } from "@bublys-org/object-transformer-libs";
import { igoGameBubbleRoutes } from "@/app/igo-game/bubbleRoutes";
// ekikyoは動的ロードに移行（バブリテスト）
// import { ekikyoBubbleRoutes } from "@bublys-org/ekikyo-libs";

// ローカルコンポーネント
import { MobBubble } from "../ui/bubbles/MobBubble";
import { ShellBubble } from '../ui/bubbles/ShellBubble';
import { launcherBubbleRoutes } from "@bublys-org/launcher-libs";
/**
 * ★ **家具の泡は lib から借りる**（世界線・見え方の口・ポケット）。どの空間にも
 *   居てよいものなので、ここに書き下すと別の空間が同じものを持てない。
 *   ここに残すのは**この OS だけで開けるもの**。
 */
import { furnitureBubbleRoutes } from "@bublys-org/space-furniture";
import { GuideHomeBubble, GUIDE_CARD } from "@/app/guide/GuideHomeBubble";
import { GuideEntryBubble } from "@/app/guide/GuideEntryBubble";
import { GuideCard } from "@/app/guide/GuideCard";
import { BublyLoaderBubble } from "@/app/launcher/BublyLoaderBubble";
import { BublyCard, BUBLY_CARD_HEIGHT } from "@/app/launcher/BublyCard";
import { DemoSitesBubble } from "../feature/DemoSitesBubble";
import { LIST_BOX, LIST_CARD_WIDTH } from "@bublys-org/bubble-layout-feature";
import "@/app/launcher/launchTargets";

/** BubbleRouteRegistry経由でルートを検索 */
export const matchBubbleRoute = (url: string): BubbleRoute | undefined => {
  return BubbleRouteRegistry.matchRoute(url);
};

// 再帰的 universe バブル（バブルの中の universe）は lib 提供の
// {@link BublyUniverseBubble} を使う。各ルートで `initialBubbleUrls` と
// `bubbleOptions.backdropColor` を渡し分けるだけで色違いの bubly を生やせる。

// ルーティング定義
const routes: BubbleRoute[] = [
  {
    pattern: /^mob$/,
    type: "mob",
    Component: ({ bubble }) => <MobBubble bubble={bubble} />
  },

  /**
   * 説明。世界線と同じく**大きさで姿が変わる**（`GuideHomeBubble`）──
   * 岸の 48×48 ではアイコン、押すと同じ url の泡が開いて一覧を映す。
   */
  {
    pattern: /^guide$/,
    type: "guide",
    Component: GuideHomeBubble,
    /**
     * ★ **ここは地を敷く。** ほかの一覧（ユーザー・メモ・シート）は地を敷かず空間が
     *   そのまま透けるが、それはデータの一覧だから ── 説明は**読むもの**なので、
     *   透かすと文字の下に空間が出て、どこまでがこの説明か分からなくなる。
     */
    /**
     * ★ 高さは**説明の数から出す**（札 54 × 7 ＋ 隙間 4 × 6 ＋ 並びの余白 14×2 ＝ 430）。
     *   足りないと「縦に並べて収まるか」の判定に落ちて、開いた瞬間**横の魚眼**になる
     *   ── 読みものなのに 1 枚しか読めない（説明を 7 つに増やしたとき実測）。
     */
    bubbleOptions: { defaultSize: { width: 406, height: 440 } },
  },
  // ★ 札は詳細より**先に**置く（`guide/xxx` が `.../card` も飲み込むので）
  {
    pattern: /^guide\/([^/]+)\/card$/,
    type: "guide-card",
    Component: ({ bubble }) => <GuideCard entryId={bubble.url.split("/")[1] ?? ""} />,
    bubbleOptions: { defaultSize: { width: GUIDE_CARD.w, height: GUIDE_CARD.h } },
  },
  {
    pattern: /^guide\/([^/]+)$/,
    type: "guide-entry",
    Component: ({ bubble }) => <GuideEntryBubble entryId={bubble.url.split("/")[1] ?? ""} />,
    // 説明は読みもの。1 行が長くなりすぎない幅に切る
    bubbleOptions: { defaultSize: { width: 380, height: 300 } },
  },

  // 再帰的 universe（バブルの中の universe） — 素のデバッグ用
  // url: "universe" だけなら未訪問、"universe@<node>" でその node に居る。
  // 初期 seed は UniverseBubble のフォールバック ("users") が当たる。
  makeSnapshotRoute({
    base: "universe",
    type: "universe",
    Component: BublyUniverseBubble,
    // 窓の**中身**の大きさ（帯 24 のぶんは枠が外へ足す ── chrome.ts）
    bubbleOptions: { universe: true, defaultSize: { width: 420, height: 296 } },
  }),

  // ===== bubly = 1 universe バブル = 独立した世界線を持つ「アプリ境界」 =====
  // それぞれのサイドバー項目から開く想定。複数同時に開けば、それぞれ独立した
  // 世界線とアドレス（root の bubble.url が <bubly>@<nestNode>）を持つ。
  // root のブラウザ url (/<bubly>@<rootNode>) はその外側で 1 段大きく追従する。
  makeBublyRoute({
    base: "users-bubly",
    type: "users-bubly",
    Component: BublyUniverseBubble,
    initialBubbleUrls: ["users"],
    bubbleOptions: {
      universe: true,
      // ★ 中の一覧が収まる**中身**の大きさ（帯 24 のぶんは枠が外へ足す ── chrome.ts）
      //   ── 小さいと一覧の上下がはみ出して、右上の口（＋新規）が窓の外に隠れる
      defaultSize: { width: 560, height: 616 },
      backdropColor: "hsl(190, 50%, 22%)",
    },
  }),
  makeBublyRoute({
    base: "groups-bubly",
    type: "groups-bubly",
    Component: BublyUniverseBubble,
    initialBubbleUrls: ["user-groups"],
    bubbleOptions: {
      universe: true,
      // ★ 中の一覧が収まる**中身**の大きさ（帯 24 のぶんは枠が外へ足す ── chrome.ts）
      //   ── 小さいと一覧の上下がはみ出して、右上の口（＋新規）が窓の外に隠れる
      defaultSize: { width: 560, height: 616 },
      backdropColor: "hsl(270, 45%, 26%)",
    },
  }),
  makeBublyRoute({
    base: "memo-bubly",
    type: "memo-bubly",
    Component: BublyUniverseBubble,
    initialBubbleUrls: ["memos"],
    bubbleOptions: {
      universe: true,
      // ★ 中の一覧が収まる**中身**の大きさ（帯 24 のぶんは枠が外へ足す ── chrome.ts）
      //   ── 小さいと一覧の上下がはみ出して、右上の口（＋新規）が窓の外に隠れる
      defaultSize: { width: 560, height: 616 },
      backdropColor: "hsl(40, 55%, 26%)",
    },
  }),
  makeBublyRoute({
    base: "task-bubly",
    type: "task-bubly",
    Component: BublyUniverseBubble,
    initialBubbleUrls: ["task-management/tasks"],
    bubbleOptions: {
      universe: true,
      // ★ 中の一覧が収まる**中身**の大きさ（帯 24 のぶんは枠が外へ足す ── chrome.ts）
      //   ── 小さいと一覧の上下がはみ出して、右上の口（＋新規）が窓の外に隠れる
      defaultSize: { width: 560, height: 616 },
      backdropColor: "hsl(140, 45%, 22%)",
    },
  }),

  // Users（users-libsから）
  ...usersBubbleRoutes,

  // メモ（memo-libs から）
  ...memoBubbleRoutes,

  // 学会シフト（プラグインとして動的ロード）
  // ...gakkaiShiftBubbleRoutes,

  // タスク管理
  ...taskManagementBubbleRoutes,

  // 囲碁ゲーム
  ...igoGameBubbleRoutes,

  // CSV インポーター（csv-importer-libs から）
  ...csvImporterBubbleRoutes,

  // 変換エディタ（object-transformer-libs から）
  ...objectTransformerBubbleRoutes,

  // 易経（プラグインとして動的ロード）
  // ...ekikyoBubbleRoutes,

  // ObjectShell統合ルート
  {
    pattern: /^object-shells\/[^/]+\/[^/]+$/,
    type: "object-shell",
    Component: ShellBubble
  },

  // ランチャー（呼び出しを溜めるバブリ）。root では左の岸に着いている
  ...launcherBubbleRoutes,

  // 岸に貼る家具（世界線・見え方の口・ポケット）。どの空間でも同じ 3 つ
  ...furnitureBubbleRoutes,

  // 他のデモへ行く口。これも 1 つの泡 ── いつも見えていてほしいので、既定では下の岸に貼る
  {
    pattern: /^demo-sites$/,
    type: "demo-sites",
    Component: DemoSitesBubble,
    // 中身の数（chrome.ts）。岸に貼ったときの大きさ（BubblesUINext の DEMO_SITES_SIZE）と同じ
    bubbleOptions: { defaultSize: { width: 430, height: 44 }, contentBackground: "transparent" },
  },

  // バブリをオリジンからロードする（旧サイドバー下部の「バブリ」欄）
  {
    pattern: /^bubly-loader$/,
    type: "bubly-loader",
    Component: BublyLoaderBubble,
    /**
     * ★ **幅は一覧の箱に合わせる**（`LIST_BOX.width`）。中身は札 1 枚ずつのバブルなので、
     *   ほかの一覧と同じ幅でなければ札が切れる ── 286 だったころは、オリジンも
     *   「外す」も見切れていた。
     * ★ 丈は一覧の箱より少し高く ── 上に入力欄と行き先の案内が載るぶん。
     */
    bubbleOptions: { defaultSize: { width: LIST_BOX.width, height: LIST_BOX.height } },
  },

  // ロード済みのバブリ 1 つ ── バブリの一覧の中の泡
  {
    pattern: /^bublies\/[^/]+$/,
    type: "bubly-card",
    Component: ({ bubble }) => <BublyCard name={bubble.url.replace("bublies/", "")} />,
    bubbleOptions: { defaultSize: { width: LIST_CARD_WIDTH, height: BUBLY_CARD_HEIGHT } },
  },
];

export const bubbleRoutes = routes;

// 静的ルートをBubbleRouteRegistryに登録
// （動的ルートより先に登録されるため、優先される）
BubbleRouteRegistry.registerRoutes(routes);
