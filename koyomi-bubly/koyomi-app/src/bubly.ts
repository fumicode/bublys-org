/**
 * **このバブリの定義** ── 名前・見せ方・大元の url から何を開くかを書く 1 か所。
 *
 * OS からは `{origin}/bubly.js` として読み込まれ、`registerBubly` で登録される。
 * 暦バブリは「日付について暦が言えること」を受け持つ。いまは六曜だけ（#235）。
 */
import React from "react";
import { registerBubly, Bubly } from "@bublys-org/bubbles-ui";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

import { koyomiBubbleRoutes } from "@bublys-org/koyomi-libs";

const KoyomiBubly: Bubly = {
  name: "koyomi",
  version: "0.0.1",
  label: "暦",
  icon: React.createElement(CalendarMonthIcon, { color: "action" }),
  initialBubbleUrls: ["koyomi/calendar"],
  backdropColor: "hsl(30, 30%, 20%)",

  register(context) {
    context.registerBubbleRoutes(koyomiBubbleRoutes);
  },
};

registerBubly(KoyomiBubly);

export default KoyomiBubly;
