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
import { FC, DragEvent as ReactDragEvent, useCallback, useContext, useRef } from "react";
import {
  BubblesContext,
  anyObjectDragType,
  extractIdFromUrl,
  getObjectType,
  parseDragPayload,
  resolveObjectPlain,
} from "@bublys-org/bubbles-ui";
import { useCurrentBubble } from "@bublys-org/bubble-layout-feature";
import {
  collectByRole,
  getSchema,
  readPlaceRef,
  readRole,
  readRoleNumber,
  readRoleText,
  type FoundObject,
} from "@bublys-org/domain-registry/schema";
import { useAppDispatch, useAppSelector, useAppStore } from "@bublys-org/state-management";
import { ItineraryView } from "../ui/ItineraryView.js";
import { Itinerary_旅程 } from "../domain/Itinerary.domain.js";
import type { ObjectRef } from "../domain/ItineraryItem.domain.js";
import {
  rememberHanded,
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

/** 付箋を 1 枚ずつ散らす間隔（ミリ秒） */
const SCATTER_GAP_MS = 90;

/** 指しを表の鍵にする。型と id の 2 つでひとつ */
export const ItineraryDetail: FC<{ itineraryId: string }> = ({ itineraryId }) => {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const { openBubble } = useContext(BubblesContext);
  /** 自分の泡。入らなかったものを**自分の隣**に置くのに要る */
  const myBubbleId = useCurrentBubble();
  /**
   * ★ **開く口は、呼ぶ直前に取り直す。**
   *   海の `openBubble` は**そのときの海を抱えた関数**なので、掴んだまま続けて呼ぶと
   *   どれも同じ「開く前の海」から新しい海を作り、**最後の 1 つしか残らない**
   *   （実測：7 枚出るはずが 1 枚だった。間を空けても直らない ── 古いのは海ではなく関数）。
   */
  const openRef = useRef(openBubble);
  openRef.current = openBubble;
  const itinerary = useAppSelector(selectItineraryById(itineraryId));
  const date = useAppSelector(selectSelectedDate(itineraryId));

  const save = useCallback(
    (next: Itinerary_旅程) => dispatch(updateItinerary(next.toPlain())),
    [dispatch],
  );

  /**
   * **何でも受ける。** 受けられるかどうかは、落ちてきてから中身を見て決める
   * ── `dragover` の時点では型しか読めないので、ここでは型の当たりだけ見る。
   */
  const canAccept = useCallback((e: ReactDragEvent) => anyObjectDragType(e) !== undefined, []);

  /**
   * **落ちてきたものを、形にする。**
   *
   * > **日が決まっているものだけが、旅程に入る。決まっていないものは、隣に置いておく。**
   *
   * ★ 落ちてきたものの**中を歩いて、題名を名乗るものを全部拾う**（`collectByRole`）。
   *   地点 1 つなら 1 件、メモなら中の全件 ── **数の違いを場合分けしない。**
   *   地図が「場所を名乗るものを全部拾う」のと同じ歩き方で、問いだけが違う。
   * ★ **入らなかったものは消さない。** 開ける先（役 `address`）を名乗っていれば、
   *   自分の隣に泡として開く ── 画用紙の上に付箋を散らす、の形。
   *   名乗っていなければ置けないので、そのときだけ黙って落ちる。
   * ★ 相手が何であるかは最後まで知らない。メモも地点もアクティビティも、
   *   「題名を名乗るもの」として同じ道を通る。
   */
  const onDropPayload = useCallback(
    (e: ReactDragEvent): boolean => {
      if (!itinerary) return false;
      const dragType = anyObjectDragType(e);
      if (!dragType) return false;
      const payload = parseDragPayload(e, { acceptTypes: [dragType] });
      if (!payload?.url) return false;
      const typeName = getObjectType(payload.type);
      const id = extractIdFromUrl(payload.url);
      if (!typeName || !id) return false;

      const shape = getSchema(typeName);
      const plain = resolveObjectPlain(typeName, id, store.getState());

      /** 中に居るもの。1 つも居なければ、落ちてきたもの自身を 1 件として見る */
      const found: FoundObject[] = collectByRole(shape, plain, "title");
      const pieces: FoundObject[] =
        found.length > 0 ? found : shape ? [{ shape, value: plain }] : [];
      if (pieces.length === 0) {
        /**
         * 中身を訊けない型（まだ読み込んでいないバブリのもの）。掴んだときのラベルで足す。
         * ★ **日がまだ 1 つも無ければ、置く所が無い** ── その場合は受けない。
         *   日を作れるのは「いつ」を言えるものだけ（メモの `5/17` など）。
         */
        if (!payload.label || !date) return false;
        save(itinerary.appended(date, { title: payload.label, durationMin: DEFAULT_MIN, kind: "other" }));
        return true;
      }

      let next = itinerary;
      const leftovers: string[] = [];
      /** もとの 1 件を指す（外したときに、また浮かんでくるように） */
      const fromOf = (piece: FoundObject): ObjectRef | undefined => {
        const address = readRoleText(piece.shape, piece.value, "address");
        const pid = (piece.value as { id?: unknown }).id;
        return address && typeof pid === "string" ? { type: typeName, id: pid } : undefined;
      };

      for (const piece of pieces) {
        const title = readRoleText(piece.shape, piece.value, "title") ?? payload.label;
        if (!title) continue;

        /**
         * いつの話か。**3 通りを分ける**:
         *   - そもそも言わない型（地点・アクティビティ）→ **いま見ている日**。
         *     1 件掴んで落としたときは「この日に入れたい」に決まっている
         *   - 言うけれど空（メモの「いつか書いていない行」）→ **入らない**
         *   - 言っている → その日に合わせる（無ければ作る）
         *
         * ★ `readRoleText` は空文字を `undefined` にするので、ここでは使えない。
         *   **「言っていない」と「言ったが分からない」を混ぜると、日付の無い行が
         *   黙って今日の予定になる**（実測で踏んだ）。
         */
        const dateRaw = readRole(piece.shape, piece.value, "date");
        const placed =
          dateRaw === undefined ? date : next.resolveDate(String(dateRaw));

        if (!placed) {
          // 日が決まっていない ── 旅程には入らない。隣に置く
          const address = readRoleText(piece.shape, piece.value, "address");
          if (address) leftovers.push(address);
          continue;
        }

        /**
         * 立ち寄り先。渡されたものが場所を指していればそれ、指していなくて
         * **1 件だけ落ちてきたなら、落ちてきたもの自身**（地点を落としたときはこちら）。
         */
        const ref: ObjectRef | undefined =
          readPlaceRef(piece.shape, piece.value) ??
          (pieces.length === 1 ? { type: typeName, id } : undefined);

        /** 何時からか。負の数は「書いていない」の印なので、そのときは継ぐ */
        const startMin = readRoleNumber(piece.shape, piece.value, "time");

        next = next.appended(placed, {
          title,
          durationMin: readRoleNumber(piece.shape, piece.value, "duration") || DEFAULT_MIN,
          kind: "other",
          cost: readRoleNumber(piece.shape, piece.value, "money") ?? 0,
          ref,
          from: fromOf(piece),
          startMin: startMin !== undefined && startMin >= 0 ? startMin : undefined,
        });
      }

      if (next !== itinerary) save(next);

      /**
       * **たくさん渡されたら、作業場を開く。**
       *
       * ★ 中に何件も入っていたということは、**これから並べ替える仕事**が始まるということ。
       *   外の海に付箋を散らすと、ほかの泡と混ざって「どれがこの旅程の話か」が
       *   言えなくなる ── 1 つの空間に囲って、そこを盤にする。
       * ★ **1 件だけのときは開かない。** 地点を 1 つ落としただけで盤が出てくるのは、
       *   手数が増えるだけ。
       */
      if (pieces.length > 1) {
        dispatch(rememberHanded({ itineraryId, ref: { type: typeName, id } }));
        openRef.current(`itineraries/${itineraryId}/plan`, myBubbleId ?? "");
        return true;
      }

      /**
       * ★ **入らなかったものを、自分の隣に開く。** 消さないことがこの手の要
       *   ── 「読めなかったので捨てました」は、書いた人にとって一番困る。
       */
      leftovers.forEach((url, i) => {
        window.setTimeout(() => openRef.current(url, myBubbleId ?? ""), i * SCATTER_GAP_MS);
      });

      return next !== itinerary || leftovers.length > 0;
    },
    [itinerary, date, save, store, myBubbleId, dispatch, itineraryId],
  );

  /**
   * ★ **日が 1 つも無くても開く。** 日を作るのはメモの仕事なので、
   *   渡される前の旅程は器だけ ── ここで「見つかりませんでした」と言うと、
   *   **空であることと、無いことが同じに見える**。
   */
  if (!itinerary) {
    return <div style={{ padding: 12, color: "#666" }}>この旅程は見つかりませんでした。</div>;
  }

  return (
    <ItineraryView
      itinerary={itinerary}
      date={date}
      onSelectDate={(d) => dispatch(selectDate({ itineraryId, date: d }))}
      onTitleChange={(title) => save(itinerary.withTitle(title))}
      onDropPayload={onDropPayload}
      canAccept={canAccept}
      /**
       * ★ **隣へ掴み出されたら、旅程から外す。**
       *   外した先（本計画づくりの場）は「メモの別の見え方」なので、外しても何も失わない
       *   ── もとの 1 件は付箋として浮き直る。ボタンの ↩ と同じことを、掴んで出すやり方で。
       */
      onItemLeave={(itemId) => {
        if (!itinerary.findItem(itemId)) return;
        save(itinerary.withoutItem(itemId));
      }}
    />
  );
};
