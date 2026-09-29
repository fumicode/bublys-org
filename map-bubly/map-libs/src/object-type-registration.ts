/**
 * map バブリが自分で名乗る ── 型（アイコン）と、その中身の形（スキーマ）と、
 * 「掴んで運ぶときの型」「どこに開くか」。
 *
 * ★ **`registerObjectUrl` を名乗るのが要**。これがあると、ほかのバブリは
 *   `<ObjectView object={spot}>` と書くだけで「開く先は `spots/<id>`」に辿り着ける
 *   ── 行き先を使う側が手書きすると、url を変えたときに追随できない所が残る。
 */
import {
  registerObjectType,
  registerObjectBubble,
  registerObjectUrl,
  registerObjectIdentity,
} from "@bublys-org/bubbles-ui";
import { registerSchema } from "@bublys-org/domain-registry/schema";
import PlaceIcon from "@mui/icons-material/Place";
import React from "react";
import { SPOT_SHAPE, Spot_地点 } from "./domain/Spot.domain.js";

registerObjectType("Spot", React.createElement(PlaceIcon, { fontSize: "small" }));
registerObjectUrl("Spot", (id) => `spots/${id}`);
registerObjectBubble("Spot", { openingPosition: "bubble-side-right" });
/** 見分け方 ── これがあると `<ObjectView object={spot}>` だけで型と ID が解ける */
registerObjectIdentity("Spot", {
  class: Spot_地点,
  getId: (obj) => (obj as Spot_地点).id,
});

registerSchema("Spot", SPOT_SHAPE);
