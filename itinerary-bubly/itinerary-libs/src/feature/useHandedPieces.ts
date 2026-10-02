'use client';
/**
 * **渡されたものを広げて、1 件ずつにする。**
 *
 * メモ 1 つを渡されても、中に何件も入っている。それを取り出して
 * 「まだ旅程に入っていないもの」だけを返す ── 本計画づくりの場に浮かぶのはこれ。
 *
 * ★ **中身を知らないまま広げる。** 型名から持ち主に訊いて、題名を名乗る段を拾うだけ
 *   （`collectByRole`）。メモも地点もアクティビティも同じ道を通る。
 * ★ **入っているものは浮かべない。** 旅程の予定が覚えている「もと」（`from`）と
 *   突き合わせる ── 入れれば沈み、外せば浮かぶ。パズルの駒と同じ。
 */
import { useMemo } from "react";
import { resolveObjectPlain, type ObjectRef } from "@bublys-org/bubbles-ui";
import {
  collectByRole,
  getSchema,
  readRole,
  readRoleText,
  type FoundObject,
} from "@bublys-org/domain-registry/schema";
import { useAppSelector, useAppStore } from "@bublys-org/state-management";
import { MAX_KNOWN, type PlanPiece } from "../domain/planLayout.js";
import { selectHanded, selectItineraryById } from "../slice/itinerary-slice.js";

/** 浮かべる 1 件（置き場所を決めるのに要るものだけ） */
export type HandedPiece = PlanPiece & {
  /** もとの 1 件の id（旅程の `from` と突き合わせる） */
  readonly id: string;
  readonly title: string;
};

/** いくつ言えているか ── 埋まっているほど中心に近く置かれる */
const knownCount = (piece: FoundObject): number => {
  let n = 0;
  for (const role of ["time", "duration", "money", "place", "date"] as const) {
    const v = readRole(piece.shape, piece.value, role);
    if (v === undefined || v === "" || v === null) continue;
    // 時刻は「書いていない」を負の数で表す（`NoteItemPlain`）
    if (typeof v === "number" && v < 0) continue;
    if (typeof v === "number" && v === 0 && role !== "money") continue;
    n += 1;
  }
  return Math.min(n, MAX_KNOWN);
};

export const useHandedPieces = (itineraryId: string): HandedPiece[] => {
  const store = useAppStore();
  const handed = useAppSelector(selectHanded(itineraryId));
  const itinerary = useAppSelector(selectItineraryById(itineraryId));
  /**
   * ★ **中身は毎回引き直す**（溜めない）。メモを書き換えれば読み解きも変わるので、
   *   溜めると作業場だけが古いままになる。
   */
  const state = store.getState();
  const placed = itinerary?.placedFrom;

  return useMemo(() => {
    const out: HandedPiece[] = [];
    const seen = new Set<string>();
    for (const ref of handed) {
      const found = collectByRole(
        getSchema(ref.type),
        resolveObjectPlain(ref.type, ref.id, state),
        "title",
      );
      for (const piece of found) {
        const url = readRoleText(piece.shape, piece.value, "address");
        const title = readRoleText(piece.shape, piece.value, "title");
        if (!url) continue;
        const id = String((piece.value as { id?: unknown }).id ?? url);
        if (seen.has(id)) continue;
        seen.add(id);
        if (placed?.has(id)) continue;
        out.push({
          id,
          url,
          title: title ?? id,
          group: readRoleText(piece.shape, piece.value, "group") ?? "",
          known: knownCount(piece),
        });
      }
    }
    return out;
    // `state` は毎回新しいので頼りにしない。顔ぶれが変わる引き金だけを見る
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handed, placed, itineraryId]);
};

export type { ObjectRef };
