"use client";
/** この宿泊バブリで何が開けるか ── url と、それを描く部品の対応表 */
import { BubbleRoute } from "@bublys-org/bubbles-ui";
import { LIST_BOX, LIST_CARD_WIDTH, ListSpace } from "@bublys-org/bubble-layout-feature";
import { useAppSelector } from "@bublys-org/state-management";
import { useCallback, useMemo, useState } from "react";
import { LodgingCard } from "../ui/LodgingCard.js";
import { LodgingSearchBar } from "../ui/LodgingSearchBar.js";
import { LodgingDetail } from "../feature/LodgingDetail.js";
import { selectLodgingById, selectLodgingPlains } from "../slice/lodging-slice.js";
import { FOUND_LODGINGS_TYPE, decodeLodgingQuery } from "../domain/foundLodgings.js";
import {
  LODGING_SEARCH_LIMIT,
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
  const list = useAppSelector(selectLodgingPlains);
  const [query, setQuery] = useState<LodgingQuery>({});
  /** 何軒目から出しているか。絞り込みを変えたら先頭へ戻す */
  const [offset, setOffset] = useState(0);
  /** 探す帯の背丈。**帯が申告したものをそのまま器へ渡す** */
  const [headHeight, setHeadHeight] = useState(SEARCH_HEIGHT);
  const changeQuery = useCallback((next: LodgingQuery) => {
    setQuery(next);
    setOffset(0);
  }, []);
  const found = useMemo(
    () => searchLodgings(list, query, LODGING_SEARCH_LIMIT, offset),
    [list, query, offset],
  );
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
      headHeight={headHeight}
      head={
        <LodgingSearchBar
          query={query}
          onChange={changeQuery}
          shown={found.hits.length}
          total={found.total}
          kinds={kinds}
          areas={areas}
          cities={cities}
          offset={found.offset}
          limit={LODGING_SEARCH_LIMIT}
          onOffsetChange={setOffset}
          onHeightChange={setHeadHeight}
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

/**
 * **探した結果そのものの泡。** 掴む札を開くと、当たったものが並んで出る。
 *
 * ★ 探す帯は出さない ── これは「あのとき探した結果」であって、探す場所ではない。
 * ★ 中身は開くたびに数え直す（id に畳んだ探し方から）。写しを持たない。
 */
const FoundLodgingsBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const list = useAppSelector(selectLodgingPlains);
  const id = bubble.url.replace(/^found-lodgings\//, "");
  const query = useMemo(() => decodeLodgingQuery(id), [id]);
  const matches = useMemo(
    () => (query ? searchLodgings(list, query, Number.MAX_SAFE_INTEGER).matches : []),
    [list, query],
  );
  const members = useMemo(() => matches.map((l) => `lodgings/${l.id}/card`), [matches]);
  if (!query) {
    return <div style={{ padding: 8, color: "#666" }}>この結果はもう読めません。</div>;
  }
  return <ListSpace members={members} itemWidth={CARD.w} itemHeight={CARD.h} />;
};

export const lodgingBubbleRoutes: BubbleRoute[] = [
  {
    pattern: /^found-lodgings\/[^/]+$/,
    type: FOUND_LODGINGS_TYPE,
    Component: FoundLodgingsBubble,
    bubbleOptions: { defaultSize: LIST_BOX, contentBackground: "transparent" },
  },
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
