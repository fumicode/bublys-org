"use client";

import { useContext } from "react";
import { BubbleRoute, BubblesContext, deleteProcessBubble, removeBubble, BubbleRouteRegistry, makeSnapshotRoute, makeBublyRoute, BublyUniverseBubble, WorldLinesBubble } from "@bublys-org/bubbles-ui";
import { useAppDispatch } from "@bublys-org/state-management";

// 外部バブリのルート
import { usersBubbleRoutes } from "@bublys-org/users-libs";
// gakkai-shiftは動的ロードに移行（プラグインテスト）
// import { gakkaiShiftBubbleRoutes } from "@bublys-org/gakkai-shift-libs";
import { taskManagementBubbleRoutes } from "@/app/task-management/bubbleRoutes";
import { igoGameBubbleRoutes } from "@/app/igo-game/bubbleRoutes";
// ekikyoは動的ロードに移行（バブリテスト）
// import { ekikyoBubbleRoutes } from "@bublys-org/ekikyo-libs";

// ローカルコンポーネント
import { BubbleContentRenderer } from "../ui/BubbleContentRenderer";
import { MobBubble } from "../ui/bubbles/MobBubble";
import { ShellBubble } from '../ui/bubbles/ShellBubble';
import { MemoCollection } from "@/app/world-line/Memo/ui/MemoCollection";
import { MemoDeleteConfirm } from "@/app/world-line/Memo/feature/MemoDeleteConfirm";
import { MemoWorldLineManager } from "@/app/world-line/integrations/MemoWorldLineManager";
import { MemoWorldLineIntegration } from "@/app/world-line/integrations/MemoWorldLineIntegration";

/** BubbleRouteRegistry経由でルートを検索 */
export const matchBubbleRoute = (url: string): BubbleRoute | undefined => {
  return BubbleRouteRegistry.matchRoute(url);
};

// Memoバブルコンポーネント
const MemosBubble: BubbleContentRenderer = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const buildMemoUrl = (id: string) => `memos/${id}`;
  const buildMemoDeleteUrl = (id: string) => `memos/${id}/delete-confirm`;
  const handleMemoClick = (_id: string, detailUrl: string) => {
    openBubble(detailUrl, bubble.id);
  };
  const handleMemoDelete = (memoId: string) => {
    openBubble(buildMemoDeleteUrl(memoId), bubble.id);
  };
  return (
    <MemoCollection
      buildDetailUrl={buildMemoUrl}
      buildDeleteUrl={buildMemoDeleteUrl}
      onMemoClick={handleMemoClick}
      onMemoDelete={handleMemoDelete}
    />
  );
};

const MemoBubble: BubbleContentRenderer = ({ bubble }) => {
  const memoId = bubble.url.replace("memos/", "");
  const { openBubble } = useContext(BubblesContext);
  const handleOpenWorldLineView = () => {
    openBubble(`memos/${memoId}/history`, bubble.id);
  };
  const handleOpenAuthor = (_userId: string, url: string) => {
    openBubble(url, bubble.id);
  };

  return (
    <MemoWorldLineManager
      memoId={memoId}
      isBubbleMode={false}
      onOpenWorldLineView={handleOpenWorldLineView}
      onCloseWorldLineView={() => {}}
    >
      <MemoWorldLineIntegration memoId={memoId} onOpenAuthor={handleOpenAuthor} />
    </MemoWorldLineManager>
  );
};

const MemoDeleteConfirmBubble: BubbleContentRenderer = ({ bubble }) => {
  const dispatch = useAppDispatch();
  const memoId = bubble.url.replace("memos/", "").replace("/delete-confirm", "");

  const closeSelf = () => {
    dispatch(deleteProcessBubble(bubble.id));
    dispatch(removeBubble(bubble.id));
  };

  return (
    <MemoDeleteConfirm
      memoId={memoId}
      onDeleted={closeSelf}
      onCancel={closeSelf}
    />
  );
};

