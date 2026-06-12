"use client";

import { BubbleRoute } from "@bublys-org/bubbles-ui";
import { StaffCollection, StaffDetail } from "@bublys-org/hotel-shift-puzzle-libs";

// --- スタッフ一覧バブル ---
const StaffListBubble: BubbleRoute["Component"] = () => {
  return <StaffCollection />;
};

// --- スタッフ詳細バブル ---
const StaffDetailBubble: BubbleRoute["Component"] = ({ bubble }) => {
  return <StaffDetail staffId={bubble.params.staffId} />;
};

/** このバブリのバブルルート定義 */
export const hotelShiftPuzzleBubbleRoutes: BubbleRoute[] = [
  { pattern: "hotel-shift-puzzle/staffs/:staffId", type: "staff", Component: StaffDetailBubble },
  { pattern: "hotel-shift-puzzle/staffs", type: "staff-list", Component: StaffListBubble },
];
