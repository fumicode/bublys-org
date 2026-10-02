"use client";
/**
 * **はじめて開いた人に撒くもの** ── 海の並び（`sea-seed.json`）の泡が指している中身。
 *
 * > **「はじめて」は 1 つの見分け方で決める ── 海の世界線に、まだ根が無いこと。**
 *
 * 海の種は並びだけを持つ。泡が指している中身（囲碁の対局・旅程・グループ・地図に落としたもの）は
 * それぞれの入れ物にあるので、ここで同じ「はじめて」のときにまとめて撒く。
 *
 * ★ 見分け方を中身ごとに持たない。「そのスコープが無ければ」「地図が空なら」のように
 *   別々の印にすると、消した対局やピンが**開くたびに戻ってくる** ── 消したのに消えない。
 * ★ 見るのは**最初に描いた瞬間**の世界線だけ。海の種はその直後に最初の節として書かれるので、
 *   あとから見ると「もう記録がある」に変わってしまう。グラフは保存の読み戻し
 *   （`PersistGate`）が済んでから描かれるので、最初の 1 回で正しく判る。
 * ★ 撒くのは、泡が描かれる**前**。泡は海の種から戻すとき（次の描画）に生まれるので、
 *   ここが先に走る ── 囲碁の泡が空の対局を作ったり、旅程の泡が見本を撒いたりする前に、
 *   こちらの中身が入っている。
 */
import { useEffect, useState } from "react";
import { useAppDispatch } from "@bublys-org/state-management";
import {
  setCasEntries,
  setGraph,
  useCasScope,
  type WorldLineGraphJson,
} from "@bublys-org/world-line-graph";
import { addHanded } from "@bublys-org/map-libs";
import { SAMPLE_ITINERARY_ID, seedItineraries, type ItineraryPlain } from "@bublys-org/itinerary-libs";
import { setUserGroups, setUsers, type UserGroupState, type UserState } from "@bublys-org/users-libs";
import type { ObjectRef } from "@bublys-org/bubbles-ui";
import worldSeedJson from "./world-seed.json";

/**
 * 海の外の中身。
 *
 * - `igo`：対局ごとのスコープ**まるごと**（手順の分岐と、各節の盤面）。戻る・分岐を見るができる
 * - `itineraries`：旅程の入れ物に撒くもの。旅程の「撒くのは 1 度きり」に乗るので、
 *   旅程の泡が見本を撒こうとしても、こちらが先に入っていれば上書きされない
 * - `users` / `userGroups`：ユーザーとグループの入れ物に置くもの。どちらの見本も「空なら撒く」
 *   なので、こちらが先に入っていれば撒かれない。
 *   ★ ユーザーは見本と同じ顔ぶれだが、それでも持つ ── ユーザーの見本は**一覧の泡が開いたとき**
 *     にしか撒かれないので、一覧を開いていない海では、グループのメンバーが誰か引けなくなる
 */
type WorldSeed = {
  readonly igo: Record<string, { readonly graph: WorldLineGraphJson; readonly cas: Record<string, unknown> }>;
  readonly itineraries: ItineraryPlain[];
  readonly users: UserState[];
  readonly userGroups: UserGroupState[];
};
const WORLD_SEED = worldSeedJson as unknown as WorldSeed;

/** 地図に落としておくもの（地図の中身は泡の url に入っていないので、ここで渡す） */
const MAP_SEED: ObjectRef[] = [{ type: "Itinerary", id: SAMPLE_ITINERARY_ID } as ObjectRef];

export function useSeedOnFirstOpen(seaScope: string): void {
  const dispatch = useAppDispatch();
  const scope = useCasScope(seaScope);
  /** 最初に描いた瞬間に、まだ根が無かったか（あとから変わっても見ない） */
  const [firstOpen] = useState(() => scope.graph.state.rootNodeId === null);
  useEffect(() => {
    if (!firstOpen) return;
    // 対局を撒く道は「新規対局」と同じ（`dispatchCreateIgoGame`）── グラフと盤面を置くだけ
    for (const [scopeId, { graph, cas }] of Object.entries(WORLD_SEED.igo)) {
      dispatch(setGraph({ scopeId, graph }));
      dispatch(setCasEntries({ entries: Object.entries(cas).map(([hash, data]) => ({ hash, data })) }));
    }
    dispatch(seedItineraries(WORLD_SEED.itineraries));
    dispatch(setUsers(WORLD_SEED.users));
    dispatch(setUserGroups(WORLD_SEED.userGroups));
    // 同じものを 2 度落としても増えない（`addHanded`）ので、開発時の二重呼び出しでも 1 つ
    dispatch(addHanded(MAP_SEED));
  }, [firstOpen, dispatch]);
}
