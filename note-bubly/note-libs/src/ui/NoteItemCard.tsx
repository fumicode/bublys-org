'use client';
/**
 * **付箋** ── メモから読み解けたのに、旅程に入らなかった 1 件。
 *
 * > 読めなかったものを捨てない。**隣に置いておく。**
 *
 * ★ 「なぜ入らなかったか」を必ず出す。書いた人にとっていちばん困るのは
 *   「読めなかったので黙って捨てました」なので、**入らなかったことが見えて、
 *   何を足せば入るかが分かる**ようにする。
 * ★ 掴める。足りない所（日付など）をメモで書き足してから、あらためて落としてもよいし、
 *   この付箋をそのまま旅程へ落としてもよい（そのときは**いま見ている日**に入る）。
 */
import { ComponentPropsWithoutRef, FC } from "react";
import styled from "styled-components";
import { ObjectView } from "@bublys-org/bubbles-ui";
import type { NoteItemPlain } from "../domain/read/NoteItemPlain.js";

export type NoteItemCardProps = {
  item: NoteItemPlain;
  /** 場所の名前（持ち主に訊いたもの） */
  placeName?: string;
};

/**
 * なぜ旅程に入っていないか。**理由は 1 つだけ出す**（並べても読まれない）。
 *
 * ★ **知らないことは言わない。** 付箋は旅程を知らないので、日付が書いてあるのに
 *   入っていない理由までは言えない ── 前は「この旅程に合う日が無い」と言っていたが、
 *   旅程から**外しただけ**のものにもそう出ていた（実測）。言えるのは
 *   「まだ入れていない」まで。
 */
const reasonOf = (item: NoteItemPlain): string => {
  if (item.kind === "task") return "やること（予定ではない）";
  if (item.alternatives.length >= 2) return `どちらか決まっていない（${item.alternatives.join(" か ")}）`;
  if (!item.date) return "いつの話か書かれていない";
  return "まだ旅程に入れていない";
};

export const NoteItemCard: FC<NoteItemCardProps> = ({ item, placeName }) => (
  <StyledSticky data-kind={item.kind}>
    <ObjectView type="NoteItem" id={item.id} url={item.url} label={item.title} draggable fullWidth>
      <span className="e-body">
        <span className="e-title">{item.title || placeName || "（名前なし）"}</span>
        <span className="e-reason">{reasonOf(item)}</span>
        {(placeName || item.durationRaw || item.costRaw || item.booking) && (
          <span className="e-found">
            {placeName && <span className="e-chip">{placeName}</span>}
            {item.durationRaw && <span className="e-chip">{item.durationRaw}</span>}
            {item.costRaw && <span className="e-chip">{item.costRaw}</span>}
            {item.booking && <span className="e-chip">要予約</span>}
          </span>
        )}
      </span>
    </ObjectView>
  </StyledSticky>
);

const StyledSticky = styled.div<ComponentPropsWithoutRef<'div'>>`
  height: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  /* 付箋らしく。旅程の白い板と見分けが付く色にする */
  background: #fff6d6;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
  font: 12px/1.5 -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif;
  color: #3a3222;
  overflow: hidden;

  /* やることは別の色 ── 予定と並べたときに種類が違うと判る */
  &[data-kind='task'] { background: #e6f2ff; color: #22384f; }

  .e-body { display: flex; flex-direction: column; gap: 2px; width: 100%; min-width: 0; }
  .e-title { font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .e-reason { font-size: 0.85em; opacity: 0.7; }
  .e-found { display: flex; gap: 3px; flex-wrap: wrap; margin-top: 2px; }
  .e-chip {
    font-size: 0.8em;
    padding: 0 5px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.07);
    white-space: nowrap;
  }
`;