const MemoWorldLinesBubble: BubbleContentRenderer = ({ bubble }) => {
  const memoId = bubble.url.replace("memos/", "").replace("/history", "");
  const dispatch = useAppDispatch();
  const handleCloseWorldLineView = () => {
    dispatch(deleteProcessBubble(bubble.id));
    dispatch(removeBubble(bubble.id));
  };

  return (
    <MemoWorldLineManager
      memoId={memoId}
      isBubbleMode={true}
      onOpenWorldLineView={() => {}}
      onCloseWorldLineView={handleCloseWorldLineView}
    >
      <MemoWorldLineIntegration memoId={memoId} />
    </MemoWorldLineManager>
  );
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

  // いま居る universe の世界線を canvas で表示するビューバブル
  {
    pattern: /^world-lines$/,
    type: "world-lines",
    Component: WorldLinesBubble,
    bubbleOptions: { fillsContainer: true, defaultSize: { width: 640, height: 380 } },
  },

  // 再帰的 universe（バブルの中の universe） — 素のデバッグ用
  // url: "universe" だけなら未訪問、"universe@<node>" でその node に居る。
  // 初期 seed は UniverseBubble のフォールバック ("users") が当たる。
  makeSnapshotRoute({
    base: "universe",
    type: "universe",
    Component: BublyUniverseBubble,
    bubbleOptions: { fillsContainer: true, defaultSize: { width: 420, height: 320 } },
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
      fillsContainer: true,
      defaultSize: { width: 480, height: 360 },
      backdropColor: "hsl(190, 50%, 22%)",
    },
  }),
  makeBublyRoute({
    base: "groups-bubly",
    type: "groups-bubly",
    Component: BublyUniverseBubble,
    initialBubbleUrls: ["user-groups"],
    bubbleOptions: {
      fillsContainer: true,
      defaultSize: { width: 480, height: 360 },
      backdropColor: "hsl(270, 45%, 26%)",
    },
  }),
  makeBublyRoute({
    base: "memo-bubly",
    type: "memo-bubly",
    Component: BublyUniverseBubble,
    initialBubbleUrls: ["memos"],
    bubbleOptions: {
      fillsContainer: true,
      defaultSize: { width: 480, height: 360 },
      backdropColor: "hsl(40, 55%, 26%)",
    },
  }),
  makeBublyRoute({
    base: "task-bubly",
    type: "task-bubly",
    Component: BublyUniverseBubble,
    initialBubbleUrls: ["task-management/tasks"],
    bubbleOptions: {
      fillsContainer: true,
      defaultSize: { width: 480, height: 360 },
      backdropColor: "hsl(140, 45%, 22%)",
    },
  }),

  // Users（users-libsから）
  ...usersBubbleRoutes,

  // Memo
  { pattern: /^memos$/, type: "memos", Component: MemosBubble },
  { pattern: /^memos\/[^/]+\/delete-confirm$/, type: "memo-delete-confirm", Component: MemoDeleteConfirmBubble },
  { pattern: /^memos\/[^/]+\/history$/, type: "world-lines", Component: MemoWorldLinesBubble },
  { pattern: /^memos\/[^/]+$/, type: "memo", Component: MemoBubble },

  // 学会シフト（プラグインとして動的ロード）
  // ...gakkaiShiftBubbleRoutes,

  // タスク管理
  ...taskManagementBubbleRoutes,

  // 囲碁ゲーム
  ...igoGameBubbleRoutes,

  // 易経（プラグインとして動的ロード）
  // ...ekikyoBubbleRoutes,

  // ObjectShell統合ルート
  {
    pattern: /^object-shells\/[^/]+\/[^/]+$/,
    type: "object-shell",
    Component: ShellBubble
  },
];

export const bubbleRoutes = routes;

// 静的ルートをBubbleRouteRegistryに登録
// （動的ルートより先に登録されるため、優先される）
BubbleRouteRegistry.registerRoutes(routes);
