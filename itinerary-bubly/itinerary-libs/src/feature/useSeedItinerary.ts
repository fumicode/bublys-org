'use client';
/**
 * 最初の旅程を撒く ── **中身の無い器だけ**。中身はメモから来る。
 */
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import type { ItineraryPlain } from "../domain/Itinerary.domain.js";
import { selectItineraries, setItineraryList } from "../slice/itinerary-slice.js";

/** 見本の旅程の ID（ランチャーから直に開けるように固定にする） */
export const SAMPLE_ITINERARY_ID = "hakone-1n2d";

/**
 * **空の旅程**を 1 つだけ置く。
 *
 * > 旅程は、メモから作る。
 *
 * ★ 前はここに 1 泊 2 日ぶんの予定を直に書いていた。**それだと嘘になる**
 *   ── この空間の言い分は「自由に書いたメモが旅程の形になる」なのに、
 *   最初から形になったものが置いてあると、何が起きたのか誰にも見えない。
 * ★ 日も入れない。**日を作るのもメモの仕事**（`5/17` と書いてあれば、その日が生まれる）。
 *   先に日だけ用意しておくと、「日付が要る」ということ自体が隠れる。
 */
const emptyItinerary = (): ItineraryPlain => ({
  id: SAMPLE_ITINERARY_ID,
  title: "箱根 1泊2日",
  days: [],
});

export function useSeedItinerary(): void {
  const dispatch = useAppDispatch();
  const itineraries = useAppSelector(selectItineraries);
  useEffect(() => {
    if (itineraries.length === 0) dispatch(setItineraryList([emptyItinerary()]));
  }, [dispatch, itineraries.length]);
}
