"use client";
/** このアクティビティバブリで何が開けるか */
import { useMemo } from "react";
import type { BubbleRoute } from "@bublys-org/bubbles-ui";
import { useFocusedObject } from "@bublys-org/bubbles-ui";
import { LIST_BOX, LIST_CARD_WIDTH, ListSpace } from "@bublys-org/bubble-layout-feature";
import { useAppSelector } from "@bublys-org/state-management";
import { selectSpots } from "@bublys-org/map-libs";
import { ActivityCard } from "../ui/ActivityCard.js";
import { ActivityDetail } from "../feature/ActivityDetail.js";
import { selectActivities } from "../slice/activity-slice.js";
import { useSeedActivities } from "../feature/useSeedActivities.js";
import { useVisibleActivities } from "../feature/useVisibleActivities.js";

/** 札 1 枚の大きさ（中身の数。枠が取るぶんは枠が外へ足す） */
const CARD = { w: LIST_CARD_WIDTH, h: 54 };

/**
 * アクティビティの一覧 ── **並びの空間**。
 *
 * ★ 顔ぶれは「地図が決めた範囲の中のもの」（`useVisibleActivities`）。
 *   地図で範囲を決めれば、ここは何もしなくても入れ替わる。
 */
const ActivityCollectionBubble: BubbleRoute["Component"] = () => {
  useSeedActivities();
  const { activities, filtered, total } = useVisibleActivities();
  const members = useMemo(
    () => activities.map((a) => `activities/${a.id}/card`),
    [activities],
  );

  return (
    <ListSpace
      members={members}
      itemWidth={CARD.w}
      itemHeight={CARD.h}
      head={
        filtered ? (
          <span style={{ fontSize: 12, color: "#1f6fd0", whiteSpace: "nowrap" }}>
            地図の範囲で {activities.length} / {total} 件
          </span>
        ) : undefined
      }
    />
  );
};

/** 札 1 枚の泡 */
const ActivityCardBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const id = bubble.url.replace(/^activities\//, "").replace(/\/card$/, "");
  const activity = useAppSelector(selectActivities).find((a) => a.id === id);
  const spots = useAppSelector(selectSpots);
  const { focusedObjectId, setFocusedObjectId } = useFocusedObject();
  if (!activity) {
    return <div style={{ padding: 8, color: "#666" }}>このアクティビティは見つかりませんでした。</div>;
  }
  const spot = spots.find((s) => s.id === activity.spotId);
  return (
    <ActivityCard
      activity={activity}
      spotName={spot?.name}
      focused={!!spot && spot.id === focusedObjectId}
      onFocus={() => spot && setFocusedObjectId(spot.id)}
    />
  );
};

export const activityBubbleRoutes: BubbleRoute[] = [
  {
    pattern: /^activities$/,
    type: "activities",
    Component: ActivityCollectionBubble,
    // 一覧は地を敷かない ── 並びの空間は海がそのまま透ける
    bubbleOptions: { defaultSize: LIST_BOX, contentBackground: "transparent" },
  },
  // ★ 札は詳細より**先に**置く（`activities/:id` が `.../card` も飲み込むので）
  {
    pattern: /^activities\/[^/]+\/card$/,
    type: "activity-card",
    Component: ActivityCardBubble,
    bubbleOptions: { defaultSize: { width: CARD.w, height: CARD.h } },
  },
  {
    pattern: /^activities\/[^/]+$/,
    type: "activity",
    Component: ({ bubble }) => (
      <ActivityDetail activityId={bubble.url.replace(/^activities\//, "")} />
    ),
    // ★ **全部映ることが意味の画面**。説明まで入る高さを名乗る
    bubbleOptions: { defaultSize: { width: 360, height: 300 } },
  },
];
