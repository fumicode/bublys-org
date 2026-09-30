/**
 * **このバブリの定義** ── 名前・見せ方・大元の url から何を開くかを書く 1 か所。
 *
 * OS からは `{origin}/bubly.js` として読み込まれ、`registerBubly` で登録される。
 */
import React from "react";
import { registerBubly, Bubly } from "@bublys-org/bubbles-ui";
import PlaceIcon from "@mui/icons-material/Place";

import { mapBubbleRoutes } from "@bublys-org/map-libs";

const MapBubly: Bubly = {
  name: "map",
  version: "0.0.1",
  label: "スポット",
  icon: React.createElement(PlaceIcon, { color: "action" }),
  initialBubbleUrls: ["spots"],
  backdropColor: "hsl(150, 40%, 20%)",

  register(context) {
    context.registerBubbleRoutes(mapBubbleRoutes);
  },
};

registerBubly(MapBubly);

export default MapBubly;
