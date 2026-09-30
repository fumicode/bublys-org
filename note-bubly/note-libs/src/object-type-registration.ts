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
import type { NoteState } from "./slice/note-slice.js";

registerObjectType("Note", React.createElement(StickyNote2Icon, { fontSize: "small" }));
registerObjectUrl("Note", (id) => `notes/${id}`);
registerObjectBubble("Note", { openingPosition: "bubble-side-right" });
registerObjectIdentity("Note", {
  class: Note_メモ,
  getId: (obj) => (obj as Note_メモ).id,
});

registerObjectResolver("Note", (id, state) =>
  (state as { note?: NoteState }).note?.noteList?.find((n) => n.id === id),
);

registerSchema("Note", NOTE_SHAPE);
