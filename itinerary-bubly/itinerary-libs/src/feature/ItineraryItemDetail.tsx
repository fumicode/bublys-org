'use client';
/**
 * 予定 1 件（札と詳細）── 入れ物と、立ち寄り先の持ち主を、見た目に繋ぐ。
 *
 * ★ **旅程の id を知らないまま開ける。** 泡が持っているのは url だけなので、
 *   予定の id から旅程ごと引く（`selectItineraryItem`）。
 * ★ 立ち寄り先の名前は**持ち主に訊く** ── 地図で直せばここも変わる。
 */
import { FC, useCallback } from "react";
import { ObjectView, resolveObjectPlain, useFocusedObject } from "@bublys-org/bubbles-ui";
import { getSchema, readRoleText } from "@bublys-org/domain-registry/schema";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import { ItineraryItemCard } from "../ui/ItineraryItemCard.js";
import { ItineraryItemDetailView } from "../ui/ItineraryItemDetailView.js";
import type { Itinerary_旅程 } from "../domain/Itinerary.domain.js";
import type { ItineraryKind_種類 } from "../domain/ItineraryItem.domain.js";
import { selectItineraryItem, updateItinerary } from "../slice/itinerary-slice.js";

/** 立ち寄り先の名前を、その持ち主に訊く */
const usePlaceName = (ref?: { type: string; id: string }): string | undefined =>
  useAppSelector((state) =>
    ref ? readRoleText(getSchema(ref.type), resolveObjectPlain(ref.type, ref.id, state), "title") : undefined,
  );

/** 一覧の中の札 */
export const ItineraryItemCardBubble: FC<{ itemId: string }> = ({ itemId }) => {
  const found = useAppSelector(selectItineraryItem(itemId));
  const placeName = usePlaceName(found?.item.ref);
  const { focusedObjectId, setFocusedObjectId } = useFocusedObject();

  if (!found) return <Missing />;
  const { item } = found;
  return (
    <ItineraryItemCard
      item={item}
      placeName={placeName}
      focused={!!item.ref && item.ref.id === focusedObjectId}
      onFocus={() => item.ref && setFocusedObjectId(item.ref.id)}
    />
  );
};

/** 開いて直すほう */
export const ItineraryItemDetail: FC<{ itemId: string }> = ({ itemId }) => {
  const dispatch = useAppDispatch();
  const found = useAppSelector(selectItineraryItem(itemId));
  const placeName = usePlaceName(found?.item.ref);
  const { setFocusedObjectId } = useFocusedObject();

  const save = useCallback(
    (next: Itinerary_旅程) => dispatch(updateItinerary(next.toPlain())),
    [dispatch],
  );

  if (!found) return <Missing />;
  const { itinerary, item } = found;
  const date = itinerary.days.find((d) => d.items.some((i) => i.id === itemId))?.date;

  return (
    <ItineraryItemDetailView
      item={item}
      date={date}
      place={
        item.ref && placeName ? (
          <ObjectView
            type={item.ref.type}
            id={item.ref.id}
            label={placeName}
            openingPosition="bubble-side-right"
            onClick={() => item.ref && setFocusedObjectId(item.ref.id)}
          >
            <span>{placeName}</span>
          </ObjectView>
        ) : undefined
      }
      onTitleChange={(title) => save(itinerary.withItem(item.withTitle(title)))}
      /** 始まりは予定ごと動き、終わりは長さを変える ── 決まりは集約が持つ */
      onStartChange={(v) => save(itinerary.withItem(item.withStart(v)))}
      onEndChange={(v) => save(itinerary.withItem(item.withEnd(v)))}
      onCostChange={(v) => save(itinerary.withItem(item.withCost(v)))}
      onKindChange={(kind: ItineraryKind_種類) => save(itinerary.withItem(item.withKind(kind)))}
      onRemove={() => save(itinerary.withoutItem(item.id))}
    />
  );
};

const Missing: FC = () => (
  <div style={{ padding: 10, color: "#666", fontSize: 12 }}>この予定は、もうありません。</div>
);
