"use client";

import { ReactNode, useContext } from "react";
import { BubbleRoute, BubblesContext } from "@bublys-org/bubbles-ui";
import {
  SiteCollection,
  EmployeeCollection,
  MachineCollection,
  PlacementBoardGrid,
  PlacementBoardWorldLineView,
  DayView,
  ConstructionObjectsProvider,
} from "@bublys-org/construction-shift-puzzle-libs";
// URL スキーム（app 層で一元管理）
import { dayUrl, boardWorldLineUrl } from "./bubbleUrls.js";

// 全バブルは統一リポジトリ（アプリ全体の世界線スコープ）にアクセスするため、
// ConstructionObjectsProvider（CASレジストリ）配下に置く。
const withObjects = (node: ReactNode) => (
  <ConstructionObjectsProvider>{node}</ConstructionObjectsProvider>
);

const SiteListBubble: BubbleRoute["Component"] = () => withObjects(<SiteCollection />);
const EmployeeListBubble: BubbleRoute["Component"] = () => withObjects(<EmployeeCollection />);
const MachineListBubble: BubbleRoute["Component"] = () => withObjects(<MachineCollection />);

// 配置表バブル。日ヘッダのダブルクリックで、その日付セルを起点（origin-side）に
// 状態ビューを開く。日ヘッダの data-url（dayBubbleUrl）とリンクバブルがつながる。
const BoardBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  return withObjects(
    <PlacementBoardGrid
      onOpenDay={(dayKey) => openBubble(dayUrl(dayKey), bubble.id, "origin-side")}
      dayBubbleUrl={(dayKey) => dayUrl(dayKey)}
      onOpenHistory={() => openBubble(boardWorldLineUrl(), bubble.id, "bubble-side-bottom")}
    />
  );
};

// ある日の状態ビュー（現場=円・中の社員/機械・現場間距離）
const DayBubble: BubbleRoute["Component"] = ({ bubble }) =>
  withObjects(<DayView dayKey={bubble.params.dayKey} />);

// 配置表の世界線ビュー（編集履歴・時間移動）。canvas をバブルいっぱいに、半透明ダーク背景で。
const BoardWorldLineBubble: BubbleRoute["Component"] = () =>
  withObjects(<PlacementBoardWorldLineView />);

/** このバブリのバブルルート定義 */
export const constructionShiftPuzzleBubbleRoutes: BubbleRoute[] = [
  { pattern: "construction-shift-puzzle/sites", type: "site-list", Component: SiteListBubble },
  { pattern: "construction-shift-puzzle/employees", type: "employee-list", Component: EmployeeListBubble },
  { pattern: "construction-shift-puzzle/machines", type: "machine-list", Component: MachineListBubble },
  {
    pattern: "construction-shift-puzzle/days/:dayKey",
    type: "construction-day",
    Component: DayBubble,
    bubbleOptions: { defaultSize: { width: 600, height: 480 } },
  },
  {
    pattern: "construction-shift-puzzle/board/world-line",
    type: "placement-board-world-line",
    Component: BoardWorldLineBubble,
    bubbleOptions: {
      contentBackground: "rgba(15,18,28,0.3)",
      fillsContainer: true,
      defaultSize: { width: 460, height: 320 },
    },
  },
  {
    pattern: "construction-shift-puzzle/board",
    type: "placement-board",
    Component: BoardBubble,
    bubbleOptions: { defaultSize: { width: 760, height: 460 } },
  },
];
