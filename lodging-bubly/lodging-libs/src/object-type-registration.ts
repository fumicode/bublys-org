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
import SearchIcon from "@mui/icons-material/Search";
import React from "react";
import { LODGING_SHAPE, Lodging_宿 } from "./domain/Lodging.domain.js";
import { selectLodgingPlainById, selectLodgingPlains } from "./slice/lodging-slice.js";
import {
  FOUND_LODGINGS_SHAPE,
  FOUND_LODGINGS_TYPE,
  decodeLodgingQuery,
  foundLodgingsPlain,
  foundLodgingsUrl,
} from "./domain/foundLodgings.js";
import { searchLodgings } from "./domain/lodgingSearch.js";

registerObjectType("Lodging", React.createElement(HotelIcon, { fontSize: "small" }));
registerObjectUrl("Lodging", (id) => `lodgings/${id}`);
registerObjectBubble("Lodging", { openingPosition: "bubble-side-right" });
registerObjectIdentity("Lodging", {
  class: Lodging_宿,
  getId: (obj) => (obj as Lodging_宿).id,
});

registerObjectResolver("Lodging", (id, state) =>
  selectLodgingPlainById(state as Parameters<typeof selectLodgingPlainById>[0], id),
);

registerSchema("Lodging", LODGING_SHAPE);

/**
 * **探した結果そのもの**も名乗る ── 掴んで地図へ落とせるように。
 *
 * ★ 中身は訊かれたときに数え直す（荷物に詰めて運ばない）。
 * ★ 出すのは当たったものぜんぶ。並びに出ている 40 軒ではない。
 */
registerObjectType(FOUND_LODGINGS_TYPE, React.createElement(SearchIcon, { fontSize: "small" }));
registerObjectUrl(FOUND_LODGINGS_TYPE, foundLodgingsUrl);
registerObjectBubble(FOUND_LODGINGS_TYPE, { openingPosition: "bubble-side-right" });

registerObjectResolver(FOUND_LODGINGS_TYPE, (id, state) => {
  const query = decodeLodgingQuery(id);
  if (!query) return undefined;
  const all = selectLodgingPlains(state as Parameters<typeof selectLodgingPlains>[0]);
  const found = searchLodgings(all, query, Number.MAX_SAFE_INTEGER);
  return foundLodgingsPlain(id, query, found.matches);
});

registerSchema(FOUND_LODGINGS_TYPE, FOUND_LODGINGS_SHAPE);
