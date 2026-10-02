"use client";
/** このメモバブリで何が開けるか */
import { useMemo } from "react";
import type { BubbleRoute } from "@bublys-org/bubbles-ui";
import { ObjectView } from "@bublys-org/bubbles-ui";
import { LIST_BOX, LIST_CARD_WIDTH, ListSpace } from "@bublys-org/bubble-layout-feature";
import { useAppSelector } from "@bublys-org/state-management";
import { NoteDetail } from "../feature/NoteDetail.js";
import { selectNotes } from "../slice/note-slice.js";
import { useSeedNote } from "../feature/useSeedNote.js";
import { readNote } from "../domain/read/readNote.js";
import { NoteItemBubble } from "../feature/NoteItemBubble.js";

const CARD = { w: LIST_CARD_WIDTH, h: 46 };

/** メモの一覧 */
const NoteCollectionBubble: BubbleRoute["Component"] = () => {
  useSeedNote();
  const notes = useAppSelector(selectNotes);
  const members = useMemo(() => notes.map((n) => `notes/${n.id}/card`), [notes]);
  return <ListSpace members={members} itemWidth={CARD.w} itemHeight={CARD.h} />;
};

/** メモ 1 件の札。何件読み解けたかを出す ── 渡す前に「これだけ拾えている」が判る */
const NoteCardBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const id = bubble.url.replace(/^notes\//, "").replace(/\/card$/, "");
  const note = useAppSelector(selectNotes).find((n) => n.id === id);
  if (!note) return <div style={{ padding: 8, color: "#666" }}>このメモは見つかりませんでした。</div>;
  const items = readNote(note);
  const plans = items.filter((i) => i.kind === "plan").length;
  const tasks = items.filter((i) => i.kind === "task").length;
  return (
    <div style={{ display: "flex", alignItems: "center", height: "100%", padding: "6px 10px", boxSizing: "border-box", font: "13px/1.5 -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif" }}>
      <ObjectView type="Note" url={`notes/${note.id}`} label={note.title} openingPosition="bubble-side-right" draggable fullWidth>
        <span style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", minWidth: 0 }}>
          <span style={{ flex: 1, minWidth: 0, fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {note.title}
          </span>
          <span style={{ flexShrink: 0, color: "#3d6ea8", fontSize: "0.8em" }}>
            予定 {plans}・やること {tasks}
          </span>
        </span>
      </ObjectView>
    </div>
  );
};

/** メモの詳細。呼び出しから直に開かれるので、ここでも種を撒く */
const NoteDetailBubble = ({ url }: { url: string }) => {
  useSeedNote();
  return <NoteDetail noteId={url.replace(/^notes\//, "")} />;
};

/** 付箋 1 枚の大きさ。**理由の 1 行まで読める**丈（中身の数） */
const STICKY = { width: 200, height: 68 };

export const noteBubbleRoutes: BubbleRoute[] = [
  /**
   * 付箋 ── 旅程に入らなかった 1 件。
   * ★ 詳細より**先に**置く（`notes/:id` に食われないよう、url の頭から別にしてある）
   */
  {
    pattern: /^note-items\/[^/]+$/,
    type: "note-item",
    Component: ({ bubble }) => <NoteItemBubble lineId={bubble.url.replace(/^note-items\//, "")} />,
    // 地は中身が持つ（付箋の色）
    bubbleOptions: { defaultSize: STICKY, contentBackground: "transparent" },
  },
  {
    pattern: /^notes$/,
    type: "notes",
    Component: NoteCollectionBubble,
    bubbleOptions: { defaultSize: LIST_BOX, contentBackground: "transparent" },
  },
  // ★ 札は詳細より**先に**置く（`notes/:id` が `.../card` も飲み込むので）
  {
    pattern: /^notes\/[^/]+\/card$/,
    type: "note-card",
    Component: NoteCardBubble,
    bubbleOptions: { defaultSize: { width: CARD.w, height: CARD.h } },
  },
  {
    pattern: /^notes\/[^/]+$/,
    type: "note",
    /** ★ 撒くのはここでもやる ── 呼び出しから**直に開く入口**なので（旅程と同じ） */
    Component: ({ bubble }) => <NoteDetailBubble url={bubble.url} />,
    /**
     * ★ **書く所なので、広めに名乗る。** 狭いと 1 行が折り返して、
     *   字下げも見出しも読み取れなくなる ── 構造が見えないメモは、ただの文字列になる。
     */
    bubbleOptions: { defaultSize: { width: 440, height: 460 } },
  },
];
