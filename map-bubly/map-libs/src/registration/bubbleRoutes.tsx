"use client";
/** この地図バブリで何が開けるか ── url と、それを描く部品の対応表 */
import { BubbleRoute } from "@bublys-org/bubbles-ui";
import { LIST_BOX, LIST_CARD_WIDTH, ListSpace } from "@bublys-org/bubble-layout-feature";
import { useAppSelector } from "@bublys-org/state-management";
import { useCallback, useMemo, useState } from "react";
import { MapBubble } from "../feature/MapBubble.js";
import { SpotDetail } from "../feature/SpotDetail.js";
import { SpotCard } from "../ui/SpotCard.js";
import { selectSpots } from "../slice/map-slice.js";
import { SpotSearchBar } from "../ui/SpotSearchBar.js";
import {
  SPOT_SEARCH_LIMIT,
  countTags,
  listCities,
  searchSpots,
  type SpotQuery,
} from "../domain/spotSearch.js";
import { FOUND_SPOTS_TYPE, decodeSpotQuery } from "../domain/foundSpots.js";

/** 札 1 枚の大きさ（中身の数。枠が取るぶんは枠が外へ足す） */
const CARD = { w: LIST_CARD_WIDTH, h: 42 };

/** 探す口の高さ（1 本の帯） */
const SEARCH_HEIGHT = 30;
/** 帯に並べる目印の数。多すぎると帯が折り返して読めない */
const TAG_CHIPS = 5;

/**
 * 地点の一覧 ── 地図に出ている場所を、並びとしても見られるようにする。
 *
 * ★ **探してから出す。** 越後を入れて 800 件を超えたので、全部並べるという答えは無い
 *   （一覧は 1 件につき泡を 1 つ作る）。上の帯で絞って、出すのは上限まで。
 */
const SpotCollectionBubble: BubbleRoute["Component"] = () => {
  const spots = useAppSelector(selectSpots);
  const [query, setQuery] = useState<SpotQuery>({});
  /** 何件目から出しているか。絞り込みを変えたら先頭へ戻す */
  const [offset, setOffset] = useState(0);
  /**
   * 探す帯の背丈。**帯が申告したものをそのまま器へ渡す**
   * ── 器は口の高さを測らない決まりなので（`ListSpace` の `headHeight` の註）。
   */
  const [headHeight, setHeadHeight] = useState(SEARCH_HEIGHT);
  const changeQuery = useCallback((next: SpotQuery) => {
    setQuery(next);
    setOffset(0);
  }, []);
  /** 探すのは保存形のまま ── 集約に直す前に絞れば、800 件ぶんの生成をしなくて済む */
  const plain = useMemo(() => spots.map((s) => s.toPlain()), [spots]);
  const found = useMemo(() => searchSpots(plain, query, SPOT_SEARCH_LIMIT, offset), [plain, query, offset]);
  const members = useMemo(() => found.hits.map((s) => `spots/${s.id}/card`), [found]);
  /**
   * ★ 押して絞れる目印は、**当たったものぜんぶ**（`matches`）から数える ── 押すたびに
   *   「この中で次に何で絞れるか」が出る。全体から数えると 0 件の目印が並ぶし、
   *   出している 40 件から数えると**先頭に出てくる目印しか押せない**（実測で踏んだ）。
   */
  const tags = useMemo(() => countTags(found.matches).slice(0, TAG_CHIPS), [found]);
  const cities = useMemo(() => listCities(plain), [plain]);
  return (
    <ListSpace
      members={members}
      itemWidth={CARD.w}
      itemHeight={CARD.h}
      headHeight={headHeight}
      head={
        <SpotSearchBar
          query={query}
          onChange={changeQuery}
          shown={found.hits.length}
          total={found.total}
          tags={tags}
          cities={cities}
          offset={found.offset}
          limit={SPOT_SEARCH_LIMIT}
          onOffsetChange={setOffset}
          onHeightChange={setHeadHeight}
        />
      }
    />
  );
};

/**
 * **探した結果そのものの泡。** 掴む札を開くと、当たったものが並んで出る。
 *
 * ★ 探す帯は出さない ── これは「あのとき探した結果」であって、探す場所ではない。
 *   絞り直したいなら地点の一覧を開く。
 * ★ 中身は**開くたびに数え直す**（id に畳んだ探し方から）。写しを持たないので、
 *   地点が増えたり名前が変わったりすれば、ここもその場で変わる。
 */
const FoundSpotsBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const spots = useAppSelector(selectSpots);
  const id = bubble.url.replace(/^found-spots\//, "");
  const query = useMemo(() => decodeSpotQuery(id), [id]);
  const plain = useMemo(() => spots.map((s) => s.toPlain()), [spots]);
  const matches = useMemo(
    () => (query ? searchSpots(plain, query, Number.MAX_SAFE_INTEGER).matches : []),
    [plain, query],
  );
  const members = useMemo(() => matches.map((s) => `spots/${s.id}/card`), [matches]);
  if (!query) {
    return <div style={{ padding: 8, color: "#666" }}>この結果はもう読めません。</div>;
  }
  return <ListSpace members={members} itemWidth={CARD.w} itemHeight={CARD.h} />;
};

export const mapBubbleRoutes: BubbleRoute[] = [
  {
    pattern: /^found-spots\/[^/]+$/,
    type: FOUND_SPOTS_TYPE,
    Component: FoundSpotsBubble,
    bubbleOptions: { defaultSize: LIST_BOX, contentBackground: "transparent" },
  },
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
