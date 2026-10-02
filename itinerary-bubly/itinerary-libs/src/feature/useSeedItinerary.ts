'use client';
/**
 * 最初の旅程を撒く ── **越後妻有 1泊2日**の見本。
 *
 * ★ 立ち寄り先は**収集した地点・宿を指している**（`ref`）。作り物の id を書くと、
 *   地図に落としてもピンが出ず、名前も引けない ── 見本が見本として働かない。
 *   id は `tools/echigo/build.mjs` が名前と緯度経度から作るので、作り直しても変わらない。
 * ★ 撒くのは**1 度きり**（`seedItineraries`）。「0 件なら撒く」だと、
 *   最後の 1 件を消した瞬間に見本が戻ってきて、**消したのに消えない**。
 * ★ 費用は**その場で払うぶんだけ**。宿泊費は別勘定なので `costNote` に逃がす
 *   ── 合計に混ぜると「1 日に使った額」が宿代で埋もれる。
 */
import { useEffect } from "react";
import { useAppDispatch } from "@bublys-org/state-management";
import type { ItineraryPlain } from "../domain/Itinerary.domain.js";
import type { ItineraryItemPlain } from "../domain/ItineraryItem.domain.js";
import { seedItineraries } from "../slice/itinerary-slice.js";

/** 見本の旅程の ID（ランチャーから直に開けるように固定にする） */
export const SAMPLE_ITINERARY_ID = "echigo-1n2d";

/** 土日の 1 泊 2 日 */
const DAY1 = "2026-10-17";
const DAY2 = "2026-10-18";

/** `9:30` → 570 */
const at = (h: number, m = 0): number => h * 60 + m;

const spot = (id: string) => ({ type: "Spot", id });
const lodging = (id: string) => ({ type: "Lodging", id });

const item = (
  id: string,
  startMin: number,
  endMin: number,
  title: string,
  kind: ItineraryItemPlain["kind"],
  cost: number,
  ref?: { type: string; id: string },
  costNote?: string,
): ItineraryItemPlain => ({ id, startMin, endMin, title, kind, cost, ref, costNote });

/**
 * **見本の中身。**
 *
 * 越後湯沢から入って、清津峡・美人林・農舞台を回り、松之山に泊まって、
 * 翌朝に棚田と酒蔵、最後にキナーレの湯に浸かって帰る ── 実際に歩ける並びにしてある
 * （同じ日のうちに端から端へ跳ばない）。
 */
const sampleItinerary = (): ItineraryPlain => ({
  id: SAMPLE_ITINERARY_ID,
  title: "越後妻有 1泊2日",
  days: [
    {
      date: DAY1,
      items: [
        item("d1-1", at(9), at(10, 30), "越後湯沢 → 十日町", "move", 1500),
        item("d1-2", at(10, 45), at(12), "清津峡／Tunnel of Light", "sightseeing", 1000, spot("echigo-d6bown")),
        item("d1-3", at(12, 15), at(13, 15), "昼食（十日町の蕎麦）", "meal", 1200),
        item("d1-4", at(13, 45), at(15), "美人林 散策", "sightseeing", 0, spot("echigo-ghwhb2")),
        item("d1-5", at(15, 30), at(16, 30), "松代城山アート散策（農舞台）", "sightseeing", 1200, spot("echigo-8o32p0")),
        item("d1-6", at(17), at(17, 30), "ひなの宿 ちとせ チェックイン", "stay", 0, lodging("echigo-stay-6p25l7"), "宿泊費別"),
      ],
    },
    {
      date: DAY2,
      items: [
        item("d2-1", at(8, 30), at(9, 30), "松之山温泉 鷹の湯 朝湯", "sightseeing", 600, spot("echigo-yk4uzx")),
        item("d2-2", at(10), at(11, 30), "星峠の棚田", "sightseeing", 0, spot("echigo-wye3df")),
        item("d2-3", at(12), at(13), "昼食（農舞台の食堂）", "meal", 1100),
        item("d2-4", at(13, 30), at(14, 30), "松乃井酒造場 見学", "sightseeing", 500, spot("echigo-42mwqe")),
        item("d2-5", at(15), at(16), "キナーレ／明石の湯", "sightseeing", 600, spot("echigo-1tsbzwn")),
        item("d2-6", at(16, 30), at(18), "十日町 → 越後湯沢", "move", 1500),
      ],
    },
  ],
});

export function useSeedItinerary(): void {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(seedItineraries([sampleItinerary()]));
  }, [dispatch]);
}
