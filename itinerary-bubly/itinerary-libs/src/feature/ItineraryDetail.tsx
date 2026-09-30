'use client';
/**
 * 旅程 1 件 ── 入れ物と、落ちてきたものを、見た目に繋ぐ所。
 *
 * > **落ちてきたものが何であるかを、旅程は知らない。**
 *
 * ★ 前はここが地図とアクティビティを import していた（`selectSpots` / `selectActivities`）。
 *   受け取れる型も 2 つに決め打ちだったので、**旅程だけを選ぶことができず**、
 *   タスクやメモを落としても何も起きなかった。いまは型名から
 *   **持ち主に訊く**（`resolveObjectPlain`）ので、相手が誰でもよい。
 * ★ 要求するのは**題名だけ**。時間も金額も場所も、役を名乗っていれば使い、
 *   名乗っていなければ既定になる。下限を下げておかないと「対応している型」の
 *   一覧が生まれて、また作者が組み合わせを決めることになる。
 *   （`docs/bubly-composition.md`）
 */
import { FC, DragEvent as ReactDragEvent, useCallback } from "react";
import {
  anyObjectDragType,
  extractIdFromUrl,
  getObjectType,
  parseDragPayload,
  resolveObjectPlain,
  useFocusedObject,
} from "@bublys-org/bubbles-ui";
import {
  getSchema,
  readPlaceRef,
  readRoleNumber,
  readRoleText,
} from "@bublys-org/domain-registry/schema";
import { useAppDispatch, useAppSelector, useAppStore } from "@bublys-org/state-management";
import { shallowEqual } from "react-redux";
import { ItineraryView } from "../ui/ItineraryView.js";
import { Itinerary_旅程 } from "../domain/Itinerary.domain.js";
import type { ItineraryItem_予定, ObjectRef } from "../domain/ItineraryItem.domain.js";
import {
  selectDate,
  selectItineraryById,
  selectSelectedDate,
  updateItinerary,
} from "../slice/itinerary-slice.js";

/**
 * 役を名乗っていないものを落としたときの長さ（分）。
 *
 * ★ **落とした人に時刻を聞かない。** 掴んで落とすという操作に「答える」場所が無いので、
 *   置いてから直すほうが手数が少ない（時刻は行の上で直せる）。
 */
const DEFAULT_MIN = 60;

/** 指しを表の鍵にする。型と id の 2 つでひとつ */
const refKey = (ref: ObjectRef): string => `${ref.type}/${ref.id}`;

