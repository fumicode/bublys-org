'use client';
/**
 * 見本のメモ ── **人が実際に書くとおりに**書いてある。
 *
 * ★ きれいに整った例にしない。日付の見出し、思いつきの箇条書き、字下げした補足、
 *   やめたので消した行、決まっていない「〜か〜」── **散らかったまま読める**ことが
 *   このバブリの言い分なので、見本も散らかっていないと嘘になる。
 */
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import type { NotePlain } from "../domain/Note.domain.js";
import { selectNotes, setNoteList } from "../slice/note-slice.js";

export const SAMPLE_NOTE_ID = "hakone-note";

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
    title: "箱根 旅行メモ",
    lines: [
      /**
       * ★ **日付の無い見出し。** ここに書いたものは「いつの話か」が決まっていないので、
       *   旅程には入らない ── 渡すと付箋になって盤に残る。
       */
      l("行きたいところ", { heading: 1 }),
      l("ポーラ美術館 気になる 2時間 ¥1,800"),
      l("黒たまご 食べたい", { marks: ["strong"] }),
      l("芦ノ湖テラス か 成川美術館"),
      l("大涌谷 気になる 2〜3時間"),
      l("湖尻の方も見たい"),
      l("ロープウェイ 混みそう", { marks: ["strike"] }),
      l(""),
      /** 日付の見出し。ここに書いたものは、その日の予定として旅程に入る */
      l("5/17", { heading: 1 }),
      l("新宿→箱根湯本 ロマンスカー 8:30 ¥2,480"),
      l("箱根湯本 散策 10:20 1時間"),
      l("昼食 11:30", { marks: ["strong"] }),
      l("温泉街のそば屋 1500〜2000円 要予約", { indent: 1 }),
      l("芦ノ湖遊覧船 @{Spot:motohakone} 13:30 1時間半 ¥1,500"),
      l("チェックイン 16:30"),
      l("@{Spot:lakeside-hotel}", { indent: 1 }),
      l("夕食 18:30 ¥2,600"),
      l("@{Spot:lakeside-cafe}", { indent: 1 }),
      l(""),
      l("5/18", { heading: 1 }),
      l("箱根神社 参拝 @{Spot:hakone-jinja} 9:30 1時間", { marks: ["strong"] }),
      l("強羅で昼食 @{Spot:gora} 12:30 1時間"),
      l("1500〜2000円", { indent: 1 }),
      l("箱根湯本→新宿 15:00 ¥2,480"),
      l(""),
      l("やること", { heading: 1 }),
      l("宿を予約する", { marks: ["todo"] }),
      l("ロマンスカーの切符を買う 1.5万くらい", { marks: ["done"] }),
      l("2名 田中さんと"),
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
