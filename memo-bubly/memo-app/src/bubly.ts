/**
 * **このバブリの定義** ── 名前・見せ方・**大元の url から何を開くか**を書く 1 か所。
 *
 * ここはスタンドアロンの束（`vite.config.bubly.ts`）の入口でもある。OS からは
 * `{origin}/bubly.js` として読み込まれ、`registerBubly` で登録される。
 *
 * ★ `initialBubbleUrls` が「`memo-bubly` を開いたら何が開くか」。
 *   OS のランチャーはこの大元の url だけを持ち、実際に開く泡はここから引く。
 */
import React from "react";
import { registerBubly, Bubly } from "@bublys-org/bubbles-ui";
import NoteIcon from "@mui/icons-material/Note";

import { memoBubbleRoutes } from "@bublys-org/memo-libs";

const MemoBubly: Bubly = {
  name: "memo",
  version: "0.0.1",
  label: "メモ",
  icon: React.createElement(NoteIcon, { color: "action" }),
  initialBubbleUrls: ["memos"],
  backdropColor: "hsl(40, 55%, 26%)",

  register(context) {
    context.registerBubbleRoutes(memoBubbleRoutes);
  },
};

registerBubly(MemoBubly);

export default MemoBubly;
