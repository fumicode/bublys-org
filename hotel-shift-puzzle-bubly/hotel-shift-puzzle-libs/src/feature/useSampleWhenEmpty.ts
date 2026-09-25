/**
 * **空で開かない。** 世界に何も無いときだけ、例データを入れてから見せる。
 *
 * ★ **空のデモは「何も無いページ」に見える。** 初めて来た人は、まず何かが写っていないと
 *   触りようがない ── 作るところから始めさせない（前は `勤務表がありません` で止まっていた）。
 * ★ 入れるのは**世界が空のときだけ**。1 度でも触った人の世界は上書きしない。
 *   白紙にしたい人には「白紙から始める」が、入れ直したい人には「例データ読み込み」が
 *   ファイルの口にある（`useWorldFile`）── ここはその初回ぶんだけを自動でやる。
 * ★ 空かどうかは**ストアに直接訊く**（`isScopeEmpty`）。`useObjects` など世界の口は
 *   `HotelObjectsProvider` の中でしか使えず、アプリの根では呼べない（実測で踏んだ）。
 * ★ 読み戻し（redux-persist）の**あと**に走る ── `BublyStoreProvider` が `PersistGate` で
 *   中身を止めているので、ここが動くときには前回の世界がもう載っている。
 * ★ 消す（`clearDocumentScopes`）のはしない ── 空だと確かめてから入れるので、消す物が無い。
 */
import { useEffect, useRef } from "react";
import { useAppStore } from "@bublys-org/state-management";
import { APP_SCOPE_ID, commitBundle, bornWorldsOf, isScopeEmpty } from "../objects/commit.js";
import { buildSampleItems } from "../objects/seed.js";

export function useSampleWhenEmpty(): void {
  const store = useAppStore();
  /** 入れるのは 1 回だけ（入れた直後は自分の書き込みで走り直すので、旗で止める） */
  const settled = useRef(false);

  useEffect(() => {
    if (settled.current) return;
    settled.current = true;
    if (!isScopeEmpty(store, APP_SCOPE_ID)) return;   // 人の世界がある ── 触らない
    const items = buildSampleItems();
    commitBundle(store, APP_SCOPE_ID, items);
    // 勤務表それぞれに世界を持たせる（`useWorldFile` の例データ読み込みと同じ手順）
    bornWorldsOf(store, items);
  }, [store]);
}
