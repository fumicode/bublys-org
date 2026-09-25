"use client";

import { useCallback, useContext, useMemo } from "react";
import { BubbleRoute, BubblesContext, deleteProcessBubble, removeBubble, BubbleRouteRegistry, makeSnapshotRoute, makeBublyRoute, BublyUniverseBubble, WorldLinesBubble, WorldLineScopeView } from "@bublys-org/bubbles-ui";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import { LIST_BOX, LIST_CARD_WIDTH, ListSpace } from "@bublys-org/bubble-layout-feature";
import { Button } from "@mui/material";
import { useCasScope } from "@bublys-org/world-line-graph";

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
import { launcherBubbleRoutes } from "@bublys-org/launcher-libs";
import { BublyLoaderBubble } from "@/app/launcher/BublyLoaderBubble";
import { PocketBubble } from "@/app/bubble-ui/Pocket/feature/PocketBubble";
import { DemoSitesBubble } from "../feature/DemoSitesBubble";
import { SpaceViewBubble } from "@/app/bubble-ui/BubblesUI/feature/SpaceViewBubble";
import "@/app/launcher/launchTargets";
import { MemoCard } from "@/app/world-line/Memo/ui/MemoCard";
import { Memo } from "@/app/world-line/Memo/domain/Memo";
import { dispatchCreateMemo } from "@/app/world-line/Memo/feature/memoActions";
import { selectMemoIds } from "@/app/world-line/Memo/feature/memoSelectors";
import { MemoDeleteConfirm } from "@/app/world-line/Memo/feature/MemoDeleteConfirm";
import { MemoWorldLineIntegration } from "@/app/world-line/integrations/MemoWorldLineIntegration";
import { memoScopeId } from "@/app/world-line/Memo/domain/MemoDomain";

/** BubbleRouteRegistry経由でルートを検索 */
export const matchBubbleRoute = (url: string): BubbleRoute | undefined => {
  return BubbleRouteRegistry.matchRoute(url);
};

/**
 * 札 1 枚の**中身**の大きさ（`chrome.ts`）。枠が取るぶんは枠が外へ足す。
 *
 * ★ 高さは実測（中身は 46〜54px 要る）の上限 54。64 にしていたら枠の中が 30px しかなく、
 *   **札 1 枚ずつに巻物の棒が出ていた**。一覧は「全部映る」ことが意味の画面なので、
 *   1 枚ずつ巻物になるのは本末転倒。前は枠のぶん 34 を足した 88 を名乗っていた。
 */
const MEMO_CARD = { w: LIST_CARD_WIDTH, h: 54 };

/**
 * メモ一覧 ── **並びの空間**。
 *
 * 前は巻物（スクロールする行の一覧）だった。メモ 1 件を泡にして、
 * 「少ないときは縦に並べる／多いときは奥行きに重ねる」を親の View に任せる。
 */
const MemosBubble: BubbleContentRenderer = ({ bubble }) => {
  const dispatch = useAppDispatch();
  const { openBubble } = useContext(BubblesContext);
  const memoIds = useAppSelector(selectMemoIds);
  const members = useMemo(() => memoIds.map((id) => `memos/${id}/card`), [memoIds]);
  // 「新しく作る」は並びの外（泡にはならない口）。**作ったらそのまま開く**
  const newMemo = useCallback(() => {
    const memo = Memo.create();
    dispatchCreateMemo(dispatch, memo);
    openBubble(`memos/${memo.id}`, bubble.id);
  }, [dispatch, openBubble, bubble.id]);
  return (
    <ListSpace
      members={members}
      itemWidth={MEMO_CARD.w}
      itemHeight={MEMO_CARD.h}
      head={
        <Button
          size="small"
          variant="contained"
          onClick={newMemo}
          sx={{ minWidth: 0, px: 1.35, py: 0.3, fontSize: 16.5, lineHeight: 1.5 }}
        >
          ＋新規
        </Button>
      }
    />
  );
};

/** メモ 1 件の札 ── 一覧の中の泡 */
const MemoCardBubble: BubbleContentRenderer = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const memoId = bubble.url.replace("memos/", "").replace("/card", "");
  return <MemoCard memoId={memoId} onDelete={(id) => openBubble(`memos/${id}/delete-confirm`, bubble.id)} />;
};

