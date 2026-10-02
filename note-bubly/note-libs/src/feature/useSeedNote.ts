'use client';
/**
 * 見本のメモ ── **人が実際に書くとおりに**書いてある。
 *
 * ★ きれいに整った例にしない。日付の見出し、思いつきの箇条書き、字下げした補足、
 *   やめたので消した行、決まっていない「〜か〜」── **散らかったまま読める**ことが
 *   このバブリの言い分なので、見本も散らかっていないと嘘になる。
 * ★ 指している地点（`@{Spot:…}`）は**越後の調べ物に実在するもの**。
 *   id は名前と緯度経度から作ってあるので、調べ物を作り直しても外れない
 *   （`tools/echigo/build.mjs`）。
 */
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import type { NotePlain } from "../domain/Note.domain.js";
import { selectNotes, setNoteList } from "../slice/note-slice.js";

export const SAMPLE_NOTE_ID = "echigo-note";

let seq = 0;
const l = (
  text: string,
  o: { heading?: number; indent?: number; marks?: string[] } = {},
): NotePlain["lines"][number] => ({
  id: `${SAMPLE_NOTE_ID}-${++seq}`,
  text,
  heading: o.heading ?? 0,
  indent: o.indent ?? 0,
  marks: (o.marks ?? []) as NotePlain["lines"][number]["marks"],
});

const sampleNote = (): NotePlain => {
  seq = 0;
  return {
    id: SAMPLE_NOTE_ID,
    title: "越後妻有 旅行メモ",
    lines: [
      /**
       * ★ **日付の無い見出し。** ここに書いたものは「いつの話か」が決まっていないので、
       *   旅程には入らない ── 渡すと付箋になって盤に残る。
       */
      l("行きたいところ", { heading: 1 }),
      l("美人林 @{Spot:echigo-ghwhb2} 気になる 1時間"),
      l("星峠の棚田 朝がいいらしい", { marks: ["strong"] }),
      l("@{Spot:echigo-wye3df}", { indent: 1 }),
      l("苗場酒造 か 玉城屋の利き酒"),
      l("キナーレの明石の湯 @{Spot:echigo-1tsbzwn} 2〜3時間"),
      l("芝峠温泉の雲海も見たい"),
      l("スキー 混みそう 今回は季節ちがう", { marks: ["strike"] }),
      l(""),
      /** 日付の見出し。ここに書いたものは、その日の予定として旅程に入る */
      l("10/11", { heading: 1 }),
      l("東京→越後湯沢 とき 8:12 ¥6,790"),
      l("越後湯沢→十日町 ほくほく線 10:00 1時間"),
      l("昼食 11:30", { marks: ["strong"] }),
      l("へぎそば 1500〜2000円 要予約", { indent: 1 }),
      l("清津峡 @{Spot:echigo-d6bown} 13:30 1時間半 ¥1,000"),
      l("チェックイン 16:30"),
      l("@{Spot:echigo-7jh2g4}", { indent: 1 }),
      l("夕食 18:30 ¥3,200"),
      l("宿の山菜のやつ", { indent: 1 }),
      l(""),
      l("10/12", { heading: 1 }),
      l("松之山温泉 鷹の湯 @{Spot:echigo-yk4uzx} 9:30 1時間", { marks: ["strong"] }),
      l("苗場酒造 見学 @{Spot:echigo-1a5n0wy} 12:30 1時間"),
      l("試飲できるか要確認", { indent: 1 }),
      l("十日町→東京 15:40 ¥6,790"),
      l(""),
      l("やること", { heading: 1 }),
      l("宿を予約する", { marks: ["todo"] }),
      l("新幹線の切符を買う 1.5万くらい", { marks: ["done"] }),
      l("2名 田中さんと"),
      l("レンタカーいるか調べる", { marks: ["todo"] }),
    ],
  };
};

export function useSeedNote(): void {
  const dispatch = useAppDispatch();
  const notes = useAppSelector(selectNotes);
  useEffect(() => {
    if (notes.length === 0) dispatch(setNoteList([sampleNote()]));
  }, [dispatch, notes.length]);
}
