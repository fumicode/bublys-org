/**
 * **このバブリの定義** ── 名前・見せ方・大元の url から何を開くかを書く 1 か所。
 */
import React from "react";
import { registerBubly, Bubly } from "@bublys-org/bubbles-ui";
import HotelIcon from "@mui/icons-material/Hotel";

import { lodgingBubbleRoutes } from "@bublys-org/lodging-libs";

const LodgingBubly: Bubly = {
  name: "lodging",
  version: "0.0.1",
  label: "宿泊",
  icon: React.createElement(HotelIcon, { color: "action" }),
  initialBubbleUrls: ["lodgings"],
  backdropColor: "hsl(265, 35%, 22%)",

  register(context) {
    context.registerBubbleRoutes(lodgingBubbleRoutes);
  },
};

registerBubly(LodgingBubly);

export default LodgingBubly;
