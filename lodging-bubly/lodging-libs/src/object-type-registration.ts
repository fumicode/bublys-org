/**
 * 宿泊バブリが自分で名乗る ── 型（アイコン）・形（スキーマ）・開く先・中身の訊かれ方。
 *
 * ★ これを名乗っておけば、地図は宿を知らないまま地図に出せるし、
 *   旅程は「題名を名乗るもの」として受け取れる。どちらもこの部品を import しない。
 */
import {
  registerObjectType,
  registerObjectBubble,
  registerObjectUrl,
  registerObjectIdentity,
  registerObjectResolver,
} from "@bublys-org/bubbles-ui";
import { registerSchema } from "@bublys-org/domain-registry/schema";
import HotelIcon from "@mui/icons-material/Hotel";
import React from "react";
import { LODGING_SHAPE, Lodging_宿 } from "./domain/Lodging.domain.js";
import type { LodgingState } from "./slice/lodging-slice.js";

registerObjectType("Lodging", React.createElement(HotelIcon, { fontSize: "small" }));
registerObjectUrl("Lodging", (id) => `lodgings/${id}`);
registerObjectBubble("Lodging", { openingPosition: "bubble-side-right" });
registerObjectIdentity("Lodging", {
  class: Lodging_宿,
  getId: (obj) => (obj as Lodging_宿).id,
});

registerObjectResolver("Lodging", (id, state) =>
  (state as { lodging?: LodgingState }).lodging?.lodgingList?.find((l) => l.id === id),
);

registerSchema("Lodging", LODGING_SHAPE);
