'use client';
/**
 * 旅程 1 件 ── 入れ物・地図・アクティビティを、見た目に繋ぐ所。
 *
 * ここが受け持つ「バブリどうしの繋がり」は 3 つ:
 *
 *   1. **落ちてきたものを予定にする**（アクティビティ／地点）
 *   2. **指したものを揃える**（行を押すと、地図のピンとアクティビティの札が同時に光る）
 *   3. **その日の道を地図に渡す**（地図は渡された並びを繋ぐだけ）
 */
import { FC, DragEvent as ReactDragEvent, useCallback, useEffect } from "react";
import {
  extractIdFromUrl,
  getDragType,
  hasDragPayload,
  parseDragPayload,
  useFocusedObject,
} from "@bublys-org/bubbles-ui";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import { selectSpots, setRoute } from "@bublys-org/map-libs";
import { selectActivities } from "@bublys-org/activity-libs";
import { ItineraryView } from "../ui/ItineraryView.js";
import { Itinerary_旅程 } from "../domain/Itinerary.domain.js";
import type { ItineraryItem_予定 } from "../domain/ItineraryItem.domain.js";
import {
  selectDate,
  selectItineraryById,
  selectSelectedDate,
  updateItinerary,
} from "../slice/itinerary-slice.js";

/** 地点だけを落としたときの立ち寄り時間（分）。アクティビティなら向こうの所要時間を使う */
const SPOT_VISIT_MIN = 60;

/** 受け取れる荷物の型 ── アクティビティと地点の 2 つだけ */
const ACCEPTED = [getDragType("Activity"), getDragType("Spot")];

export const ItineraryDetail: FC<{ itineraryId: string }> = ({ itineraryId }) => {
  const dispatch = useAppDispatch();
  const itinerary = useAppSelector(selectItineraryById(itineraryId));
  const date = useAppSelector(selectSelectedDate(itineraryId));
  const spots = useAppSelector(selectSpots);
  const activities = useAppSelector(selectActivities);
  const { focusedObjectId, setFocusedObjectId } = useFocusedObject();

  const save = useCallback(
    (next: Itinerary_旅程) => dispatch(updateItinerary(next.toPlain())),
    [dispatch],
  );

  /**
   * ルール 3: **その日の道を地図に渡す。**
   * 日を変えれば道も変わる ── 地図の側に「どの日か」を教える必要はない。
   */
  const day = date ? itinerary?.day(date) : undefined;
  const spotIdsKey = day?.spotIds.join(",") ?? "";
  useEffect(() => {
    dispatch(setRoute(spotIdsKey ? spotIdsKey.split(",") : []));
  }, [dispatch, spotIdsKey]);

  const canAccept = useCallback(
    (e: ReactDragEvent) => hasDragPayload(e, { acceptTypes: ACCEPTED }),
    [],
  );

  /**
   * ルール 1: **落ちてきたものを、その日の最後に継ぐ。**
   *
   * ★ アクティビティなら所要時間と料金と場所は**向こうに聞く**。こちらで決め打ちにすると、
   *   アクティビティを直しても旅程には反映されない。
   */
  const onDropPayload = useCallback(
    (e: ReactDragEvent): boolean => {
      if (!itinerary || !date) return false;
      const payload = parseDragPayload(e, { acceptTypes: ACCEPTED });
      if (!payload?.url) return false;
      const id = extractIdFromUrl(payload.url);
      if (!id) return false;

      if (payload.type === getDragType("Activity")) {
        const activity = activities.find((a) => a.id === id);
        if (!activity) return false;
        save(
          itinerary.appended(date, {
            title: activity.name,
            durationMin: activity.durationMin,
            kind: "sightseeing",
            cost: activity.price,
            spotId: activity.spotId,
            activityId: activity.id,
          }),
        );
        return true;
      }

      const spot = spots.find((s) => s.id === id);
      if (!spot) return false;
      save(
        itinerary.appended(date, {
          title: spot.name,
          durationMin: SPOT_VISIT_MIN,
          kind: spot.category === "food" ? "meal" : spot.category === "lodging" ? "stay" : "sightseeing",
          spotId: spot.id,
        }),
      );
      return true;
    },
    [itinerary, date, activities, spots, save],
  );

  if (!itinerary || !date) {
    return <div style={{ padding: 12, color: "#666" }}>この旅程は見つかりませんでした。</div>;
  }

  return (
    <ItineraryView
      itinerary={itinerary}
      date={date}
      focusedSpotId={focusedObjectId}
      spotNameOf={(spotId) => spots.find((s) => s.id === spotId)?.name}
      onSelectDate={(d) => dispatch(selectDate({ itineraryId, date: d }))}
      onTitleChange={(title) => save(itinerary.withTitle(title))}
      /** ルール 2: 指したものを揃える ── 予定が指している地点を「指したもの」にする */
      onFocusItem={(item: ItineraryItem_予定) => item.spotId && setFocusedObjectId(item.spotId)}
      onItemTitleChange={(item, title) => save(itinerary.withItem(item.withTitle(title)))}
      onItemTimeChange={(item, start, end) => save(itinerary.withItem(item.withTime(start, end)))}
      onRemoveItem={(item) => save(itinerary.withoutItem(item.id))}
      onDropPayload={onDropPayload}
      canAccept={canAccept}
    />
  );
};