export const ItineraryDetail: FC<{ itineraryId: string }> = ({ itineraryId }) => {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const itinerary = useAppSelector(selectItineraryById(itineraryId));
  const date = useAppSelector(selectSelectedDate(itineraryId));
  const { focusedObjectId, setFocusedObjectId } = useFocusedObject();

  const save = useCallback(
    (next: Itinerary_旅程) => dispatch(updateItinerary(next.toPlain())),
    [dispatch],
  );

  /**
   * 指し先の名前 ── **持ち主に訊く。**
   *
   * ★ 名前をこちらに写して持たないので、相手の側で直せばここも直る。
   *   （地図で地点の名前を直したら、旅程の行もその場で変わる）
   * ★ **名前の表を作って返す**（関数を返さない）。セレクタが毎回新しい関数を返すと、
   *   中身が同じでも「変わった」と見なされて描き直しが止まらなくなる。
   *   表を浅く比べれば、名前が変わったときだけ描き直る。
   */
  const refNames = useAppSelector((state) => {
    const out: Record<string, string> = {};
    for (const day of itinerary?.days ?? []) {
      for (const item of day.items) {
        const ref = item.ref;
        if (!ref) continue;
        const key = refKey(ref);
        if (out[key] !== undefined) continue;
        const name = readRoleText(getSchema(ref.type), resolveObjectPlain(ref.type, ref.id, state), "title");
        if (name) out[key] = name;
      }
    }
    return out;
  }, shallowEqual);

  /**
   * **何でも受ける。** 受けられるかどうかは、落ちてきてから中身を見て決める
   * ── `dragover` の時点では型しか読めないので、ここでは型の当たりだけ見る。
   */
  const canAccept = useCallback((e: ReactDragEvent) => anyObjectDragType(e) !== undefined, []);

  /**
   * 落ちてきたものを、その日の最後の後ろに継ぐ。
   *
   * 読むのは役だけ ── 題名（これだけは要る）・時間・金額・場所。
   * 場所は**そのものが場所そのものであるか**（緯度経度を名乗る）、
   * **場所を指しているか**（`place` の役）のどちらかで決まる。
   */
  const onDropPayload = useCallback(
    (e: ReactDragEvent): boolean => {
      if (!itinerary || !date) return false;
      /**
       * ★ **荷物が名乗っている型をそのまま見る**（登録済みの一覧で絞らない）。
       *   絞ると、まだ読み込んでいないバブリのものが黙って弾かれて、
       *   「題名さえあれば受ける」が嘘になる。
       */
      const dragType = anyObjectDragType(e);
      if (!dragType) return false;
      const payload = parseDragPayload(e, { acceptTypes: [dragType] });
      if (!payload?.url) return false;
      const typeName = getObjectType(payload.type);
      const id = extractIdFromUrl(payload.url);
      if (!typeName || !id) return false;

      const shape = getSchema(typeName);
      const plain = resolveObjectPlain(typeName, id, store.getState());

      /**
       * 題名。持ち主が答えられないとき（中身を訊く口を名乗っていない型）は、
       * 掴んだときのラベルで代える ── **それも無ければ受けない**。
       * 名前の無い予定は、あとから何だったか分からなくなる。
       */
      const title = readRoleText(shape, plain, "title") ?? payload.label;
      if (!title) return false;

      const durationMin = readRoleNumber(shape, plain, "duration") ?? DEFAULT_MIN;
      const cost = readRoleNumber(shape, plain, "money") ?? 0;

      /**
       * 立ち寄り先。
       * - 場所を**指している**もの（`place` の役）なら、その指をそのまま引き継ぐ
       *   ── アクティビティを落とすと、予定が指すのは会場のほうになる
       * - 指していなければ、**落ちてきたもの自身**を指す
       *   （地点を落としたときはこちら。指すのはその地点）
       */
      const ref: ObjectRef = readPlaceRef(shape, plain) ?? { type: typeName, id };

      save(
        itinerary.appended(date, {
          title,
          durationMin,
          kind: "other",
          cost,
          ref,
        }),
      );
      return true;
    },
    [itinerary, date, save, store],
  );

  if (!itinerary || !date) {
    return <div style={{ padding: 12, color: "#666" }}>この旅程は見つかりませんでした。</div>;
  }

  return (
    <ItineraryView
      itinerary={itinerary}
      date={date}
      focusedObjectId={focusedObjectId}
      nameOfRef={(ref) => refNames[refKey(ref)]}
      onSelectDate={(d) => dispatch(selectDate({ itineraryId, date: d }))}
      onTitleChange={(title) => save(itinerary.withTitle(title))}
      /** 指したものを揃える ── 予定が指している先を「指したもの」にする */
      onFocusItem={(item: ItineraryItem_予定) => item.ref && setFocusedObjectId(item.ref.id)}
      onItemTitleChange={(item, title) => save(itinerary.withItem(item.withTitle(title)))}
      /** 始まりは予定ごと動き、終わりは長さを変える ── どちらの決まりも集約が持つ */
      onItemStartChange={(item, start) => save(itinerary.withItem(item.withStart(start)))}
      onItemEndChange={(item, end) => save(itinerary.withItem(item.withEnd(end)))}
      onItemCostChange={(item, cost) => save(itinerary.withItem(item.withCost(cost)))}
      onRemoveItem={(item) => save(itinerary.withoutItem(item.id))}
      onDropPayload={onDropPayload}
      canAccept={canAccept}
    />
  );
};
