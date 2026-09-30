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
    title: "箱根 行きたいところメモ",
    lines: [
      l("5/17", { heading: 1 }),
      l("新宿→箱根湯本 ロマンスカー 8:30 ¥2,480"),
      l("箱根湯本 散策 1時間"),
      l("昼食", { marks: ["strong"] }),
      l("温泉街のそば屋 1500〜2000円 要予約", { indent: 1 }),
      l("@{Spot:motohakone} から遊覧船 13:30 1時間半 ¥1,500"),
      l("チェックイン 夕方"),
      l("@{Spot:lakeside-hotel}", { indent: 1 }),
      l(""),
      l("5/18", { heading: 1 }),
      l("@{Spot:hakone-jinja} 9:30 参拝 1時間", { marks: ["strong"] }),
      l("カフェ か 甘味処"),
      l("大涌谷 気になる 2〜3時間"),
      l("ロープウェイ 混みそう", { marks: ["strike"] }),
      l("箱根湯本→新宿 13:30"),
      l(""),
      l("やること", { heading: 2 }),
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
