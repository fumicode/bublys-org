"use client";

import { ReactNode } from "react";
import { BubbleRoute } from "@bublys-org/bubbles-ui";
import {
  SiteCollection,
  EmployeeCollection,
  MachineCollection,
  PlacementBoardGrid,
  ConstructionObjectsProvider,
} from "@bublys-org/construction-shift-puzzle-libs";
// URL スキーム（app 層で一元管理）
import "./bubbleUrls.js";

// 全バブルは統一リポジトリ（アプリ全体の世界線スコープ）にアクセスするため、
// ConstructionObjectsProvider（CASレジストリ）配下に置く。
const withObjects = (node: ReactNode) => (
  <ConstructionObjectsProvider>{node}</ConstructionObjectsProvider>
);

const SiteListBubble: BubbleRoute["Component"] = () => withObjects(<SiteCollection />);
const EmployeeListBubble: BubbleRoute["Component"] = () => withObjects(<EmployeeCollection />);
const MachineListBubble: BubbleRoute["Component"] = () => withObjects(<MachineCollection />);
const BoardBubble: BubbleRoute["Component"] = () => withObjects(<PlacementBoardGrid />);

/** このバブリのバブルルート定義 */
export const constructionShiftPuzzleBubbleRoutes: BubbleRoute[] = [
  { pattern: "construction-shift-puzzle/sites", type: "site-list", Component: SiteListBubble },
  { pattern: "construction-shift-puzzle/employees", type: "employee-list", Component: EmployeeListBubble },
  { pattern: "construction-shift-puzzle/machines", type: "machine-list", Component: MachineListBubble },
  {
    pattern: "construction-shift-puzzle/board",
    type: "placement-board",
    Component: BoardBubble,
    bubbleOptions: { defaultSize: { width: 720, height: 420 } },
  },
];
