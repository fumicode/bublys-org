/**
 * Bublys Bubly Entry Point for object-transformer
 */

import React from "react";
import { registerBubly, Bubly } from "@bublys-org/bubbles-ui";
import TransformIcon from "@mui/icons-material/Transform";

// ライブラリインポート（Redux slice注入の副作用を含む）
import "@bublys-org/object-transformer-libs";

// Bubble Routes
import { objectTransformerBubbleRoutes } from "./registration/index.js";

const ObjectTransformerBubly: Bubly = {
  name: "object-transformer",
  version: "0.0.1",
  label: "変換エディタ",
  icon: React.createElement(TransformIcon, { color: "primary" }),
  initialBubbleUrls: ["object-transformer/editor"],
  backdropColor: "hsl(270, 30%, 22%)",

  register(context) {
    context.registerBubbleRoutes(objectTransformerBubbleRoutes);
  },

  unregister() {
    // cleanup if needed
  },
};

// 公式APIを使って登録
registerBubly(ObjectTransformerBubly);

export default ObjectTransformerBubly;
