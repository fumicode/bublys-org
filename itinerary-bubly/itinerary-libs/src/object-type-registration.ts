/**
 * itinerary バブリが自分で名乗る ── 型（アイコン）・形（スキーマ）・開く先・見分け方。
 */
import {
  registerObjectType,
  registerObjectBubble,
  registerObjectUrl,
  registerObjectIdentity,
  registerObjectResolver,
} from "@bublys-org/bubbles-ui";
import { registerSchema } from "@bublys-org/domain-registry/schema";
import EventNoteIcon from "@mui/icons-material/EventNote";
import React from "react";
import { ITINERARY_SHAPE, Itinerary_旅程 } from "./domain/Itinerary.domain.js";
import { ITINERARY_ITEM_SHAPE } from "./domain/ItineraryItem.domain.js";
import type { ItineraryState } from "./slice/itinerary-slice.js";

registerObjectType("Itinerary", React.createElement(EventNoteIcon, { fontSize: "small" }));
registerObjectUrl("Itinerary", (id) => `itineraries/${id}`);
registerObjectBubble("Itinerary", { openingPosition: "bubble-side-right" });
registerObjectIdentity("Itinerary", {
  class: Itinerary_旅程,
  getId: (obj) => (obj as Itinerary_旅程).id,
});

/**
 * 中身を訊かれたら答える。
 *
 * ★ これがあると、**旅程を掴んで地図に落とせる**ようになる ── 地図は旅程を
 *   知らないまま、中を歩いて立ち寄り先を書いてある順に拾い、繋いで道にする。
 */
registerObjectResolver("Itinerary", (id, state) =>
  (state as { itinerary?: ItineraryState }).itinerary?.itineraryList?.find((t) => t.id === id),
);

registerSchema("Itinerary", ITINERARY_SHAPE);

/**
 * **予定 1 件**も、それだけで 1 つのもの。
 *
 * ★ 一覧の中の札と、開いて直す詳細 ── どちらも泡なので、url と中身を訊く口が要る。
 *   表の行のままだと、掴むことも、隣に開くことも、指すこともできなかった。
 */
registerObjectType("ItineraryItem", React.createElement(EventNoteIcon, { fontSize: "small" }));
registerObjectUrl("ItineraryItem", (id) => `itinerary-items/${id}`);
registerObjectBubble("ItineraryItem", { openingPosition: "bubble-side-right" });
registerSchema("ItineraryItem", ITINERARY_ITEM_SHAPE);

registerObjectResolver("ItineraryItem", (itemId, state) => {
  for (const plain of (state as { itinerary?: ItineraryState }).itinerary?.itineraryList ?? []) {
    const found = plain.days.flatMap((d) => d.items).find((i) => i.id === itemId);
    if (found) return found;
  }
  return undefined;
});
