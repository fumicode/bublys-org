"use client";
/** この旅程バブリで何が開けるか */
import { useCallback, useContext, useMemo } from "react";
import { BubblesContext, type BubbleRoute } from "@bublys-org/bubbles-ui";
import { LIST_BOX, LIST_CARD_WIDTH, ListSpace } from "@bublys-org/bubble-layout-feature";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import { ItineraryCard } from "../ui/ItineraryCard.js";
import { ItineraryDetail } from "../feature/ItineraryDetail.js";
import { addItinerary, removeItinerary, selectItineraries } from "../slice/itinerary-slice.js";
import { useSeedItinerary } from "../feature/useSeedItinerary.js";

const CARD = { w: LIST_CARD_WIDTH, h: 48 };

/** 新しく作る口の見た目（旅程の中の `＋新規` と同じ色・同じ丈に揃える） */
const NEW_BUTTON = {
  border: "1px solid #1f6fd0",
  background: "#1f6fd0",
  color: "#fff",
  borderRadius: 4,
  padding: "2px 8px",
  fontSize: "0.85em",
  lineHeight: 1.4,
  cursor: "pointer",
  whiteSpace: "nowrap",
} as const;

/**
 * 旅程の一覧 ── 並びの空間。
 *
 * ★ **新しく作る口は並びの外**（泡にはならない）。作ったらそのまま開く
 *   ── メモの一覧と同じ手ざわりにしてある。
 */
const ItineraryCollectionBubble: BubbleRoute["Component"] = ({ bubble }) => {
  useSeedItinerary();
  const dispatch = useAppDispatch();
  const { openBubble } = useContext(BubblesContext);
  const itineraries = useAppSelector(selectItineraries);
  const members = useMemo(
    () => itineraries.map((t) => `itineraries/${t.id}/card`),
    [itineraries],
  );
  const newItinerary = useCallback(() => {
    const id = crypto.randomUUID();
    dispatch(addItinerary({ id, title: "新しい旅程", days: [] }));
    openBubble(`itineraries/${id}`, bubble.id);
  }, [dispatch, openBubble, bubble.id]);
  return (
    <ListSpace
      members={members}
      itemWidth={CARD.w}
      itemHeight={CARD.h}
      head={
        <button type="button" style={NEW_BUTTON} onClick={newItinerary}>
          ＋新規
        </button>
      }
    />
  );
};

const ItineraryCardBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const dispatch = useAppDispatch();
  const id = bubble.url.replace(/^itineraries\//, "").replace(/\/card$/, "");
  const itinerary = useAppSelector(selectItineraries).find((t) => t.id === id);
  if (!itinerary) return <div style={{ padding: 8, color: "#666" }}>この旅程は見つかりませんでした。</div>;
  return <ItineraryCard itinerary={itinerary} onRemove={() => dispatch(removeItinerary(id))} />;
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
