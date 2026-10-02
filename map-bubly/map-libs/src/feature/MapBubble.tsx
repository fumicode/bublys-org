'use client';
/**
 * 地図の泡 ── 入れ物と OS の「最後に指したもの」を、絵（{@link MapView}）に繋ぐ。
 *
 > **地図は、渡されたものだけを描く。**
 *
 * ★ **何も渡されていなければ、ピンは 1 つも出ない。** 持っている地点は 793 件あるので、
 *   いつも全部出すと、地図は「点の絨毯」になって何も言わなくなる。見たいものを
 *   人が渡したときだけ出す ── そうすれば、出ているピンには必ず意味がある。
 * ★ 渡し方は**落とす**（掴んで地図の上で離す）。**落とすたびに足される** ──
 *   落とすのは「これも見せて」であって「これだけにして」ではないので、
 *   旅程の日と宿の一覧を並べて見られる。空にするのは「ピンを消す」から。
 *   地点 1 つを落とせばピンが 1 つ、旅程の 1 日を落とせばその日の立ち寄り先が
 *   書いてある順に出て、繋がって道になる（`collectPlaces`）。
 * ★ **道は渡したもの 1 つにつき 1 本。** 全部を 1 本にすると、旅程の最後の
 *   立ち寄り先と次に落とした宿が線で繋がって、行ってもいない道ができる。
 * ★ **相手が誰かは知らない。** 型名から持ち主に訊くだけ（`resolveObjectPlain`）なので、
 *   旅程もアクティビティも import しない ── 地図だけを選んでも成り立つ。
 * ★ 指すことは OS の文脈（`useFocusedObject`）に預ける。ここに自前の「選択中」を
 *   持つと、旅程で予定を指したときに地図が知らないままになる。
 */
import { FC, DragEvent as ReactDragEvent, useCallback, useEffect, useMemo } from "react";
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
import {
  clearHanded,
  selectBounds,
  selectHanded,
  setBounds,
  addHanded,
} from "../slice/map-slice.js";

export const MapBubble: FC = () => {
  const dispatch = useAppDispatch();
  const bounds = useAppSelector(selectBounds);
  const handed = useAppSelector(selectHanded, shallowEqual);
  const { focusedObjectId, setFocusedObjectId } = useFocusedObject();

  /**
   * 渡されたものの居場所。
   *
   * 指（型と id）を持ち主に訊いて、緯度経度まで辿る。辿れなかったものは出さない
   * ── 場所の分からない点を地図に置くと、嘘の位置に見える。
   */
  /**
   * 渡されたものの居場所を、**渡したものごとに**まとめる。
   *
   * 指（型と id）を持ち主に訊いて、緯度経度まで辿る。辿れなかったものは出さない
   * ── 場所の分からない点を地図に置くと、嘘の位置に見える。
   *
   * ★ **ひとまとめにしない。** 渡されたものは足されていくので、全部を 1 本の道にすると
   *   旅程の最後の立ち寄り先と、次に落とした宿が線で繋がる ── 行ってもいない道ができる。
   *   渡したもの 1 つが道 1 本。
   */
  const handedGroups = useAppSelector((state) => {
    const groups: { ref: ObjectRef; pins: MapPin[] }[] = [];
    for (const ref of handed) {
      const out: MapPin[] = [];
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
      groups.push({ ref, pins: out });
    }
    return groups;
  }, shallowEqual);

  /**
   * 描くもの ── **渡されたものだけ。**
   * 同じ所を二度描かないよう、同じ id は先に来たほうを残す。
   */
  const pins = useMemo<MapPin[]>(() => {
    const seen = new Set<string>();
    const out: MapPin[] = [];
    for (const g of handedGroups)
      for (const p of g.pins) if (!seen.has(p.id)) (seen.add(p.id), out.push(p));
    return out;
  }, [handedGroups]);

  /** 道 ── **渡したもの 1 つにつき 1 本**。中は渡された順。地図は順の意味を知らない */
  const routes = useMemo(
    () => handedGroups.map((g) => g.pins.map((p) => p.id)),
    [handedGroups],
  );

  const handleBoundsChange = useCallback(
    (next: MapBounds_範囲) => dispatch(setBounds(next.toPlain())),
    [dispatch],
  );

  /**
   * **渡されたら、そこが映るまで寄る。**
   *
   * > 渡されたものは、見えなければ渡されていないのと同じ。
   *
   * ★ 落とした先が画面の外だと、地図は何も変わっていないように見えて
   *   「効かなかった」と読まれる。**渡された顔ぶれが変わったときだけ**動かす
   *   ── 毎回動かすと、人が地図を動かした直後に引き戻されて手が効かなくなる。
   * ★ 空にしたときは動かさない。見るものが無いのに視点だけ飛ぶと、
   *   どこを見ていたか分からなくなる。
   * ★ 範囲の作り方は集約が持つ（`MapBounds_範囲.covering`）。ここは渡して置くだけ。
   */
  const shownKey = pins.map((p) => p.id).join(",");
  useEffect(() => {
    if (pins.length === 0) return;
    const next = MapBounds_範囲.covering(pins);
    if (next) dispatch(setBounds(next.toPlain()));
    // 顔ぶれ（`shownKey`）が変わったときだけ寄る
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownKey, dispatch]);


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
      dispatch(addHanded([{ type: typeName, id } as ObjectRef]));
      return true;
    },
    [dispatch],
  );

  return (
    <MapView
      bounds={bounds}
      pins={pins}
      focusedId={focusedObjectId}
      routes={routes}
      onBoundsChange={handleBoundsChange}
      onPinFocus={setFocusedObjectId}
      canAccept={canAccept}
      onDropPayload={onDropPayload}
      onClearHanded={handed.length > 0 ? () => dispatch(clearHanded()) : undefined}
    />
  );
};

/** 渡されたもののピンの色。自分の地点と見分けがつくように */
const HANDED_COLOR = "#1f6fd0";
