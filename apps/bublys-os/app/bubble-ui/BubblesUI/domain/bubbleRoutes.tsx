"use client";

import { useContext } from "react";
import { registerBubblePropsResolver, BubbleRoute, BubblesContext } from "@bublys-org/bubbles-ui";
import { useAppDispatch } from "@bublys-org/state-management";
import { deleteProcessBubble, removeBubble } from "@bublys-org/bubbles-ui-state";

// 外部バブリのルート
import { usersBubbleRoutes } from "@bublys-org/users-libs";
import { gakkaiShiftBubbleRoutes } from "@/app/gakkai-shift/bubbleRoutes";
import { taskManagementBubbleRoutes } from "@/app/task-management/bubbleRoutes";
import { igoGameBubbleRoutes } from "@/app/igo-game/bubbleRoutes";

// ローカルコンポーネント
import { BubbleContentRenderer } from "../ui/BubbleContentRenderer";
import { MobBubble } from "../ui/bubbles/MobBubble";
import { ShellBubble } from '../ui/bubbles/ShellBubble';
import { MemoCollection } from "@/app/world-line/Memo/ui/MemoCollection";
import { MemoDeleteConfirm } from "@/app/world-line/Memo/feature/MemoDeleteConfirm";
import { MemoWorldLineManager } from "@/app/world-line/integrations/MemoWorldLineManager";
import { MemoWorldLineIntegration } from "@/app/world-line/integrations/MemoWorldLineIntegration";

export const matchBubbleRoute = (url: string): BubbleRoute | undefined =>
  bubbleRoutes.find((route) => route.pattern.test(url));

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

// ルーティング定義
const routes: BubbleRoute[] = [
  {
    pattern: /^mob$/,
    type: "mob",
    Component: ({ bubble }) => <MobBubble bubble={bubble} />
  },

  // Users（users-libsから）
  ...usersBubbleRoutes,

  // Memo
  { pattern: /^memos$/, type: "memos", Component: MemosBubble },
  { pattern: /^memos\/[^/]+\/delete-confirm$/, type: "memo-delete-confirm", Component: MemoDeleteConfirmBubble },
  { pattern: /^memos\/[^/]+\/history$/, type: "world-lines", Component: MemoWorldLinesBubble },
  { pattern: /^memos\/[^/]+$/, type: "memo", Component: MemoBubble },

  // 学会シフト
  ...gakkaiShiftBubbleRoutes,

  // タスク管理
  ...taskManagementBubbleRoutes,

  // 囲碁ゲーム
  ...igoGameBubbleRoutes,

  // ObjectShell統合ルート
  {
    pattern: /^object-shells\/[^/]+\/[^/]+$/,
    type: "object-shell",
    Component: ShellBubble
  },
];

export const bubbleRoutes = routes;

registerBubblePropsResolver((url: string) => {
  const route = matchBubbleRoute(url);
  if (!route) return undefined;
  return {
    type: route.type,
    bubbleOptions: route.bubbleOptions,
  };
});
