/**
 * **このバブリの定義** ── 名前・見せ方・大元の url から何を開くかを書く 1 か所。
 */
import React from "react";
import { registerBubly, Bubly } from "@bublys-org/bubbles-ui";
import TransformIcon from "@mui/icons-material/Transform";

import { hengeBubbleRoutes } from "@bublys-org/henge-libs";

/** 脇の帯に出す入口。単体でも OS の中でも同じ 1 つを使う */
export const menuItems = [
  { label: "化", url: "henge/games", icon: React.createElement(TransformIcon) },
];

const HengeBubly: Bubly = {
  name: "henge",
  version: "0.0.1",
  label: "化",
  icon: React.createElement(TransformIcon, { color: "action" }),
  initialBubbleUrls: ["henge/games"],
  backdropColor: "hsl(24, 18%, 14%)",

  register(context) {
    context.registerBubbleRoutes(hengeBubbleRoutes);
  },
};

registerBubly(HengeBubly);

export default HengeBubly;
