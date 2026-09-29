/**
 * itinerary バブリが自分で名乗る ── 型（アイコン）・形（スキーマ）・開く先・見分け方。
 */
import {
  registerObjectType,
  registerObjectBubble,
  registerObjectUrl,
  registerObjectIdentity,
} from "@bublys-org/bubbles-ui";
import { registerSchema } from "@bublys-org/domain-registry/schema";
import EventNoteIcon from "@mui/icons-material/EventNote";
import React from "react";
import { ITINERARY_SHAPE, Itinerary_旅程 } from "./domain/Itinerary.domain.js";

registerObjectType("Itinerary", React.createElement(EventNoteIcon, { fontSize: "small" }));
registerObjectUrl("Itinerary", (id) => `itineraries/${id}`);
registerObjectBubble("Itinerary", { openingPosition: "bubble-side-right" });
registerObjectIdentity("Itinerary", {
  class: Itinerary_旅程,
  getId: (obj) => (obj as Itinerary_旅程).id,
});

registerSchema("Itinerary", ITINERARY_SHAPE);