const MemoBubble: BubbleContentRenderer = ({ bubble }) => {
  const memoId = bubble.url.replace("memos/", "");
  const { openBubble } = useContext(BubblesContext);
  const handleOpenWorldLineView = () => {
    openBubble(`memos/${memoId}/history`, bubble.id);
  };
  return (
    <MemoWorldLineIntegration
      memoId={memoId}
      onOpenWorldLineView={handleOpenWorldLineView}
      worldLineUrl={`memos/${memoId}/history`}
    />
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

// Memo の世界線を canvas で表示。click でそのノードに移動できる。
// 履歴は /history なので popChildViewPortBelow で画面下部ストリップとして開く。
const MemoWorldLinesBubble: BubbleContentRenderer = ({ bubble }) => {
  const memoId = bubble.url.replace("memos/", "").replace("/history", "");
  const scope = useCasScope(memoScopeId(memoId));
  return <WorldLineScopeView scope={scope} nameable />;
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

  // 世界線 view の標準 UI は BubbleArrangementWorldLineControls 側の overlay。
  // バブル版は opt-in（`world-lines` URL を直接 openBubble で開ける）。
  // バブル化すると自分自身が arrangement の一部になり、過去ノードに戻ると view
  // も消える挙動になる点だけ要注意。
  {
    pattern: /^world-lines$/,
    type: "world-lines",
    Component: WorldLinesBubble,
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

  // Memo
  { pattern: /^memos$/, type: "memos", Component: MemosBubble,
    // 一覧は地を敷かない ── 並びの空間は海がそのまま透ける。箱は札 280 に対して広く取る
    bubbleOptions: { defaultSize: LIST_BOX, contentBackground: "transparent" } },
  // ★ 札は詳細より**先に**置く（`memos/:id` が `.../card` も飲み込むので）
  { pattern: /^memos\/[^/]+\/card$/, type: "memo-card", Component: MemoCardBubble,
    bubbleOptions: { defaultSize: { width: MEMO_CARD.w, height: MEMO_CARD.h } } },
  { pattern: /^memos\/[^/]+\/delete-confirm$/, type: "memo-delete-confirm", Component: MemoDeleteConfirmBubble },
  { pattern: /^memos\/[^/]+\/history$/, type: "world-lines", Component: MemoWorldLinesBubble, bubbleOptions: { contentBackground: "rgba(15,18,28,0.3)" } },
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

  // ランチャー（呼び出しを溜めるバブリ）。root では左の岸に着いている
  ...launcherBubbleRoutes,

  // 見え方（開き方・ネオンの通し方・レンズの向き）。前は画面の左上に固定した帯だった
  {
    pattern: /^space-view$/,
    type: "space-view",
    Component: SpaceViewBubble,
    // 地は敷かない ── ボタンが空間の上に浮いて見える
    // 中身の数（chrome.ts）。岸に貼ったときの大きさ（BubblesUINext の SPACE_VIEW_SIZE）と同じ
    bubbleOptions: { defaultSize: { width: 436, height: 44 }, contentBackground: "transparent" },
  },

  // 他のデモへ行く口。これも 1 つの泡 ── いつも見えていてほしいので、既定では下の岸に貼る
  {
    pattern: /^demo-sites$/,
    type: "demo-sites",
    Component: DemoSitesBubble,
    // 中身の数（chrome.ts）。岸に貼ったときの大きさ（BubblesUINext の DEMO_SITES_SIZE）と同じ
    bubbleOptions: { defaultSize: { width: 430, height: 44 }, contentBackground: "transparent" },
  },

  // ポケット（オブジェクトのクリップボード）。前は画面に居座る面だったが、1 つの泡にした
  // ── いつも見えていてほしければ岸に貼る
  {
    pattern: /^pocket$/,
    type: "pocket",
    Component: PocketBubble,
    // 地は中身が持つ ── 大きいときは自分で白い箱を描き、アイコンだけのときは空間を透かす
    bubbleOptions: { defaultSize: { width: 246, height: 266 }, contentBackground: "transparent" },
  },

  // バブリをオリジンからロードする（旧サイドバー下部の「バブリ」欄）
  {
    pattern: /^bubly-loader$/,
    type: "bubly-loader",
    Component: BublyLoaderBubble,
    bubbleOptions: { defaultSize: { width: 286, height: 246 } },
  },
];

export const bubbleRoutes = routes;

// 静的ルートをBubbleRouteRegistryに登録
// （動的ルートより先に登録されるため、優先される）
BubbleRouteRegistry.registerRoutes(routes);
