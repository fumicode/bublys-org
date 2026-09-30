/**
 * note バブリが自分で名乗る ── 型（アイコン）・形（スキーマ）・開く先・中身の訊かれ方。
 */
import {
  registerObjectType,
  registerObjectBubble,
  registerObjectUrl,
  registerObjectIdentity,
  registerObjectResolver,
} from "@bublys-org/bubbles-ui";
import { registerSchema } from "@bublys-org/domain-registry/schema";
import StickyNote2Icon from "@mui/icons-material/StickyNote2";
import React from "react";
import { NOTE_SHAPE, Note_メモ } from "./domain/Note.domain.js";
import { NOTE_ITEM_SHAPE, noteItemUrl, toNoteItemPlain } from "./domain/read/NoteItemPlain.js";
import { readNote } from "./domain/read/readNote.js";
import type { NoteState } from "./slice/note-slice.js";

registerObjectType("Note", React.createElement(StickyNote2Icon, { fontSize: "small" }));
registerObjectUrl("Note", (id) => `notes/${id}`);
registerObjectBubble("Note", { openingPosition: "bubble-side-right" });
registerObjectIdentity("Note", {
  class: Note_メモ,
  getId: (obj) => (obj as Note_メモ).id,
});

/**
 * **中身を訊かれたら、読み解いた結果も一緒に返す。**
 *
 * ★ これが「メモを旅程に渡す」の要。渡す側は役を名乗るだけで、受け取る側は
 *   `collectByRole(…, "title")` で拾うだけ ── どちらも相手を知らない。
 * ★ **毎回読み解く**（溜めない）。書き換えたのに古い読みが渡る、を避ける。
 */
registerObjectResolver("Note", (id, state) => {
  const plain = (state as { note?: NoteState }).note?.noteList?.find((n) => n.id === id);
  if (!plain) return undefined;
  return { ...plain, items: readNote(Note_メモ.fromPlain(plain)).map(toNoteItemPlain) };
});

registerSchema("Note", NOTE_SHAPE);

/**
 * **読み解いた 1 件**も、それだけで 1 つのものとして扱える。
 *
 * ★ 旅程に入らなかったものを**付箋の泡として隣に置く**ために要る
 *   ── 置くには、開ける先（url）と、中身を訊く口が要る。
 * ★ 行の id はメモをまたいで重ならないので、id 1 つで引ける。
 */
registerObjectType("NoteItem", React.createElement(StickyNote2Icon, { fontSize: "small" }));
registerObjectUrl("NoteItem", noteItemUrl);
registerObjectBubble("NoteItem", { openingPosition: "bubble-side-right" });
registerSchema("NoteItem", NOTE_ITEM_SHAPE);

registerObjectResolver("NoteItem", (lineId, state) => {
  for (const plain of (state as { note?: NoteState }).note?.noteList ?? []) {
    if (!plain.lines?.some((l) => l.id === lineId)) continue;
    const item = readNote(Note_メモ.fromPlain(plain)).find((i) => i.lineId === lineId);
    if (item) return toNoteItemPlain(item);
  }
  return undefined;
});
