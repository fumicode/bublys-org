"use client";
/** この地図バブリで何が開けるか ── url と、それを描く部品の対応表 */
import { BubbleRoute } from "@bublys-org/bubbles-ui";
import { LIST_BOX, LIST_CARD_WIDTH, ListSpace } from "@bublys-org/bubble-layout-feature";
import { useAppSelector } from "@bublys-org/state-management";
import { useMemo } from "react";
import { MapBubble } from "../feature/MapBubble.js";
import { SpotDetail } from "../feature/SpotDetail.js";
import { SpotCard } from "../ui/SpotCard.js";
import { selectSpots } from "../slice/map-slice.js";
import { useSeedSpots } from "../feature/useSeedSpots.js";

/** 札 1 枚の大きさ（中身の数。枠が取るぶんは枠が外へ足す） */
const CARD = { w: LIST_CARD_WIDTH, h: 42 };

/** 地点の一覧 ── 地図に出ている場所を、並びとしても見られるようにする */
const SpotCollectionBubble: BubbleRoute["Component"] = () => {
  useSeedSpots();
  const spots = useAppSelector(selectSpots);
  const members = useMemo(() => spots.map((s) => `spots/${s.id}/card`), [spots]);
  return <ListSpace members={members} itemWidth={CARD.w} itemHeight={CARD.h} />;
};

export const mapBubbleRoutes: BubbleRoute[] = [
  {
    pattern: /^map$/,
    type: "map",
    Component: MapBubble,
    /**
     * ★ 地図は**広さがそのまま中身**。小さいと湖しか出ず、どこの地図か分からない。
     *   中身の数（`chrome.ts`）── 枠のぶんは枠が外へ足す。
     */
    bubbleOptions: { defaultSize: { width: 460, height: 340 }, contentBackground: "transparent" },
  },
  {
    pattern: /^spots$/,
    type: "spots",
    Component: SpotCollectionBubble,
    bubbleOptions: { defaultSize: LIST_BOX, contentBackground: "transparent" },
  },
  // ★ 札は詳細より**先に**置く（`spots/:id` が `.../card` も飲み込むので）
  {
    pattern: /^spots\/[^/]+\/card$/,
    type: "spot-card",
    Component: ({ bubble }) => {
      const id = bubble.url.replace(/^spots\//, "").replace(/\/card$/, "");
      return <SpotCardBubble spotId={id} />;
    },
    bubbleOptions: { defaultSize: { width: CARD.w, height: CARD.h } },
  },
  {
    pattern: /^spots\/[^/]+$/,
    type: "spot",
    Component: ({ bubble }) => <SpotDetail spotId={bubble.url.replace(/^spots\//, "")} />,
    bubbleOptions: { defaultSize: { width: 320, height: 240 } },
  },
];

/** 札 1 枚の泡。ID から地点を引くだけ */
const SpotCardBubble = ({ spotId }: { spotId: string }) => {
  const spot = useAppSelector(selectSpots).find((s) => s.id === spotId);
  if (!spot) return <div style={{ padding: 8, color: "#666" }}>この地点は見つかりませんでした。</div>;
  return <SpotCard spot={spot} />;
};
