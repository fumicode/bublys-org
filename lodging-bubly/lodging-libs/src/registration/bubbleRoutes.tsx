"use client";
/** この宿泊バブリで何が開けるか ── url と、それを描く部品の対応表 */
import { BubbleRoute } from "@bublys-org/bubbles-ui";
import { LIST_BOX, LIST_CARD_WIDTH, ListSpace } from "@bublys-org/bubble-layout-feature";
import { useAppSelector } from "@bublys-org/state-management";
import { useMemo, useState } from "react";
import { LodgingCard } from "../ui/LodgingCard.js";
import { LodgingSearchBar } from "../ui/LodgingSearchBar.js";
import { LodgingDetail } from "../feature/LodgingDetail.js";
import { useSeedLodgings } from "../feature/useSeedLodgings.js";
import { selectLodgingById, selectLodgingPlains } from "../slice/lodging-slice.js";
import {
  countAreas,
  countKinds,
  listLodgingCities,
  searchLodgings,
  type LodgingQuery,
} from "../domain/lodgingSearch.js";

/** 札 1 枚の大きさ（中身の数。枠が取るぶんは枠が外へ足す） */
const CARD = { w: LIST_CARD_WIDTH, h: 42 };
/** 探す口の高さ（1 本の帯） */
const SEARCH_HEIGHT = 30;

/**
 * 宿の一覧 ── **探してから出す。**
 *
 * ★ 1,516 軒あるので、全部並べるという答えは無い（一覧は 1 件につき泡を 1 つ作る）。
 *   上の帯で絞って、出すのは上限まで。何軒あるかは帯がいつも言っている。
 */
const LodgingCollectionBubble: BubbleRoute["Component"] = () => {
  useSeedLodgings();
  const list = useAppSelector(selectLodgingPlains);
  const [query, setQuery] = useState<LodgingQuery>({});
  const found = useMemo(() => searchLodgings(list, query), [list, query]);
  const members = useMemo(() => found.hits.map((l) => `lodgings/${l.id}/card`), [found]);
  /**
   * ★ 区分とエリアは**当たったものぜんぶ**（`matches`）から数える ── 選ぶたびに
   *   「この中で次に何で絞れるか」が出る。全体から数えると 0 軒の選択肢が並ぶし、
   *   出している 40 軒から数えると**先頭に出てくる区分しか選べない**（実測で踏んだ）。
   */
  const kinds = useMemo(() => countKinds(found.matches), [found]);
  const areas = useMemo(() => countAreas(found.matches), [found]);
  const cities = useMemo(() => listLodgingCities(list), [list]);
  return (
    <ListSpace
      members={members}
      itemWidth={CARD.w}
      itemHeight={CARD.h}
      headHeight={SEARCH_HEIGHT}
      head={
        <LodgingSearchBar
          query={query}
          onChange={setQuery}
          shown={found.hits.length}
          total={found.total}
          kinds={kinds}
          areas={areas}
          cities={cities}
        />
      }
    />
  );
};

/** 札 1 枚の泡。ID から宿を引くだけ */
const LodgingCardBubble = ({ lodgingId }: { lodgingId: string }) => {
  const lodging = useAppSelector(selectLodgingById(lodgingId));
  if (!lodging) return <div style={{ padding: 8, color: "#666" }}>この宿は見つかりませんでした。</div>;
  return <LodgingCard lodging={lodging} />;
};

export const lodgingBubbleRoutes: BubbleRoute[] = [
  {
    pattern: /^lodgings$/,
    type: "lodgings",
    Component: LodgingCollectionBubble,
    bubbleOptions: { defaultSize: LIST_BOX, contentBackground: "transparent" },
  },
  // ★ 札は詳細より**先に**置く（`lodgings/:id` が `.../card` も飲み込むので）
  {
    pattern: /^lodgings\/[^/]+\/card$/,
    type: "lodging-card",
    Component: ({ bubble }) => (
      <LodgingCardBubble lodgingId={bubble.url.replace(/^lodgings\//, "").replace(/\/card$/, "")} />
    ),
    bubbleOptions: { defaultSize: { width: CARD.w, height: CARD.h } },
  },
  {
    pattern: /^lodgings\/[^/]+$/,
    type: "lodging",
    Component: ({ bubble }) => <LodgingDetail lodgingId={bubble.url.replace(/^lodgings\//, "")} />,
    bubbleOptions: { defaultSize: { width: 320, height: 250 } },
  },
];
