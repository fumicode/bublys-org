"use client";

import { useContext, FC, type CSSProperties } from "react";
import { BubbleRoute, BubblesContext, deleteProcessBubble, removeBubble, BubbleRouteRegistry, UniverseView, useUniverseId } from "@bublys-org/bubbles-ui";
import { useAppDispatch } from "@bublys-org/state-management";
import { BubbleContent } from "../ui/BubbleContent";
import { useUniverseWorldLine } from "../../world-line/useUniverseWorldLine";

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

// ネスト universe の戻る/進む（universe に対して absolute 配置で重ねる）
type UniverseNav = {
  moveBack: () => void;
  moveForward: () => void;
  canUndo: boolean;
  canRedo: boolean;
};
const UniverseWorldLineToolbar: FC<UniverseNav> = ({ moveBack, moveForward, canUndo, canRedo }) => {
  const btn = (disabled: boolean): CSSProperties => ({
    border: "1px solid rgba(255,255,255,0.3)",
    borderRadius: 4,
    background: "rgba(20,22,30,0.6)",
    color: "rgba(230,235,255,0.9)",
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.3 : 1,
    padding: "2px 8px",
    fontSize: 14,
  });
  return (
    <div style={{ position: "absolute", top: 8, left: 8, zIndex: 10, display: "flex", gap: 4 }}>
      <button style={btn(!canUndo)} disabled={!canUndo} onClick={moveBack} title="戻る">←</button>
      <button style={btn(!canRedo)} disabled={!canRedo} onClick={moveForward} title="進む">→</button>
    </div>
  );
};

// 再帰的 universe バブル: バブルの中に独立した universe を描く。
// universe バブルは常にサイズ付きで開かれる（popChildMax）ので content 領域は
// 常に definite。コンテナは一律 100%×100% でバブル内側にぴったり追従する。
const UniverseBubble: BubbleContentRenderer = ({ bubble }) => {
  const parentUniverseId = useUniverseId();
  const childUniverseId = `${parentUniverseId}/${bubble.id}`;
  // この universe の現在ノードを、この universe バブルの url(`universe@<node>`)に
  // 双方向バインドする。url は親 view の一部なので、ネストの移動が親世界線
  // （→root のブラウザ url `/universe@<node>`）に再帰的に伝播する。
  const nav = useUniverseWorldLine(childUniverseId, {
    parentUniverseId,
    bubbleId: bubble.id,
    bubbleUrl: bubble.url,
  });
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <UniverseView
        universeId={childUniverseId}
        renderBubbleContent={(b) => <BubbleContent bubble={b} />}
        initialBubbleUrls={["users"]}
      />
      <UniverseWorldLineToolbar {...nav} />
    </div>
  );
};

// ルーティング定義
const routes: BubbleRoute[] = [
  {
    pattern: /^mob$/,
    type: "mob",
    Component: ({ bubble }) => <MobBubble bubble={bubble} />
  },

  // 再帰的 universe（バブルの中の universe）
  // universe は固有サイズを持たない「窓」なので fillsContainer 指定。
  // 生成時は defaultSize の窓で開き、最大化解除でこのサイズに戻る。
  // url: "universe" だけなら未訪問、"universe@<node>" でその node に居る。
  {
    pattern: /^universe(@[^/?#&]+)?$/,
    type: "universe",
    Component: UniverseBubble,
    bubbleOptions: { fillsContainer: true, defaultSize: { width: 560, height: 440 } },
  },

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
