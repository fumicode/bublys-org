"use client";
/** この旅程バブリで何が開けるか */
import { useMemo } from "react";
import type { BubbleRoute } from "@bublys-org/bubbles-ui";
import { LIST_BOX, LIST_CARD_WIDTH, ListSpace } from "@bublys-org/bubble-layout-feature";
import { useAppSelector } from "@bublys-org/state-management";
import { ItineraryCard } from "../ui/ItineraryCard.js";
import { ItineraryDetail } from "../feature/ItineraryDetail.js";
import { selectItineraries } from "../slice/itinerary-slice.js";
import { useSeedItinerary } from "../feature/useSeedItinerary.js";

const CARD = { w: LIST_CARD_WIDTH, h: 48 };

/** 旅程の一覧 ── 並びの空間 */
const ItineraryCollectionBubble: BubbleRoute["Component"] = () => {
  useSeedItinerary();
  const itineraries = useAppSelector(selectItineraries);
  const members = useMemo(
    () => itineraries.map((t) => `itineraries/${t.id}/card`),
    [itineraries],
  );
  return <ListSpace members={members} itemWidth={CARD.w} itemHeight={CARD.h} />;
};

const ItineraryCardBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const id = bubble.url.replace(/^itineraries\//, "").replace(/\/card$/, "");
  const itinerary = useAppSelector(selectItineraries).find((t) => t.id === id);
  if (!itinerary) return <div style={{ padding: 8, color: "#666" }}>この旅程は見つかりませんでした。</div>;
  return <ItineraryCard itinerary={itinerary} />;
};

/** 旅程の詳細 ── 撒くのもここ（ランチャーから直に開く入口なので） */
const ItineraryDetailBubble: BubbleRoute["Component"] = ({ bubble }) => {
  useSeedItinerary();
  return <ItineraryDetail itineraryId={bubble.url.replace(/^itineraries\//, "")} />;
};

export const itineraryBubbleRoutes: BubbleRoute[] = [
  {
    pattern: /^itineraries$/,
    type: "itineraries",
    Component: ItineraryCollectionBubble,
    bubbleOptions: { defaultSize: LIST_BOX, contentBackground: "transparent" },
  },
  // ★ 札は詳細より**先に**置く（`itineraries/:id` が `.../card` も飲み込むので）
  {
    pattern: /^itineraries\/[^/]+\/card$/,
    type: "itinerary-card",
    Component: ItineraryCardBubble,
    bubbleOptions: { defaultSize: { width: CARD.w, height: CARD.h } },
  },
  {
    pattern: /^itineraries\/[^/]+$/,
    type: "itinerary",
    Component: ItineraryDetailBubble,
    /**
     * ★ **全部映ることが意味の画面**。1 日ぶんの予定（6 行）と日の見出しと合計が
     *   一度に入る大きさを名乗る ── 足りないと行が巻物になって、
     *   「その日どうなっているか」がひと目で読めなくなる。
     */
    bubbleOptions: { defaultSize: { width: 420, height: 380 } },
  },
];
