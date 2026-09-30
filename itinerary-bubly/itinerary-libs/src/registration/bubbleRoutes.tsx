"use client";
/** この旅程バブリで何が開けるか */
import { useMemo } from "react";
import type { BubbleRoute } from "@bublys-org/bubbles-ui";
import { LIST_BOX, LIST_CARD_WIDTH, ListSpace } from "@bublys-org/bubble-layout-feature";
import { useAppSelector } from "@bublys-org/state-management";
import { ItineraryCard } from "../ui/ItineraryCard.js";
import { ItineraryDetail } from "../feature/ItineraryDetail.js";
import { ItineraryPlanSpace } from "../feature/ItineraryPlanSpace.js";
import { ItineraryItemCardBubble, ItineraryItemDetail } from "../feature/ItineraryItemDetail.js";
import { ITEM_CARD_HEIGHT } from "../ui/ItineraryView.js";
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
  /**
   * 予定 1 件の札 ── 一覧の中の泡。
   * ★ 詳細より**先に**置く（`itinerary-items/:id` が `.../card` も飲み込むので）
   */
  {
    pattern: /^itinerary-items\/[^/]+\/card$/,
    type: "itinerary-item-card",
    Component: ({ bubble }) => (
      <ItineraryItemCardBubble itemId={bubble.url.replace(/^itinerary-items\//, "").replace(/\/card$/, "")} />
    ),
    bubbleOptions: { defaultSize: { width: LIST_CARD_WIDTH, height: ITEM_CARD_HEIGHT } },
  },
  /**
   * 予定 1 件の詳細 ── **直すのはここ**。
   * ★ 種類の口が 5 つ並ぶので、横に折り返さない幅を名乗る。
   */
  {
    pattern: /^itinerary-items\/[^/]+$/,
    type: "itinerary-item",
    Component: ({ bubble }) => (
      <ItineraryItemDetail itemId={bubble.url.replace(/^itinerary-items\//, "")} />
    ),
    bubbleOptions: { defaultSize: { width: 360, height: 260 } },
  },
  /**
   * **本計画づくりの場** ── 旅程を真ん中に置いた 1 つの空間（泡の中の海）。
   *
   * ★ 詳細（`itineraries/:id`）より**先に**置く。あちらの型は
   *   `itineraries/[^/]+` なので、後ろに置くと `.../plan` まで飲み込む。
   * ★ **広い。** 8 方向に散らすので、狭いと全部が縁で重なって
   *   「向きが関係を表す」が読めなくなる。
   */
  {
    pattern: /^itineraries\/[^/]+\/plan$/,
    type: "itinerary-plan",
    Component: ({ bubble }) => (
      <ItineraryPlanSpace itineraryId={bubble.url.replace(/^itineraries\//, "").replace(/\/plan$/, "")} />
    ),
    /**
     * ★ `universe` は名乗らない ── あれは**入れ子の海**（もう 1 つ root を立てる）の印。
     *   ここは一覧と同じ「自分の中に子を持つ空間」なので、子の空間のままでよい
     *   （そうしないと消失点が箱と関係ない所に置かれる ── `ListSpace` の註）。
     */
    /**
     * ★ **画面に収まる大きさで開く。** 散らす寸法は場の実寸から出すので（`planLayout`）、
     *   盤が小さければ散らばりもそのぶん縮む ── 大きさを先に決める必要はもう無い。
     * ★ 前は 1240×1020 で開いていて、ふつうの画面に入らず**見出しごと画面の外**に出ていた
     *   （見え方の口も一緒に外へ出て、触れなくなっていた）。広く使いたいときは
     *   辺を掴んで広げるか、中の見え方の口で寄り引きする ── どちらも道具が持っている。
     */
    bubbleOptions: { defaultSize: { width: 900, height: 620 }, contentBackground: "transparent" },
  },
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
     * ★ **全部映ることが意味の画面**。1 日ぶんの予定と日の見出しと合計が
     *   一度に入る大きさを名乗る ── 足りないと並びが奥行きに畳まれて、
     *   「その日どうなっているか」がひと目で読めなくなる。
     */
    bubbleOptions: { defaultSize: { width: 420, height: 380 }, contentBackground: "transparent" },
  },
];
