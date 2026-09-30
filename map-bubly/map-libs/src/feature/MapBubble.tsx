'use client';
/**
 * 地図の泡 ── 入れ物と OS の「最後に指したもの」を、絵（{@link MapView}）に繋ぐ。
 *
 * > **地図は、場所を名乗っているものなら何でも描く。**
 *
 * ★ 自分の地点（`Spot`）は自分のものなので、いつも出す。それに加えて、
 *   **落とされたものの中に居る場所**を出す（`collectPlaces`）。
 *   地点 1 つを落とせばピンが 1 つ、旅程の 1 日を落とせばその日の立ち寄り先が
 *   書いてある順に出て、繋がって道になる。
 * ★ **相手が誰かは知らない。** 型名から持ち主に訊くだけ（`resolveObjectPlain`）なので、
 *   旅程もアクティビティも import しない ── 地図だけを選んでも成り立つ。
 * ★ 指すことは OS の文脈（`useFocusedObject`）に預ける。ここに自前の「選択中」を
 *   持つと、旅程で予定を指したときに地図が知らないままになる。
 */
import { FC, DragEvent as ReactDragEvent, useCallback, useMemo } from "react";
import { shallowEqual } from "react-redux";
import {
  anyObjectDragType,
  extractIdFromUrl,
  getObjectType,
  parseDragPayload,
  resolveObjectPlain,
  useFocusedObject,
  type ObjectRef,
} from "@bublys-org/bubbles-ui";
import { collectPlaces, getSchema } from "@bublys-org/domain-registry/schema";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import { MapView, type MapPin } from "../ui/MapView.js";
import { MapBounds_範囲 } from "../domain/MapBounds.domain.js";
import { Spot_地点 } from "../domain/Spot.domain.js";
import {
  clearHanded,
  selectBounds,
  selectHanded,
  selectSearchBounds,
  selectSpots,
  setBounds,
  setHanded,
  setSearchBounds,
} from "../slice/map-slice.js";
import { useSeedSpots } from "./useSeedSpots.js";

export const MapBubble: FC = () => {
  const dispatch = useAppDispatch();
  useSeedSpots();
  const spots = useAppSelector(selectSpots);
  const bounds = useAppSelector(selectBounds);
  const searchBounds = useAppSelector(selectSearchBounds);
  const handed = useAppSelector(selectHanded, shallowEqual);
  const { focusedObjectId, setFocusedObjectId } = useFocusedObject();

  /** 自分の地点。いつも出る */
  const ownPins = useMemo<MapPin[]>(
    () =>
      spots.map((s) => ({
        id: s.id,
        name: s.name,
        lat: s.lat,
        lng: s.lng,
        color: Spot_地点.categoryColor(s.category),
        url: `spots/${s.id}`,
        type: "Spot",
      })),
    [spots],
  );

  /**
   * 渡されたものの居場所。
   *
   * 指（型と id）を持ち主に訊いて、緯度経度まで辿る。辿れなかったものは出さない
   * ── 場所の分からない点を地図に置くと、嘘の位置に見える。
   */
  const handedPins = useAppSelector((state) => {
    const out: MapPin[] = [];
    for (const ref of handed) {
      const found = collectPlaces(
        getSchema(ref.type),
        resolveObjectPlain(ref.type, ref.id, state),
      );
      for (const place of found) {
        /** 指しているだけなら、その先へもう一段訊く（アクティビティ → 会場） */
        const latLng =
          place.latLng ??
          (place.ref
            ? collectPlaces(
                getSchema(place.ref.type),
                resolveObjectPlain(place.ref.type, place.ref.id, state),
              )[0]?.latLng
            : undefined);
        if (!latLng) continue;
        const id = place.ref?.id ?? ref.id;
        out.push({
          id,
          name: place.title ?? id,
          lat: latLng.lat,
          lng: latLng.lng,
          color: HANDED_COLOR,
          url: place.ref ? undefined : `${ref.type.toLowerCase()}s/${ref.id}`,
          type: place.ref?.type ?? ref.type,
        });
      }
    }
    return out;
  }, shallowEqual);

  /**
   * 描くもの。自分の地点が先、渡されたものが後。
   * **同じ所を指すものが二重にならないよう**、渡されたぶんが自分の地点と重なったら
   * 自分のほうを残す（名前も色も、持ち主のものが正しい）。
   */
  const pins = useMemo<MapPin[]>(() => {
    const own = new Set(ownPins.map((p) => p.id));
    return [...ownPins, ...handedPins.filter((p) => !own.has(p.id))];
  }, [ownPins, handedPins]);

  /** 道 ── **渡された順**に繋ぐ。地図は順の意味を知らない */
  const routeIds = useMemo(() => handedPins.map((p) => p.id), [handedPins]);

  const handleBoundsChange = useCallback(
    (next: MapBounds_範囲) => dispatch(setBounds(next.toPlain())),
    [dispatch],
  );

  /**
   * 「この範囲で探す」── **押したときだけ**探す範囲が動く。
   * もう一度押すと外れる（同じ口で戻せるほうが、別に「やめる」を置くより分かりやすい）。
   */
  const handleSearchHere = useCallback(() => {
    if (searchBounds && searchBounds.equals(bounds)) {
      dispatch(setSearchBounds(null));
      return;
    }
    dispatch(setSearchBounds(bounds.toPlain()));
  }, [dispatch, bounds, searchBounds]);

  /** **何でも受ける。** 出せるかどうかは、中を見てから決まる */
  const canAccept = useCallback((e: ReactDragEvent) => anyObjectDragType(e) !== undefined, []);

  const onDropPayload = useCallback(
    (e: ReactDragEvent): boolean => {
      const dragType = anyObjectDragType(e);
      if (!dragType) return false;
      const payload = parseDragPayload(e, { acceptTypes: [dragType] });
      if (!payload?.url) return false;
      const typeName = getObjectType(payload.type);
      const id = extractIdFromUrl(payload.url);
      if (!typeName || !id) return false;
      dispatch(setHanded([{ type: typeName, id } as ObjectRef]));
      return true;
    },
    [dispatch],
  );

  return (
    <MapView
      bounds={bounds}
      pins={pins}
      focusedId={focusedObjectId}
      routeIds={routeIds}
      onBoundsChange={handleBoundsChange}
      onPinFocus={setFocusedObjectId}
      onSearchHere={handleSearchHere}
      searching={!!searchBounds}
      canAccept={canAccept}
      onDropPayload={onDropPayload}
      onClearHanded={handed.length > 0 ? () => dispatch(clearHanded()) : undefined}
    />
  );
};

/** 渡されたもののピンの色。自分の地点と見分けがつくように */
const HANDED_COLOR = "#1f6fd0";
